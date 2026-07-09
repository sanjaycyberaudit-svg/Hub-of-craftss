-- Product lifecycle: paid-order archive, media purge, unpaid order cleanup, order line snapshots.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS media_purge_at TIMESTAMPTZ;

ALTER TABLE order_lines
  ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS product_slug_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS product_code_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS product_image_key_snapshot TEXT;

-- Backfill snapshots for existing paid orders.
UPDATE order_lines ol
SET
  product_name_snapshot = COALESCE(ol.product_name_snapshot, src.name),
  product_slug_snapshot = COALESCE(ol.product_slug_snapshot, src.slug),
  product_code_snapshot = COALESCE(ol.product_code_snapshot, src.product_code),
  product_image_key_snapshot = COALESCE(ol.product_image_key_snapshot, src.image_key)
FROM (
  SELECT
    ol2.id AS order_line_id,
    p.name,
    p.slug,
    p.product_code,
    m.key AS image_key
  FROM order_lines ol2
  INNER JOIN orders o ON o.id = ol2."orderId"
  INNER JOIN products p ON p.id = ol2.product_id
  LEFT JOIN medias m ON m.id = p.featured_image_id
  WHERE o.payment_status = 'paid'
) src
WHERE ol.id = src.order_line_id;

ALTER TABLE order_lines ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE order_lines DROP CONSTRAINT IF EXISTS order_lines_product_id_fkey;
ALTER TABLE order_lines DROP CONSTRAINT IF EXISTS order_lines_to_product;

ALTER TABLE order_lines
  ADD CONSTRAINT order_lines_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_media_purge_at_idx
  ON products (media_purge_at)
  WHERE archived_at IS NOT NULL AND media_purge_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_unpaid_created_at_idx
  ON orders (created_at)
  WHERE payment_status = 'unpaid';
