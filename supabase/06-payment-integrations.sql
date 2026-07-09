-- Payment integrations config + order tracking columns

create table if not exists public.api_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.api_settings enable row level security;

drop policy if exists "api_settings_select_authenticated" on public.api_settings;
create policy "api_settings_select_authenticated"
  on public.api_settings
  for select
  to authenticated
  using (true);

drop policy if exists "api_settings_modify_authenticated" on public.api_settings;
create policy "api_settings_modify_authenticated"
  on public.api_settings
  for all
  to authenticated
  using (true)
  with check (true);

grant select on public.api_settings to anon, authenticated;
grant all on public.api_settings to authenticated;

alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists customer_mobile text,
  add column if not exists phonepe_transaction_id text,
  add column if not exists phonepe_merchant_transaction_id text,
  add column if not exists whatsapp_notified boolean not null default false,
  add column if not exists whatsapp_notified_at timestamptz,
  add column if not exists payment_meta jsonb;
