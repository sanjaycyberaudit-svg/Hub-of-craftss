-- Faster admin media gallery ORDER BY created_at DESC, id DESC.
create index if not exists medias_created_at_id_desc_idx
  on public.medias (created_at desc nulls last, id desc);
