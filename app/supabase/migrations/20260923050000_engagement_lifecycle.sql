-- Engagement lifecycle: the builder accepts or declines a drafted SOW.
-- engagements UPDATE is employer-only by policy, so the builder side needs a
-- constrained security-definer path that flips status and nothing else.

create or replace function public.respond_to_engagement(p_match uuid, p_action text)
returns text language plpgsql security definer set search_path = '' as
$$
declare
  v_builder uuid;
  v_eng     public.engagements%rowtype;
  v_status  text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_action not in ('accept', 'decline') then raise exception 'invalid action'; end if;

  select builder_id into v_builder from public.matches where id = p_match;
  if v_builder is null or not public.owns_builder(v_builder) then
    raise exception 'not your engagement';
  end if;

  select * into v_eng from public.engagements where match_id = p_match;
  if v_eng.id is null then raise exception 'no engagement for this match'; end if;
  -- Idempotent: once decided, later calls just report the settled state.
  if v_eng.status <> 'draft' then return v_eng.status; end if;

  v_status := case when p_action = 'accept' then 'active' else 'closed' end;
  update public.engagements set status = v_status where id = v_eng.id;

  -- The actor owns the row; subject scoping keeps it in the builder's trail.
  insert into public.audit_events (owner_id, subject_builder_id, kind, payload)
  values (
    auth.uid(), v_builder,
    case when p_action = 'accept' then 'sow-accepted' else 'sow-declined' end,
    jsonb_build_object('status', v_status)
  );

  return v_status;
end
$$;

-- PUBLIC carries EXECUTE by default; anon inherits through it, so revoke the
-- pseudo-role and anon explicitly, then re-grant to authenticated only.
revoke execute on function public.respond_to_engagement(uuid, text) from public, anon;
grant execute on function public.respond_to_engagement(uuid, text) to authenticated;
