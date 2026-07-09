alter table public.orders
  add column if not exists whatsapp_seller_notified boolean not null default false,
  add column if not exists whatsapp_seller_notified_at timestamptz;
