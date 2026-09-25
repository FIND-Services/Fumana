-- Fumana initial schema (canonical: docs/canonical_schema.md)
--
-- Operational data lives here as documents: entities carry their structured
-- payloads in jsonb columns, with indexed scalar columns for the fields the app
-- filters or joins on. The CCM reasoning graph is projected from this later.
--
-- The bias shield is enforced by the database, not the UI:
--   * name/city are PII and are never exposed through builders_public
--   * role/summary are reveal-level: employers see them only after committing
--     to an interview (match status interviewing or sow), via RLS on builders
--   * everyone else sees only the masked view: handle, skills, scores

-- ---------------------------------------------------------------- tables

create table public.builders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references auth.users (id) on delete set null,
  masked_handle    text not null unique,
  name             text,                       -- PII: masked until interview
  city             text,                       -- PII: masked until interview
  country          text,
  role             text not null default '',
  summary          text,                       -- reveal-level
  tier             jsonb,                      -- { name, color }
  profile_strength int,                        -- Computed
  skills           jsonb not null default '[]',
  dimensions       jsonb not null default '[]',
  outcomes         jsonb not null default '[]',-- Experience Alchemist output
  integrity_note   text,
  is_premium       boolean not null default false,
  premium_since    date,
  created_at       timestamptz not null default now()
);

create table public.employers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid unique references auth.users (id) on delete set null,
  name        text not null default '',
  domain      text,
  industry    text,
  size        text,
  country     text,
  hiring_for  text,
  created_at  timestamptz not null default now()
);

create table public.roles (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid references public.employers (id) on delete cascade,
  title           text,
  need            text,
  required_skills jsonb not null default '[]',
  timezone        text,
  base_salary_usd int,
  esg_quota       text,
  created_at      timestamptz not null default now()
);

-- Match links a Builder to an Employer. `status` is the pipeline stage the
-- app's kanban reads: shortlisted -> interviewing -> sow.
create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  builder_id  uuid not null references public.builders (id) on delete cascade,
  employer_id uuid not null references public.employers (id) on delete cascade,
  role_id     uuid references public.roles (id) on delete set null,
  status      text not null default 'shortlisted'
              check (status in ('shortlisted', 'interviewing', 'sow')),
  fit         int,           -- Computed search fit, 0-99
  monthly_usd int,           -- budget stamped at shortlist/interview time
  created_at  timestamptz not null default now(),
  unique (builder_id, employer_id)
);

create table public.jurisdictions (
  id             uuid primary key default gen_random_uuid(),
  country        text not null,
  currency_code  text not null,
  statutory_notes text      -- general references, no hardcoded rates
);

create table public.engagements (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null unique references public.matches (id) on delete cascade,
  jurisdiction_id uuid references public.jurisdictions (id) on delete set null,
  monthly_usd    int,
  sow            jsonb,      -- generated SOW draft {title, scope, deliverables, ip_clause, eor_note, term}
  status         text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at     timestamptz not null default now()
);

create table public.fx_rates (
  base_pair    text primary key,
  rate         numeric not null,
  as_of        timestamptz not null default now(),
  illustrative boolean not null default true
);

create table public.sroi_entries (
  id             uuid primary key default gen_random_uuid(),
  engagement_id  uuid not null references public.engagements (id) on delete cascade,
  gross_usd      numeric not null,
  fx_rate        numeric not null,
  gross_local    numeric not null,   -- Computed: gross_usd * fx_rate
  retention_pct  numeric not null,   -- assumption, stored explicitly
  retained_local numeric not null,   -- Computed: gross_local * retention_pct
  sdg_tags       jsonb not null default '[]',
  computed_at    timestamptz not null default now()
);

create table public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references auth.users (id) on delete set null,
  agent       text not null,   -- alchemist, zuri, sow, rederivation, ...
  input_ref   text,
  output_json jsonb,
  model       text,
  created_at  timestamptz not null default now()
);

-- Candidate-facing decision audit trail (Phase 4 transparency backbone).
create table public.audit_events (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users (id) on delete cascade,
  kind       text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Fumana Squads (community feature; beyond the canonical demo schema).
create table public.squads (
  id         text primary key,
  name       text not null,
  focus      text,
  pitch      text,
  members    int not null default 0,  -- displayed count; seeded bases exist beyond squad_members rows
  created_at timestamptz not null default now()
);

create table public.squad_members (
  squad_id   text not null references public.squads (id) on delete cascade,
  builder_id uuid not null references public.builders (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (squad_id, builder_id)
);

create index matches_employer_idx on public.matches (employer_id, status);
create index matches_builder_idx on public.matches (builder_id);
create index audit_events_owner_idx on public.audit_events (owner_id, created_at desc);
create index agent_runs_creator_idx on public.agent_runs (created_by, created_at desc);

-- ------------------------------------------------- the bias-shielded view
-- Deliberately a definer view (Postgres default): it is the public face of the
-- builder network for employers. It exposes ONLY masked fields, so anon and
-- authenticated readers can browse the network while PII and reveal-level
-- fields stay behind the builders table's RLS.
create view public.builders_public
with (security_invoker = false) as
select id, masked_handle, skills, profile_strength, tier, created_at
from public.builders;

-- ------------------------------------------------------------------- RLS

alter table public.builders       enable row level security;
alter table public.employers      enable row level security;
alter table public.roles          enable row level security;
alter table public.matches        enable row level security;
alter table public.engagements    enable row level security;
alter table public.jurisdictions  enable row level security;
alter table public.fx_rates       enable row level security;
alter table public.sroi_entries   enable row level security;
alter table public.agent_runs     enable row level security;
alter table public.audit_events   enable row level security;
alter table public.squads         enable row level security;
alter table public.squad_members  enable row level security;

-- builders: the owner manages their own record; an employer sees the full
-- (reveal-level) row only once a match with them is at interviewing or sow.
create policy builders_owner on public.builders
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy builders_revealed on public.builders
  for select using (
    exists (
      select 1 from public.matches m
      join public.employers e on e.id = m.employer_id
      where m.builder_id = builders.id
        and m.status in ('interviewing', 'sow')
        and e.owner_id = auth.uid()
    )
  );

create policy employers_owner on public.employers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy roles_employer on public.roles
  for all using (
    exists (select 1 from public.employers e
            where e.id = roles.employer_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.employers e
            where e.id = roles.employer_id and e.owner_id = auth.uid())
  );

-- "Is this builder mine?" as a SECURITY DEFINER predicate. Required because
-- policies on builders reference matches (builders_revealed) and policies on
-- matches reference builders: a plain EXISTS would recurse forever. The
-- definer read bypasses builders RLS and breaks the cycle. It leaks only a
-- boolean about the caller's own ownership, so staying in public is safe.
create or replace function public.owns_builder(p_builder uuid)
returns boolean language sql security definer stable set search_path = '' as
$$ select exists (select 1 from public.builders b where b.id = p_builder and b.owner_id = auth.uid()) $$;

-- matches: the employer manages their pipeline; the builder sees engagements
-- about themselves (this is what powers the candidate Applications hub).
create policy matches_employer on public.matches
  for all using (
    exists (select 1 from public.employers e
            where e.id = matches.employer_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.employers e
            where e.id = matches.employer_id and e.owner_id = auth.uid())
  );
create policy matches_builder_read on public.matches
  for select using (public.owns_builder(matches.builder_id));

create policy engagements_employer on public.engagements
  for all using (
    exists (select 1 from public.matches m
            join public.employers e on e.id = m.employer_id
            where m.id = engagements.match_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.matches m
            join public.employers e on e.id = m.employer_id
            where m.id = engagements.match_id and e.owner_id = auth.uid())
  );
create policy engagements_builder_read on public.engagements
  for select using (
    exists (select 1 from public.matches m
            join public.builders b on b.id = m.builder_id
            where m.id = engagements.match_id and b.owner_id = auth.uid())
  );

create policy jurisdictions_read on public.jurisdictions for select using (true);
create policy fx_rates_read on public.fx_rates for select using (true);

create policy sroi_employer on public.sroi_entries
  for all using (
    exists (select 1 from public.engagements g
            join public.matches m on m.id = g.match_id
            join public.employers e on e.id = m.employer_id
            where g.id = sroi_entries.engagement_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.engagements g
            join public.matches m on m.id = g.match_id
            join public.employers e on e.id = m.employer_id
            where g.id = sroi_entries.engagement_id and e.owner_id = auth.uid())
  );

create policy agent_runs_owner on public.agent_runs
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy audit_owner on public.audit_events
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy squads_read on public.squads for select using (true);
create policy squads_create on public.squads
  for insert to authenticated with check (true);

create policy squad_members_read on public.squad_members for select using (true);
create policy squad_members_own on public.squad_members
  for all using (
    exists (select 1 from public.builders b
            where b.id = squad_members.builder_id and b.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.builders b
            where b.id = squad_members.builder_id and b.owner_id = auth.uid())
  );

-- ------------------------------------------------------------------ seeds
-- The four seeded network builders (the fifth seed, FB-2208, is the "you"
-- placeholder and is created at runtime by assessment completion instead).

insert into public.builders (masked_handle, role, summary, skills, dimensions, profile_strength, tier) values
('FB-5590', 'Platform engineer',
 'Runs infrastructure and on-call for a Kigali logistics platform. Cut deploy time from an hour to eight minutes and owns the incident process. Six years, three of them on call.',
 '["Kubernetes","Terraform","Go","Observability"]',
 '[{"name":"Technical depth","score":94,"rationale":"Walked through a cascading failure from the load balancer down to a connection pool limit, with the metric that revealed each step."},{"name":"Communication clarity","score":88,"rationale":"Writes incident reviews that a non-engineer can follow, leading with impact before cause."},{"name":"Async and remote readiness","score":95,"rationale":"Built the handover rotation across three time zones and documented the escalation path so nobody waits on one person."},{"name":"Professionalism","score":92,"rationale":"Treats a postmortem as a system question rather than a personal one, and said so without prompting."},{"name":"Collaboration","score":90,"rationale":"Pairs with product engineers on their deploys instead of gatekeeping the pipeline."},{"name":"Problem solving","score":92,"rationale":"Reduced an ambiguous reliability goal to two measurable targets before proposing any work."}]',
 92, '{"name":"Top 1%","color":"#066E5A"}'),
('FB-4417', 'Frontend engineer',
 'Shipped accessible React dashboards for a Nairobi health platform on low-bandwidth networks. Three years, with a year owning the design system.',
 '["React","TypeScript","Accessibility"]',
 '[{"name":"Technical depth","score":80,"rationale":"Explained how they cut a bundle to hold up on a 3G connection, though the reasoning about rendering cost stayed at a high level."},{"name":"Communication clarity","score":86,"rationale":"Answers are short and structured, and they check the listener has followed before moving on."},{"name":"Async and remote readiness","score":78,"rationale":"Comfortable working alone across a time gap, but waits to be asked for status more often than they volunteer it."},{"name":"Professionalism","score":84,"rationale":"Described missing a deadline by flagging it early and proposing a reduced scope."},{"name":"Collaboration","score":80,"rationale":"Gives careful review feedback and asks for it, with one clear example of mentoring a designer into code."},{"name":"Problem solving","score":78,"rationale":"Solves well inside a defined brief, with less evidence of framing a problem that arrived unframed."}]',
 81, '{"name":"Gold","color":"#B08A2E"}'),
('FB-7731', 'Data engineer',
 'Built ETL and reporting pipelines across three African markets, owning data quality end to end. Five years, mostly in retail analytics.',
 '["Airflow","SQL","Python"]',
 '[{"name":"Technical depth","score":78,"rationale":"Knows pipeline orchestration well and described a real backfill failure, though the answer on warehouse modelling was thin."},{"name":"Communication clarity","score":72,"rationale":"Accurate but dense. Tends to describe the pipeline before saying what the business problem was."},{"name":"Async and remote readiness","score":74,"rationale":"Works independently, but the handover example depended on a live call rather than a written note."},{"name":"Professionalism","score":78,"rationale":"Owned a data error that reached a report and described how they corrected the record."},{"name":"Collaboration","score":76,"rationale":"Works closely with analysts, with less evidence of engaging in engineering code review."},{"name":"Problem solving","score":76,"rationale":"Methodical on data quality, and named the check they added so the failure could not repeat silently."}]',
 76, '{"name":"Gold","color":"#B08A2E"}'),
('FB-3164', 'Mobile engineer',
 'Android developer for an Accra agritech app used by smallholder farmers offline. Two years, self-taught after a physics degree.',
 '["Kotlin","Android","Offline sync"]',
 '[{"name":"Technical depth","score":68,"rationale":"Solid on offline sync and conflict resolution, but has not yet worked on anything beyond a single mobile client."},{"name":"Communication clarity","score":62,"rationale":"Answers start in the middle of the problem, so a listener without context has to ask twice."},{"name":"Async and remote readiness","score":58,"rationale":"Has only worked in one time zone with a colocated team, and had no example of an offline handover."},{"name":"Professionalism","score":66,"rationale":"Reliable on commitments, though the disagreement example ended in going quiet rather than resolving it."},{"name":"Collaboration","score":64,"rationale":"Works well beside one other developer, with no experience of a formal review process."},{"name":"Problem solving","score":62,"rationale":"Fixes what is in front of them and has started documenting assumptions, but tends to build before scoping."}]',
 64, '{"name":"Silver","color":"#4A5C68"}');

insert into public.squads (id, name, focus, pitch, members) values
('backend', 'Backend Guild', 'Distributed systems, data, and reliability', 'Battle-tested backend builders who ship resilient systems on real infrastructure.', 128),
('frontend', 'Frontend Collective', 'Accessible, resilient interfaces on real networks', 'Frontend engineers who make fast, accessible UIs that hold up on low bandwidth.', 96),
('data', 'Data Engineering Circle', 'Pipelines, quality, and analytics across markets', 'Data engineers who own quality end to end across African markets.', 71),
('lagos', 'Lagos Builders', 'Local meetups, mentorship, and referrals', 'A Lagos crew that mentors, meets up, and refers each other into great roles.', 154);

insert into public.jurisdictions (country, currency_code, statutory_notes) values
('Nigeria', 'NGN', 'Local statutory obligations are computed at source per jurisdiction; no rates asserted here.'),
('Kenya', 'KES', 'Local statutory obligations are computed at source per jurisdiction; no rates asserted here.'),
('Ghana', 'GHS', 'Local statutory obligations are computed at source per jurisdiction; no rates asserted here.');

insert into public.fx_rates (base_pair, rate, illustrative) values
('USD/NGN', 1550, true),
('USD/KES', 129, true),
('USD/GHS', 15.4, true);

-- Adjusts a squad's displayed member count by a signed delta. Deliberately
-- SECURITY DEFINER: squads has no UPDATE policy (one would let any caller
-- rewrite name/pitch, not just the count), so this constrained function is
-- the only write path for the members counter. Guarded to signed-in users
-- and revoked from anon; the only thing it can do is shift the count.
create or replace function public.bump_squad_members(p_squad text, p_delta int)
returns void language plpgsql security definer set search_path = '' as
$$ begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.squads set members = greatest(0, members + p_delta) where id = p_squad;
end $$;
revoke execute on function public.bump_squad_members(text, int) from public, anon;
grant execute on function public.bump_squad_members(text, int) to authenticated;
