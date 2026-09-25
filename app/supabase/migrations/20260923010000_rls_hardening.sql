-- RLS hardening pass, driven by `supabase db advisors` output on the init
-- schema.
--
--   1. auth_rls_initplan: every auth.uid() becomes (select auth.uid()) so it
--      is evaluated once per query instead of once per row.
--   2. multiple_permissive_policies: owner-all + revealed-select pairs are
--      restructured as one SELECT policy (union predicate) plus separate
--      INSERT/UPDATE/DELETE policies, so no role evaluates two permissive
--      policies for the same action.
--   3. owns_builder is revoked from anon: policies still run for
--      authenticated callers, and anonymous reads of protected tables fail
--      closed instead of silently empty.
--
-- Not fixed, deliberately: the security_definer_view advisory on
-- builders_public. A definer view is the whole point of the masked public
-- projection — invoker security would either expose full rows to permitted
-- readers or show anon users nothing. Only non-PII columns are projected.

-- --------------------------------------------------------------- builders
drop policy builders_owner on public.builders;
drop policy builders_revealed on public.builders;

create policy builders_select on public.builders
  for select using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.matches m
      join public.employers e on e.id = m.employer_id
      where m.builder_id = builders.id
        and m.status in ('interviewing', 'sow')
        and e.owner_id = (select auth.uid())
    )
  );
create policy builders_insert on public.builders
  for insert with check (owner_id = (select auth.uid()));
create policy builders_update on public.builders
  for update using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy builders_delete on public.builders
  for delete using (owner_id = (select auth.uid()));

-- -------------------------------------------------------------- employers
drop policy employers_owner on public.employers;
create policy employers_owner on public.employers
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ------------------------------------------------------------------ roles
drop policy roles_employer on public.roles;
create policy roles_employer on public.roles
  for all using (
    exists (select 1 from public.employers e
            where e.id = roles.employer_id and e.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.employers e
            where e.id = roles.employer_id and e.owner_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------- matches
drop policy matches_employer on public.matches;
drop policy matches_builder_read on public.matches;

create policy matches_select on public.matches
  for select using (
    public.owns_builder(matches.builder_id)
    or exists (select 1 from public.employers e
               where e.id = matches.employer_id and e.owner_id = (select auth.uid()))
  );
create policy matches_insert on public.matches
  for insert with check (
    exists (select 1 from public.employers e
            where e.id = matches.employer_id and e.owner_id = (select auth.uid()))
  );
create policy matches_update on public.matches
  for update using (
    exists (select 1 from public.employers e
            where e.id = matches.employer_id and e.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.employers e
            where e.id = matches.employer_id and e.owner_id = (select auth.uid()))
  );
create policy matches_delete on public.matches
  for delete using (
    exists (select 1 from public.employers e
            where e.id = matches.employer_id and e.owner_id = (select auth.uid()))
  );

-- ------------------------------------------------------------ engagements
drop policy engagements_employer on public.engagements;
drop policy engagements_builder_read on public.engagements;

create policy engagements_select on public.engagements
  for select using (
    exists (select 1 from public.matches m join public.employers e on e.id = m.employer_id
            where m.id = engagements.match_id and e.owner_id = (select auth.uid()))
    or exists (select 1 from public.matches m
            where m.id = engagements.match_id and public.owns_builder(m.builder_id))
  );
create policy engagements_insert on public.engagements
  for insert with check (
    exists (select 1 from public.matches m join public.employers e on e.id = m.employer_id
            where m.id = engagements.match_id and e.owner_id = (select auth.uid()))
  );
create policy engagements_update on public.engagements
  for update using (
    exists (select 1 from public.matches m join public.employers e on e.id = m.employer_id
            where m.id = engagements.match_id and e.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.matches m join public.employers e on e.id = m.employer_id
            where m.id = engagements.match_id and e.owner_id = (select auth.uid()))
  );
create policy engagements_delete on public.engagements
  for delete using (
    exists (select 1 from public.matches m join public.employers e on e.id = m.employer_id
            where m.id = engagements.match_id and e.owner_id = (select auth.uid()))
  );

-- ----------------------------------------------------------- sroi_entries
drop policy sroi_employer on public.sroi_entries;
create policy sroi_employer on public.sroi_entries
  for all using (
    exists (select 1 from public.engagements g
            join public.matches m on m.id = g.match_id
            join public.employers e on e.id = m.employer_id
            where g.id = sroi_entries.engagement_id and e.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.engagements g
            join public.matches m on m.id = g.match_id
            join public.employers e on e.id = m.employer_id
            where g.id = sroi_entries.engagement_id and e.owner_id = (select auth.uid()))
  );

-- ------------------------------------------------------------- agent_runs
drop policy agent_runs_owner on public.agent_runs;
create policy agent_runs_owner on public.agent_runs
  for all using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- ------------------------------------------------------------ audit_events
drop policy audit_owner on public.audit_events;
create policy audit_owner on public.audit_events
  for all using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ----------------------------------------------------------- squad_members
-- Select stays open to all (membership is not sensitive); write actions are
-- split per action so they no longer overlap the read-all SELECT policy.
drop policy squad_members_read on public.squad_members;
drop policy squad_members_own on public.squad_members;

create policy squad_members_read on public.squad_members
  for select using (true);
create policy squad_members_insert on public.squad_members
  for insert to authenticated with check (public.owns_builder(builder_id));
create policy squad_members_delete on public.squad_members
  for delete to authenticated using (public.owns_builder(builder_id));

-- ------------------------------------------------- definer function guard
-- Anonymous callers have no legitimate path to owns_builder (it exists for
-- policy evaluation under authenticated queries). Deny-by-error is the
-- intended outcome for anonymous reads of protected tables. EXECUTE must be
-- revoked from PUBLIC (the grant anon inherits), then re-granted to the role
-- that legitimately triggers it via policies.
revoke execute on function public.owns_builder(uuid) from public;
grant execute on function public.owns_builder(uuid) to authenticated;
