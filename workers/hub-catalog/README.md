# hub-catalog

D1 read mirror of the Hub of craftss storefront catalog (published products and
collections). Supabase stays the source of truth. Cart, checkout and product
pages never read the mirror.

- **Sync:** `POST /sync` diffs Supabase against D1 and writes only changed rows
  in one transaction. It is triggered after admin catalog saves (via
  `invalidateStorefrontCache`) and by a 30-minute cron.
- **Reads:** `/collections`, `/products/featured`, `/products/search`, used by
  the app only when `CATALOG_READ=d1`. Any error, a stale mirror
  (`CATALOG_MAX_STALENESS_MINUTES`, default 180) or a query D1 can't answer
  identically (HTTP 422) falls back to Supabase.
- **Auth:** every route except `/health` needs `Authorization: Bearer <CATALOG_SYNC_SECRET>`.

## Provision (Hub Cloudflare account only)

Run `npm run validate:identity` first and log in as the account in
`project.identity.json`.

```bash
cd workers/hub-catalog
npx wrangler secret put SUPABASE_ANON_KEY   # Hub project anon key
npx wrangler secret put CATALOG_SYNC_SECRET # long random value
npx wrangler deploy
curl -X POST -H "Authorization: Bearer $CATALOG_SYNC_SECRET" https://hub-catalog.<subdomain>.workers.dev/sync
```

Tables are created by the first sync.

## Enable in the app

1. Set `CATALOG_WORKER_URL` and `CATALOG_SYNC_SECRET` in Vercel. Keep
   `CATALOG_READ=supabase`: admin saves now keep the mirror warm.
2. Compare shop, search, price-range, featured and collections pages against
   Supabase. Then set `CATALOG_READ=d1` and redeploy. To roll back, set it to
   `supabase`.
