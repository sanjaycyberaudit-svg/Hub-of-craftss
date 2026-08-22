CREATE TABLE IF NOT EXISTS public.dispatch_couriers (
  id text PRIMARY KEY,
  name varchar(191) NOT NULL UNIQUE,
  tracking_url_template varchar(512),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_dispatch_events (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id text REFERENCES public.dispatch_couriers(id) ON DELETE SET NULL,
  courier_name varchar(191) NOT NULL,
  tracking_url_template varchar(512),
  tracking_number text,
  dispatch_status varchar(64) NOT NULL DEFAULT 'DISPATCHED',
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_dispatch_events_order_id_unique
  ON public.order_dispatch_events (order_id);
