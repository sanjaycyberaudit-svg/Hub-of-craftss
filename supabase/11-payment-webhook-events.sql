-- Durable payment webhook idempotency (Stripe / PhonePe / Cashfree)
-- Prevents double fulfillment when gateways retry the same delivery.

create table if not exists public.payment_webhook_events (
  id text primary key,
  provider text not null,
  event_id text not null,
  status text not null default 'processing',
  order_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_webhook_events_provider_event_uid unique (provider, event_id),
  constraint payment_webhook_events_status_chk
    check (status in ('processing', 'processed', 'failed'))
);

create index if not exists payment_webhook_events_status_updated_idx
  on public.payment_webhook_events (status, updated_at);

create index if not exists payment_webhook_events_order_id_idx
  on public.payment_webhook_events (order_id)
  where order_id is not null;

comment on table public.payment_webhook_events is
  'Idempotency ledger for payment webhook deliveries. Same (provider, event_id) is processed once; a new payment creates a new event_id.';
