-- Advisor hardening: pin search_path and stop exposing helper functions as RPC.

alter function set_updated_at() set search_path = '';

-- Trigger-only function: nothing should call it via /rest/v1/rpc.
revoke execute on function handle_new_user() from public, anon, authenticated;

-- RLS helpers: authenticated must keep EXECUTE (policies evaluate them as the
-- calling role), but anon has no auth.uid() and needs no access.
revoke execute on function is_org_member(uuid) from public, anon;
grant execute on function is_org_member(uuid) to authenticated;
revoke execute on function is_org_manager(uuid) from public, anon;
grant execute on function is_org_manager(uuid) to authenticated;

-- Platform helper flagged by the advisor; not needed via RPC either.
revoke execute on function rls_auto_enable() from public, anon, authenticated;
