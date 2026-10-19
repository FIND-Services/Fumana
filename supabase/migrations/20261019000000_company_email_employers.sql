-- Employer accounts must use an organization-owned email domain. This check is
-- enforced in Postgres as well as the UI, so a modified browser cannot bypass it.
create or replace function public.has_company_email()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as user_account
    where user_account.id = (select auth.uid())
      and lower(split_part(coalesce(user_account.email, ''), '@', 2)) like '%.%'
      and lower(split_part(coalesce(user_account.email, ''), '@', 2)) <> all (array[
        'gmail.com', 'googlemail.com',
        'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'ymail.com',
        'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'msn.com',
        'aol.com', 'icloud.com', 'me.com', 'mac.com',
        'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net',
        'mail.com', 'yandex.com', 'yandex.ru', 'zoho.com', 'fastmail.com'
      ]::text[])
  );
$$;

revoke all on function public.has_company_email() from public, anon;
grant execute on function public.has_company_email() to authenticated;

drop policy if exists employers_owner on public.employers;
create policy employers_owner on public.employers
  for all
  using (owner_id = (select auth.uid()) and (select public.has_company_email()))
  with check (owner_id = (select auth.uid()) and (select public.has_company_email()));
