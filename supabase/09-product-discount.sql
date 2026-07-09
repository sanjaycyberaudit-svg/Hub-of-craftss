-- Product sale discount: MRP stays in price; discount_percent reduces customer price.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_percent integer;

COMMENT ON COLUMN products.price IS 'List / MRP price in INR';
COMMENT ON COLUMN products.discount_enabled IS 'When true, sale price = price reduced by discount_percent';
COMMENT ON COLUMN products.discount_percent IS 'Integer 1-99; required when discount_enabled is true';
