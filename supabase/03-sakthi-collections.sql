-- Optional: run in Supabase SQL Editor if you prefer SQL over npm run db:seed-collections
-- Creates placeholder medias + collections. Safe to re-run (skips existing slugs).

DO $$
DECLARE
  labels text[] := ARRAY[
    'Softie Sarees',
    'Kanjivaram Wedding Sarees',
    'Soft Silk Sarees',
    'Banaras Tissue Silk Sarees',
    'Traditional Silk Sarees',
    'Kubera Pattu Sarees',
    'Wedding Collections',
    'Cotton Sarees',
    'Silk Cotton Sarees',
    'Fancy Silk Sarees',
    'Mysore silk',
    'Space silk saree',
    'Fancy sarees',
    'celebrity inspired saree'
  ];
  keys text[] := ARRAY[
    'public/bathroom-planning.jpg',
    'public/kitchen-planning.jpg',
    'public/living-room-planning.jpg',
    'public/bedroom-planning.jpg'
  ];
  lbl text;
  collection_slug text;
  media_id text;
  ord int := 0;
  i int;
BEGIN
  FOREACH lbl IN ARRAY labels LOOP
    ord := ord + 1;
    collection_slug := lower(
      regexp_replace(
        regexp_replace(trim(lbl), '[^a-zA-Z0-9]+', '-', 'g'),
        '-+',
        '-',
        'g'
      )
    );
    collection_slug := trim(both '-' from collection_slug);

    IF EXISTS (
      SELECT 1 FROM collections c WHERE c.slug = collection_slug
    ) THEN
      UPDATE collections c
      SET
        label = lbl,
        title = lbl,
        description = 'Explore our ' || lbl || ' at Sakthi Textiles.',
        "order" = ord
      WHERE c.slug = collection_slug;
      CONTINUE;
    END IF;

    i := ((ord - 1) % array_length(keys, 1)) + 1;
    INSERT INTO medias (id, key, alt)
    VALUES (
      gen_random_uuid()::text,
      keys[i],
      collection_slug || '-category'
    )
    RETURNING id INTO media_id;

    INSERT INTO collections (id, label, slug, title, description, "order", featured_image_id)
    VALUES (
      gen_random_uuid()::text,
      lbl,
      collection_slug,
      lbl,
      'Explore our ' || lbl || ' at Sakthi Textiles.',
      ord,
      media_id
    );
  END LOOP;
END $$;

-- Optional: remove demo furniture categories
-- DELETE FROM collections WHERE slug IN ('bathroom', 'kitchen-planning', 'living-room-planning', 'Bedroom-planning');
