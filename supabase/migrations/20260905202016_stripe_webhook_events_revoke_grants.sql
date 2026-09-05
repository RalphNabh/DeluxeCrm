-- The security advisor flags stripe_webhook_events as RLS-enabled-no-policy
-- (same class of finding zapier_oauth_revoke_grants already fixed for
-- oauth_access_tokens / oauth_authorization_codes): RLS blocks row access,
-- but the table is still schema-visible to anon/authenticated via
-- pg_graphql introspection through Postgres' default table grants. This
-- table is service-role only (the Stripe webhook handler uses the service
-- client) - remove the default grants entirely.
--
-- Note: this repo previously had a 20260819013843_contractor_inbox_grants
-- migration applied directly to the live database that was never committed
-- to the repo, so its exact contents couldn't be recovered (Supabase's
-- migration history tracks version/name only, not the SQL body). This
-- migration closes the one concrete, still-live gap that surfaced while
-- investigating that drift.

revoke all on public.stripe_webhook_events from anon, authenticated;
