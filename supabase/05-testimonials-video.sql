-- Video + text testimonial kinds (safe to re-run)
ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text';

ALTER TABLE testimonials DROP CONSTRAINT IF EXISTS testimonials_kind_check;
ALTER TABLE testimonials
  ADD CONSTRAINT testimonials_kind_check CHECK (kind IN ('text', 'video'));

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Video cards may use a short caption only; text cards keep full quotes
ALTER TABLE testimonials ALTER COLUMN quote DROP NOT NULL;

UPDATE testimonials SET kind = 'text' WHERE kind IS NULL;
