-- Trust backbone: a real human-review queue, subject-scoped audit events, and
-- computed match factors.

-- reviews: contest / human-review / report submissions land here instead of
-- vanishing into the audit log. Status lifecycle is open -> in_review ->
-- resolved. Submitters can file and read their own rows; resolution is
-- deliberately not granted to authenticated — only the service role (the
-- future admin surface) can move a review to resolved.
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users (id) on delete set null,
  kind        text not null check (kind in ('contest', 'human-review', 'report')),
  ref         text not null,   -- human reference shown to the submitter
  subject     text,            -- dimension name / decision / report category
  reason      text,
  context     text,
  builder_id  uuid references public.builders (id) on delete set null,
  status      text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  resolution  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.reviews enable row level security;

create policy reviews_owner_insert on public.reviews
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy reviews_owner_read on public.reviews
  for select to authenticated using (owner_id = (select auth.uid()));

create index reviews_owner_idx on public.reviews (owner_id, created_at desc);
create index reviews_builder_idx on public.reviews (builder_id, status);

-- Subject-scoped audit: events caused by someone else about a builder (an
-- employer revealing them, moving their pipeline stage) must be readable by
-- the builder, per the spec's decision-audit requirement. owner_id remains
-- the actor; subject_builder_id is who the event happened to.
alter table public.audit_events
  add column subject_builder_id uuid references public.builders (id) on delete set null;

-- Split the for-all audit_owner into per-action policies and fold the subject
-- read into the select predicate. One permissive policy per action avoids the
-- multiple-permissive-policies lint and keeps the same semantics: the actor
-- owns the row; the subject may read it.
drop policy audit_owner on public.audit_events;
create policy audit_select on public.audit_events
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.owns_builder(subject_builder_id));
create policy audit_insert on public.audit_events
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy audit_update on public.audit_events
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy audit_delete on public.audit_events
  for delete to authenticated using (owner_id = (select auth.uid()));

create index audit_subject_idx on public.audit_events (subject_builder_id, created_at desc);

-- Computed match factors: the named inputs and weights behind a fit score
-- (canonical Match.factors). Stored, so "why this fit" is inspectable, not
-- narrated.
alter table public.matches add column factors jsonb not null default '[]';
