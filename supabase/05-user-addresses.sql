-- Saved shipping addresses: contact fields, default flag, RLS
ALTER TABLE address ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE address ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE address ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE address ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE address ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE address ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "address_select_own" ON address;
CREATE POLICY "address_select_own" ON address
  FOR SELECT USING (auth.uid() = "userProfileId");

DROP POLICY IF EXISTS "address_insert_own" ON address;
CREATE POLICY "address_insert_own" ON address
  FOR INSERT WITH CHECK (auth.uid() = "userProfileId");

DROP POLICY IF EXISTS "address_update_own" ON address;
CREATE POLICY "address_update_own" ON address
  FOR UPDATE USING (auth.uid() = "userProfileId");

DROP POLICY IF EXISTS "address_delete_own" ON address;
CREATE POLICY "address_delete_own" ON address
  FOR DELETE TO authenticated USING (auth.uid() = "userProfileId");

CREATE INDEX IF NOT EXISTS address_user_profile_id_idx ON address ("userProfileId");
CREATE INDEX IF NOT EXISTS address_user_default_idx ON address ("userProfileId", is_default DESC, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON address TO authenticated;
GRANT SELECT ON address TO anon;
