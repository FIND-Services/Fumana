drop policy audit_subject_read on public.audit_events;
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
  for delete to authenticated using (owner_id = (select auth.uid()));;
