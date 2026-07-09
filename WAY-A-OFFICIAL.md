# Way A – Official HiyoRi database setup (PC)

## 1. Put `DATABASE_URL` in `.env.local` (required once)

Open: https://supabase.com/dashboard/project/qhtwwyqlsnckorndmhmt/settings/database

1. **Connection string** → **URI**
2. Copy the full string
3. Replace `[YOUR-PASSWORD]` with your real database password
4. Paste into `.env.local` as `DATABASE_URL=...`

**Or run helper (paste URI when asked):**

```powershell
cd "e:\Sakthi textiles\HiyoRi-Ecommerce-Nextjs-Supabase"
powershell -ExecutionPolicy Bypass -File .\scripts\set-database-url.ps1
```

Must **not** contain `YOUR_DB_PASSWORD`.

## 2. Official commands (from HiyoRi README)

```powershell
cd "e:\Sakthi textiles\HiyoRi-Ecommerce-Nextjs-Supabase"
npm run db:setup
```

(Same as `npm run db:push` then `npm run db:seed`.)

- `db:push` – creates/updates tables from `schema.ts`
- `db:seed` – sample medias, collections, products (medias run first)

## 3. Admin user (Supabase dashboard)

1. **Authentication** → **Providers** → enable **Email**
2. **Users** → **Add user** (your email + password)
3. SQL Editor (optional, for admin CMS):

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'your-email@gmail.com';
```

## 4. Run shop

```powershell
npm run dev
```

Open http://localhost:3000

## If you already ran `01-schema-and-seed.sql`

Either:

- Use a **new** Supabase project, **or**
- SQL Editor → drop app tables, then run `db:push` again

Do **not** mix SQL file + `db:push` on the same DB without dropping tables first.
