create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = '' as
$$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy reviews_admin_read on public.reviews
  for select to authenticated using (public.is_admin());
create policy reviews_admin_update on public.reviews
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.employers
  add column domain_verified boolean not null default false,
  add column verify_token text;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.reviews;;
