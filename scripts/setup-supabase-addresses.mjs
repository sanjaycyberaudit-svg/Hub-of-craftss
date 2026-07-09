import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const migrationSql = readFileSync(
  join(root, "supabase", "05-user-addresses.sql"),
  "utf8",
);

const extraSql = [
  // Index for fast per-user address lookups
  `CREATE INDEX IF NOT EXISTS address_user_profile_id_idx ON address ("userProfileId")`,
  `CREATE INDEX IF NOT EXISTS address_user_default_idx ON address ("userProfileId", is_default DESC, created_at DESC)`,

  // Table grants (authenticated users manage own rows via RLS)
  `GRANT SELECT, INSERT, UPDATE, DELETE ON address TO authenticated`,
  `GRANT SELECT ON address TO anon`,

  // Policies scoped to authenticated role (matches carts/wishlist pattern)
  `DROP POLICY IF EXISTS "address_select_own" ON address`,
  `CREATE POLICY "address_select_own" ON address FOR SELECT TO authenticated USING (auth.uid() = "userProfileId")`,
  `DROP POLICY IF EXISTS "address_insert_own" ON address`,
  `CREATE POLICY "address_insert_own" ON address FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userProfileId")`,
  `DROP POLICY IF EXISTS "address_update_own" ON address`,
  `CREATE POLICY "address_update_own" ON address FOR UPDATE TO authenticated USING (auth.uid() = "userProfileId") WITH CHECK (auth.uid() = "userProfileId")`,
  `DROP POLICY IF EXISTS "address_delete_own" ON address`,
  `CREATE POLICY "address_delete_own" ON address FOR DELETE TO authenticated USING (auth.uid() = "userProfileId")`,

  // Backfill contact fields on legacy rows from linked orders
  `UPDATE address a
   SET
     full_name = COALESCE(NULLIF(TRIM(a.full_name), ''), NULLIF(TRIM(o.name), '')),
     email = COALESCE(NULLIF(TRIM(a.email), ''), NULLIF(TRIM(o.email), ''))
   FROM orders o
   WHERE o."addressId" = a.id
     AND o.user_id = a."userProfileId"
     AND (
       COALESCE(NULLIF(TRIM(a.full_name), ''), '') = ''
       OR COALESCE(NULLIF(TRIM(a.email), ''), '') = ''
     )`,

  // Ensure one default per user when they have addresses but none marked default
  `WITH users_missing_default AS (
     SELECT DISTINCT "userProfileId"
     FROM address
     WHERE "userProfileId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM address d
         WHERE d."userProfileId" = address."userProfileId"
           AND d.is_default = true
       )
   ),
   pick AS (
     SELECT
       a.id,
       ROW_NUMBER() OVER (
         PARTITION BY a."userProfileId"
         ORDER BY a.created_at DESC NULLS LAST, a.id DESC
       ) AS rn
     FROM address a
     JOIN users_missing_default u ON u."userProfileId" = a."userProfileId"
   )
   UPDATE address a
   SET is_default = true
   FROM pick p
   WHERE a.id = p.id AND p.rn = 1`,
];

const sql = postgres(url, { max: 1 });

try {
  console.log("Project:", process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ?? "(unknown)");
  console.log("Applying address migration...");
  await sql.unsafe(migrationSql);

  for (const statement of extraSql) {
    await sql.unsafe(statement);
    console.log("OK:", statement.split("\n")[0].slice(0, 72));
  }

  const [cols] = await sql`
    SELECT json_agg(json_build_object(
      'column', column_name,
      'type', data_type,
      'nullable', is_nullable
    ) ORDER BY ordinal_position) AS items
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'address'
  `;

  const policies = await sql`
    SELECT policyname, cmd, roles::text
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'address'
    ORDER BY policyname
  `;

  const [counts] = await sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE "userProfileId" IS NOT NULL)::int AS linked_users,
      count(*) FILTER (WHERE is_default)::int AS defaults,
      count(*) FILTER (WHERE COALESCE(NULLIF(TRIM(mobile), ''), '') = '')::int AS missing_mobile
    FROM address
  `;

  console.log("\nAddress table columns:", cols.items);
  console.log("\nRLS policies:", policies);
  console.log("\nAddress counts:", counts);
  console.log("\nSupabase address setup complete.");
} catch (e) {
  console.error("Setup failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
