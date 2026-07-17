-- Lock down api_settings: it stores payment gateway secrets, WhatsApp keys,
-- and integration credentials. The permissive policies from
-- 06-payment-integrations.sql let ANY authenticated user read and modify it
-- through the Supabase REST/GraphQL API.
--
-- The application never reads this table through the Supabase API — all
-- access goes through the direct Postgres connection (DATABASE_URL, drizzle),
-- which is unaffected by RLS policies and grants below. service_role also
-- keeps full access.

alter table public.api_settings enable row level security;

-- Remove the permissive policies.
drop policy if exists "api_settings_select_authenticated" on public.api_settings;
drop policy if exists "api_settings_modify_authenticated" on public.api_settings;

-- Remove API-role grants entirely. With RLS enabled and no policies, even a
-- future re-grant would still deny access.
revoke all on public.api_settings from anon;
revoke all on public.api_settings from authenticated;
