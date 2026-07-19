-- Optional pack/set label: qty remains packs; pack_size is display-only.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sold_as_pack boolean NOT NULL DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pack_size integer;

COMMENT ON COLUMN products.sold_as_pack IS 'When true, show Set of N near price; cart qty = number of packs';
COMMENT ON COLUMN products.pack_size IS 'Pieces per set when sold_as_pack; required integer >= 2 when enabled';
