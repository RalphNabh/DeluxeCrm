-- Advisor found oauth_authorization_codes / oauth_access_tokens visible to
-- anon/authenticated via pg_graphql introspection despite RLS having no
-- policies (RLS blocks rows, not schema visibility). These tables are
-- service-role only; remove the default table grants entirely.

revoke all on public.oauth_authorization_codes from anon, authenticated;
revoke all on public.oauth_access_tokens from anon, authenticated;
