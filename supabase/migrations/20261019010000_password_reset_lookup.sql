-- Server-only helper for the password-reset Edge Function. It is intentionally
-- unavailable to browser roles so auth.users is never exposed directly.
create or replace function public.account_email_exists(lookup_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(lookup_email))
  );
$$;

revoke all on function public.account_email_exists(text) from public, anon, authenticated;
grant execute on function public.account_email_exists(text) to service_role;
