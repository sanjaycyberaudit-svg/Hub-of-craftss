-- Faster admin product list ordering and draft/featured lookups.
create index if not exists products_created_at_desc_idx
  on public.products (created_at desc nulls last);

create index if not exists products_featured_idx
  on public.products (featured)
  where featured = true;

create index if not exists products_is_draft_idx
  on public.products (is_draft)
  where is_draft = true;
