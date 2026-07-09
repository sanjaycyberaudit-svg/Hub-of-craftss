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

const sql = postgres(url, { max: 1 });

const statements = [
  `CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql`,
  `GRANT USAGE ON SCHEMA public TO anon, authenticated`,
  `GRANT USAGE ON SCHEMA graphql TO anon, authenticated, service_role`,
  `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated`,
  // Customers manage their own cart/wishlist rows
  `GRANT SELECT, INSERT, UPDATE, DELETE ON carts TO authenticated`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON wishlist TO authenticated`,
];

// Auto-create a profiles row whenever a new auth user signs up (admin + customers)
const triggerSql = [
  `CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   BEGIN
     INSERT INTO public.profiles (id, email, name)
     VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
     ON CONFLICT (id) DO NOTHING;
     RETURN NEW;
   END;
   $$`,
  `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,
  `CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`,
];

const blockDisposableSql = readFileSync(
  join(root, "scripts/sql/block-disposable-auth-signup.sql"),
  "utf8",
);

// Turn on Row Level Security so the policies below are enforced
const rlsSql = [
  `ALTER TABLE medias ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE collections ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE products ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE carts ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE orders ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE address ENABLE ROW LEVEL SECURITY`,
];

const policySql = [
  `DROP POLICY IF EXISTS "profiles_select_own" ON profiles`,
  `CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id)`,
  `DROP POLICY IF EXISTS "profiles_update_own" ON profiles`,
  `CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`,
  `DROP POLICY IF EXISTS "orders_select_own" ON orders`,
  `CREATE POLICY "orders_select_own" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "order_lines_select_own" ON order_lines`,
  `CREATE POLICY "order_lines_select_own" ON order_lines FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = "orderId" AND o.user_id = auth.uid()))`,
  `DROP POLICY IF EXISTS "public_read_products" ON products`,
  `DROP POLICY IF EXISTS "public_read_collections" ON collections`,
  `DROP POLICY IF EXISTS "public_read_medias" ON medias`,
  `CREATE POLICY "public_read_products" ON products FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "public_read_collections" ON collections FOR SELECT TO anon, authenticated USING (true)`,
  `CREATE POLICY "public_read_medias" ON medias FOR SELECT TO anon, authenticated USING (true)`,
  `DROP POLICY IF EXISTS "public_read_testimonials" ON testimonials`,
  `CREATE POLICY "public_read_testimonials" ON testimonials FOR SELECT TO anon, authenticated USING (is_published = true)`,
  `DROP POLICY IF EXISTS "carts_all_own" ON carts`,
  `CREATE POLICY "carts_all_own" ON carts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "wishlist_all_own" ON wishlist`,
  `CREATE POLICY "wishlist_all_own" ON wishlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
  `DROP POLICY IF EXISTS "address_select_own" ON address`,
  `CREATE POLICY "address_select_own" ON address FOR SELECT TO authenticated USING (auth.uid() = "userProfileId")`,
  `DROP POLICY IF EXISTS "address_insert_own" ON address`,
  `CREATE POLICY "address_insert_own" ON address FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userProfileId")`,
  `DROP POLICY IF EXISTS "address_update_own" ON address`,
  `CREATE POLICY "address_update_own" ON address FOR UPDATE TO authenticated USING (auth.uid() = "userProfileId") WITH CHECK (auth.uid() = "userProfileId")`,
  `DROP POLICY IF EXISTS "address_delete_own" ON address`,
  `CREATE POLICY "address_delete_own" ON address FOR DELETE TO authenticated USING (auth.uid() = "userProfileId")`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON address TO authenticated`,
];

try {
  for (const q of [...statements, ...triggerSql, ...rlsSql, ...policySql]) {
    await sql.unsafe(q);
    console.log("OK:", q.replace(/\s+/g, " ").slice(0, 60) + "...");
  }
  await sql.unsafe(blockDisposableSql);
  console.log("OK: block_disposable_auth_signup trigger");
  const [{ count }] = await sql`SELECT count(*)::int as count FROM products`;
  console.log("Products in database:", count);
  console.log("GraphQL setup complete.");
} catch (e) {
  console.error("Setup failed:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
