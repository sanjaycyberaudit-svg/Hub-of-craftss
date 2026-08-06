# Project identity

**Single source of truth:** [`project.identity.json`](../project.identity.json)

Holds public pins only (Cloudflare account, Supabase ref, site hosts, Vercel/GitHub, R2 bucket names). Secrets stay in `.env.local` / Vercel / Cloudflare.

## Commands

```bash
npm run validate:identity          # env + wrangler vs identity
npm run validate:identity:login    # also checks `wrangler whoami`
npm run validate:wrangler          # identity + OpenNext wrangler bindings
npm run auth:setup                 # configure Supabase Auth from identity
npm run auth:verify                # verify auth against identity project
```

## Change process

1. Edit `project.identity.json` first.
2. Update wrangler / `.env.local` / Vercel to match.
3. Run `npm run validate:identity` (and `:login` if Cloudflare login changed).
4. Never use hosts/accounts listed under `forbidden`.
