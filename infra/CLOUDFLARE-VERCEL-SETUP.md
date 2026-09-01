# Hub of craftss hosting architecture (Cloudflare edge + Vercel)

## Target stack (recommended)

| Layer | Service | Role |
|-------|---------|------|
| **DNS + edge CDN + WAF** | Cloudflare (Free or Pro) | Proxy `hubsofcraftss.com`, cache static assets, block bots |
| **App (Next.js SSR/ISR)** | Vercel (`bom1`) | Serverless functions, admin, checkout |
| **Database** | Supabase `xytdexahcdyhykvuwpys` | Postgres via **transaction pooler :6543** |
| **Product media CDN** | Cloudflare R2 + media Worker | `hub-of-craftss-media.shaarunew01.workers.dev` |
| **Cross-instance cache** | Upstash Redis | Storefront data cache + stock-sweep throttle |

Industry standard for small/mid e-commerce: **Cloudflare in front, Vercel as origin, Supabase as DB**.

## Cloudflare DNS setup (orange cloud)

1. In **Cloudflare DNS** for `hubsofcraftss.com`:
   - `www` → CNAME → `cname.vercel-dns.com` — **Proxied (orange cloud)**
   - `@` apex → redirect to `https://hubsofcraftss.com` (Redirect Rule or CNAME flattening)
2. In **Vercel** → Project `hubs-of-craftss-project` → Domains: `hubsofcraftss.com` + `www.hubsofcraftss.com`
3. SSL/TLS mode: **Full (strict)**
4. Do **not** point the R2 media Worker hostname at Vercel — it stays on Workers/R2.

### Cloudflare cache rules (Rules → Cache Rules)

| Rule | Match | Cache |
|------|-------|-------|
| Static Next assets | URI Path starts with `/_next/static/` | Cache Everything, Edge TTL 1 year |
| Public product API | URI Path equals `/api/storefront/products` | Respect origin `Cache-Control` (s-maxage=300) |
| Bypass dynamic | URI Path starts with `/admin`, `/api/create-checkout`, `/api/cashfree`, `/api/phonepe`, `/cart`, `/orders` | Bypass cache |
| Bypass health deep | URI Path equals `/api/health` and query `deep=1` | Bypass cache |

## Vercel environment (production)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase pooler; app rewrites `:5432` → `:6543` at runtime |
| `CRON_SECRET` | Required for `/api/cron/release-expired-stock-reservations` (also in Vercel cron) |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Storefront cache + distributed stock-sweep throttle |

## Health checks

| URL | Use |
|-----|-----|
| `GET /api/health` | Uptime / keep-warm (no DB, cheap) |
| `GET /api/health?deep=1` | Alerting only (DB + Redis), e.g. once per hour |

## What this repo optimizes in code

- Middleware skips `/api/*` (webhooks, health, storefront JSON) → fewer edge requests
- Storefront ISR TTL **5 minutes** (`STOREFRONT_REVALIDATE_SECONDS = 300`)
- Stock release via **Vercel cron** hourly (`15 * * * *`), not on every cart pricing call
- Checkout still runs a forced sweep when stock control is on
- Static `/_next/static` long-cache headers for Cloudflare edge
- Shallow `/api/health` by default to avoid burning DB pool on monitors

## Identity source of truth

See `project.identity.json` for canonical domains, Cloudflare account, Supabase ref, and Vercel project slugs. Run `npm run validate:identity` before deploy.

## When to upgrade Vercel plan

Upgrade when **Fluid Active CPU** or **function invocations** exceed Hobby limits. Cloudflare proxy helps edge/bots but **does not remove** SSR CPU on Vercel.

## When *not* to move fully to Cloudflare Workers

Full Next.js on Workers requires OpenNext migration, re-testing checkout/webhooks, and ongoing ops. Hub already has an optional Workers deploy path (`wrangler.workers.new-account.jsonc`) — keep **Vercel as production** until cost clearly exceeds engineering time **after** these optimizations.
