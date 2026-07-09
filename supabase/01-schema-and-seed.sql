-- =============================================================================
-- Sakthi Textiles – HiyoRi database setup
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Project: qhtwwyqlsnckorndmhmt
-- =============================================================================
-- SAFE: Drops app tables only (not auth.users). Run once on a fresh project.
-- =============================================================================

-- Extensions (GraphQL API used by HiyoRi storefront)
CREATE EXTENSION IF NOT EXISTS "pg_graphql";

-- -----------------------------------------------------------------------------
-- 1. DROP old app tables (if re-running)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS order_lines CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS product_medias CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS testimonials CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS address CASCADE;
DROP TABLE IF EXISTS medias CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- -----------------------------------------------------------------------------
-- 2. CREATE TABLES (order matters for foreign keys)
-- -----------------------------------------------------------------------------

CREATE TABLE medias (
  id TEXT PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  alt VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE testimonials (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'video')),
  customer_name VARCHAR(120) NOT NULL,
  location VARCHAR(120),
  quote TEXT,
  video_url TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  featured_image_id TEXT REFERENCES medias(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  "order" INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR NOT NULL,
  "order" INTEGER,
  featured_image_id TEXT NOT NULL REFERENCES medias(id) ON DELETE RESTRICT
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  description TEXT,
  featured BOOLEAN DEFAULT FALSE,
  badge TEXT CHECK (badge IN ('new_product', 'best_sale', 'featured')),
  rating NUMERIC(2, 1) NOT NULL DEFAULT 4,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  price NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  "totalComments" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stock INTEGER DEFAULT 8,
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  featured_image_id TEXT NOT NULL REFERENCES medias(id) ON DELETE RESTRICT
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  is_admin BOOLEAN,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE address (
  id TEXT PRIMARY KEY,
  city TEXT,
  country TEXT,
  line1 TEXT,
  line2 TEXT,
  postal_code TEXT,
  state TEXT,
  full_name TEXT,
  email TEXT,
  mobile TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userProfileId" UUID REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  amount NUMERIC(8, 2) NOT NULL,
  currency TEXT NOT NULL,
  email TEXT,
  name TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE NO ACTION,
  order_status TEXT,
  "addressId" TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'unpaid', 'no_payment_required')),
  payment_method TEXT,
  order_source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_lines (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  price NUMERIC(8, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
  quantity INTEGER NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE wishlist (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "profileId" UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_medias (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "mediaId" TEXT NOT NULL REFERENCES medias(id) ON DELETE CASCADE,
  priority INTEGER
);

-- -----------------------------------------------------------------------------
-- 3. Auto-create profile when user signs up (admin login)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (storefront can read products; users manage own cart)
-- -----------------------------------------------------------------------------
ALTER TABLE medias ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE address ENABLE ROW LEVEL SECURITY;

-- Public read (shop pages)
CREATE POLICY "public_read_medias" ON medias FOR SELECT USING (true);
CREATE POLICY "public_read_testimonials" ON testimonials FOR SELECT USING (is_published = true);
CREATE POLICY "public_read_collections" ON collections FOR SELECT USING (true);
CREATE POLICY "public_read_products" ON products FOR SELECT USING (true);

-- Profiles: user sees own row
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Cart / wishlist: own rows only
CREATE POLICY "carts_all_own" ON carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlist_all_own" ON wishlist FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Orders: user sees own orders (service_role used in admin/API)
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "order_lines_select_own" ON order_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = "orderId" AND o.user_id = auth.uid()));

CREATE POLICY "address_select_own" ON address FOR SELECT TO authenticated USING (auth.uid() = "userProfileId");
CREATE POLICY "address_insert_own" ON address FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userProfileId");
CREATE POLICY "address_update_own" ON address FOR UPDATE TO authenticated USING (auth.uid() = "userProfileId") WITH CHECK (auth.uid() = "userProfileId");
CREATE POLICY "address_delete_own" ON address FOR DELETE TO authenticated USING (auth.uid() = "userProfileId");

CREATE INDEX IF NOT EXISTS address_user_profile_id_idx ON address ("userProfileId");
CREATE INDEX IF NOT EXISTS address_user_default_idx ON address ("userProfileId", is_default DESC, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON address TO authenticated;
GRANT SELECT ON address TO anon;

-- -----------------------------------------------------------------------------
-- 5. SEED DATA – Sakthi Textiles (saree categories + sample products)
-- -----------------------------------------------------------------------------
INSERT INTO medias (id, key, alt) VALUES
  ('m1', 'public/silk-sarees.jpg', 'Silk Sarees'),
  ('m2', 'public/cotton-sarees.jpg', 'Cotton Sarees'),
  ('m3', 'public/kanchi-sarees.jpg', 'Kanchi Sarees'),
  ('m4', 'public/designer-sarees.jpg', 'Designer Sarees');

INSERT INTO collections (id, label, slug, title, description, featured_image_id, "order") VALUES
  ('c1', 'Silk Sarees', 'silk-sarees', 'Premium Silk Sarees', 'Traditional and soft silk sarees for festivals and weddings.', 'm1', 1),
  ('c2', 'Cotton Sarees', 'cotton-sarees', 'Cotton Sarees', 'Comfortable daily-wear cotton sarees.', 'm2', 2),
  ('c3', 'Kanchi Sarees', 'kanchi-sarees', 'Kanchi Sarees', 'Kanchipuram and semi-Kanchi collections.', 'm3', 3),
  ('c4', 'Designer Sarees', 'designer-sarees', 'Designer Sarees', 'Contemporary designer saree styles.', 'm4', 4);

INSERT INTO products (id, name, slug, description, featured, badge, rating, price, stock, collection_id, featured_image_id, images) VALUES
  ('p1', 'Kanchi Semi Silk – Maroon', 'kanchi-semi-silk-maroon',
   'Elegant semi silk saree with rich border.', true, 'new_product', 4.8, 1299.00, 15, 'c3', 'm3', '["https://placehold.co/600x800/maroon/white?text=Saree+1"]'::jsonb),
  ('p2', 'Soft Silk – Gold', 'soft-silk-gold',
   'Lightweight soft silk for occasions.', true, 'featured', 4.6, 999.00, 20, 'c1', 'm1', '["https://placehold.co/600x800/gold/black?text=Saree+2"]'::jsonb),
  ('p3', 'Kerala Cotton – Cream', 'kerala-cotton-cream',
   'Breathable Kerala cotton saree.', true, 'best_sale', 4.5, 750.00, 25, 'c2', 'm2', '["https://placehold.co/600x800/ivory/black?text=Saree+3"]'::jsonb),
  ('p4', 'Georgette – Navy Blue', 'georgette-navy',
   'Flowing georgette saree with blouse piece.', false, NULL, 4.2, 899.00, 10, 'c4', 'm4', '["https://placehold.co/600x800/navy/white?text=Saree+4"]'::jsonb);

-- -----------------------------------------------------------------------------
-- Done. Next: create admin user in Authentication, then run npm run dev
-- =============================================================================
