-- =============================================================================
-- Sakthi Textiles – Customer testimonials (home carousel + admin)
-- Run: npm run db:migrate-testimonials
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT where noted)
-- =============================================================================

CREATE TABLE IF NOT EXISTS testimonials (
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

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_testimonials" ON testimonials;
CREATE POLICY "public_read_testimonials" ON testimonials
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "admin_manage_testimonials" ON testimonials;
CREATE POLICY "admin_manage_testimonials" ON testimonials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Sample data: prefer npm run db:seed-testimonials (text + video, upserts)
