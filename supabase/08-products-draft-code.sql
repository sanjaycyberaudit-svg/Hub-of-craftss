alter table if exists public.products
  add column if not exists product_code text;

alter table if exists public.products
  add column if not exists is_draft boolean not null default false;

create unique index if not exists products_product_code_unique
  on public.products (product_code)
  where product_code is not null;
