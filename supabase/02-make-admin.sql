-- =============================================================================
-- IMPORTANT: This app checks auth app_metadata.isAdmin (JWT), NOT only profiles.
-- Easiest: run from project folder:
--   node scripts/make-admin.mjs your-email@example.com
-- Then sign OUT and sign IN again so the session picks up isAdmin.
-- =============================================================================

-- Optional: also mark profile row (used by DB / GraphQL, not the menu by itself)
UPDATE public.profiles
SET is_admin = true
WHERE email = 'your-email@gmail.com';

-- Verify profile:
-- SELECT id, email, is_admin FROM public.profiles;
