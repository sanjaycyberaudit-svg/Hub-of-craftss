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

**Current production (before `npm run apply:cloudflare-cache`):** Cloudflare proxy only — almost everything is `cf-cache-status: DYNAMIC` (no custom cache rules).

**Worth it?** Yes for Hub:
- `/_next/static/*` — high benefit, safe (JS/CSS/fonts)
- `/api/storefront/products` — moderate benefit (5 min TTL from origin)
- Bypass admin/cart/checkout/payments — required for safety

Apply idempotently from repo (Shaaru Cloudflare API token):

```bash
# Token: Zone.Cache Rules Edit on hubsofcraftss.com
export CF_API_TOKEN=...
npm run apply:cloudflare-cache
```

Rules are defined in `infra/cloudflare-cache-rules.hub.json` and managed by `scripts/apply-cloudflare-cache-rules.mjs`.

| Rule | Match | Cache |
|------|-------|-------|
| Bypass dynamic | `/admin`, `/cart`, `/orders`, checkout/payment/cron APIs, non-GET | Bypass |
| Bypass health deep | `/api/health?deep=1` | Bypass |
| Static Next assets | URI Path starts with `/_next/static/` | Edge TTL 1 year |
| Public images | favicon, OG image, manifest | Edge TTL 1 day |
| Public product API | `GET /api/storefront/products` | Respect origin `s-maxage=300` |

## Vercel environment (production)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase pooler; app rewrites `:5432` → `:6543` at runtime |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Storefront cache + distributed stock-sweep throttle (already set on Hub) |
| `CRON_SECRET` | Optional — only if you enable Vercel cron or external stock-release scheduler |

## Health checks

| URL | Use |
|-----|-----|
| `GET /api/health` | Uptime / keep-warm (no DB, cheap) |
| `GET /api/health?deep=1` | Alerting only (DB + Redis), e.g. once per hour |

## What this repo optimizes in code

- Middleware skips `/api/*` (webhooks, health, storefront JSON) → fewer edge requests
- Storefront ISR TTL **5 minutes** (`STOREFRONT_REVALIDATE_SECONDS = 300`)
- Stock release at checkout when stock control is on (no Vercel cron on Hobby)
- Static `/_next/static` long-cache headers for Cloudflare edge
- Shallow `/api/health` by default to avoid burning DB pool on monitors

## Identity source of truth

See `project.identity.json` for canonical domains, Cloudflare account, Supabase ref, and Vercel project slugs. Run `npm run validate:identity` before deploy.

## When to upgrade Vercel plan

Upgrade when **Fluid Active CPU** or **function invocations** exceed Hobby limits. Cloudflare proxy helps edge/bots but **does not remove** SSR CPU on Vercel.

## When *not* to move fully to Cloudflare Workers

Full Next.js on Workers requires OpenNext migration, re-testing checkout/webhooks, and ongoing ops. Hub already has an optional Workers deploy path (`wrangler.workers.new-account.jsonc`) — keep **Vercel as production** until cost clearly exceeds engineering time **after** these optimizations.
