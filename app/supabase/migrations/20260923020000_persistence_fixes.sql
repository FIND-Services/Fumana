-- Persistence fixes: one builder row per owner, an owner-only documents
-- table for assessment payloads, and indexes on the foreign keys the app
-- actually filters on.

-- One builder record per owner. Retaking the assessment now updates in place
-- (upsert on owner_id) instead of inserting a duplicate that would break
-- maybeSingle() session-restore lookups. NULLs are distinct under a unique
-- constraint, so unsigned rows (owner_id null) are unaffected.
alter table public.builders
  add constraint builders_owner_unique unique (owner_id);

-- Owner-only documents: the raw experience narrative, Zuri's interview
-- transcript, accommodations, and the generated CV. These are the candidate's
-- evidence — kept out of `builders` deliberately, so the reveal-level grant
-- that lets an interviewing employer read a builder row never exposes them.
create table public.builder_documents (
  builder_id     uuid primary key references public.builders (id) on delete cascade,
  experience     text,
  transcript     jsonb not null default '[]',
  cv             jsonb,
  accommodations jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.builder_documents enable row level security;

-- Owner-only via the same definer predicate the other policies use; nothing
-- here is reveal-level, so employers get no path to these rows.
create policy builder_documents_owner on public.builder_documents
  for all to authenticated
  using (public.owns_builder(builder_id))
  with check (public.owns_builder(builder_id));

-- FK indexes for the filters the app runs: squad membership by builder, SROI
-- entries by engagement, roles by employer, engagements by jurisdiction.
-- builders.owner_id is already indexed by the unique constraint above.
create index if not exists squad_members_builder_idx on public.squad_members (builder_id);
create index if not exists sroi_entries_engagement_idx on public.sroi_entries (engagement_id);
create index if not exists roles_employer_idx on public.roles (employer_id);
create index if not exists engagements_jurisdiction_idx on public.engagements (jurisdiction_id);
create index if not exists matches_role_idx on public.matches (role_id);
