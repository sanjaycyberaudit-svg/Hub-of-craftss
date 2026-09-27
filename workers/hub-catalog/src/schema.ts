/** Read-only storefront mirror of Supabase (published products only). */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    rating TEXT NOT NULL,
    badge TEXT,
    price TEXT NOT NULL,
    price_paise INTEGER NOT NULL,
    effective_paise INTEGER NOT NULL,
    effective_rupees INTEGER NOT NULL,
    discount_enabled INTEGER NOT NULL,
    discount_percent INTEGER,
    stock INTEGER,
    featured INTEGER,
    created_at TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    collection_id TEXT,
    image_id TEXT NOT NULL,
    image_key TEXT,
    image_alt TEXT,
    row_hash TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER,
    image_id TEXT,
    image_key TEXT,
    image_alt TEXT,
    row_hash TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_products_featured_created
    ON products (featured, created_at_ms)`,
  `CREATE INDEX IF NOT EXISTS idx_products_collection
    ON products (collection_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_effective_rupees
    ON products (effective_rupees)`,
];
