create table public.saved_builders (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  builder_id  uuid not null references public.builders (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (employer_id, builder_id)
);

alter table public.saved_builders enable row level security;

create policy saved_employer on public.saved_builders
  for all to authenticated
  using (exists (select 1 from public.employers e
                 where e.id = saved_builders.employer_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.employers e
                      where e.id = saved_builders.employer_id and e.owner_id = (select auth.uid())));

create index saved_employer_idx on public.saved_builders (employer_id);

insert into storage.buckets (id, name, public) values ('builder-media', 'builder-media', false);

create policy media_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'builder-media' and public.owns_builder(((storage.foldername(name))[1])::uuid));
create policy media_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'builder-media' and public.owns_builder(((storage.foldername(name))[1])::uuid));
create policy media_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'builder-media' and public.owns_builder(((storage.foldername(name))[1])::uuid));
create policy media_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'builder-media' and public.owns_builder(((storage.foldername(name))[1])::uuid));
create policy media_reveal_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'builder-media'
    and exists (
      select 1 from public.matches m
      join public.employers e on e.id = m.employer_id
      where m.builder_id = ((storage.foldername(name))[1])::uuid
        and m.status in ('interviewing', 'sow')
        and e.owner_id = (select auth.uid())
    )
  );

create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = '' as
$$
declare
  v_uid      uuid := auth.uid();
  v_builder  uuid;
  v_employer uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_builder  from public.builders  where owner_id = v_uid;
  select id into v_employer from public.employers where owner_id = v_uid;

  delete from public.saved_builders where employer_id = v_employer or builder_id = v_builder;
  if v_builder is not null then
    delete from storage.objects
      where bucket_id = 'builder-media' and name like v_builder::text || '/%';
    delete from public.squad_members where builder_id = v_builder;
    delete from public.builder_documents where builder_id = v_builder;
  end if;
  delete from public.agent_runs where created_by = v_uid;
  delete from public.reviews where owner_id = v_uid;
  delete from public.audit_events where owner_id = v_uid;
  delete from public.builders where owner_id = v_uid;
  delete from public.employers where owner_id = v_uid;
  delete from auth.users where id = v_uid;
end
$$;

revoke execute on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;;
