#!/usr/bin/env bash
# Cloud Agent install for Hub of craftss (Hiyori-based Next.js storefront).
# Idempotent: safe to re-run. Installs dependencies and, when real secrets are
# absent, writes a placeholder .env.local so `next dev`/`next build` can boot.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing dependencies (npm ci)"
npm ci

# The app validates env vars via @t3-oss/env-nextjs at startup. Real values come
# from the Cursor Secrets panel (injected as process env, which Next.js does not
# override) or a developer-provided .env.local. When neither is present, generate
# safe non-secret placeholders so the dev server and build can run end to end.
# NEXT_PUBLIC_* values below are public project identity; secret values are dummy.
if [ ! -f .env.local ]; then
  echo "==> No .env.local found; writing placeholder .env.local for local dev"
  cat > .env.local <<'ENV'
# Auto-generated placeholder for Cloud Agent dev/build. NOT committed (gitignored).
# Replace with real values via the Cursor Secrets panel or a local .env.local.
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (public project identity; anon key + service role are placeholders)
NEXT_PUBLIC_SUPABASE_PROJECT_REF=xytdexahcdyhykvuwpys
NEXT_PUBLIC_SUPABASE_URL=https://xytdexahcdyhykvuwpys.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
DATABASE_SERVICE_ROLE=placeholder-service-role
DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder

# R2 / S3 media (public hints from project.identity.json; keys are placeholders)
NEXT_PUBLIC_S3_BUCKET=hubofcraftss-cdn
NEXT_PUBLIC_S3_REGION=auto
NEXT_PUBLIC_CDN_URL=https://pub-d036df4365494925a278f4ecf244316d.r2.dev
S3_ENDPOINT=https://542992b23690c0c07bb23e5fecffa6ec.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=placeholder
S3_SECRET_ACCESS_KEY=placeholder
ENV
else
  echo "==> .env.local already present; leaving it untouched"
fi

echo "==> Install complete"
