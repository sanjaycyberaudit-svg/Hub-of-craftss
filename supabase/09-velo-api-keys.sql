create table if not exists public.external_api_keys (
  id text primary key,
  provider varchar(64) not null,
  client_name varchar(191) not null,
  key_prefix varchar(32) not null,
  key_hash text not null unique,
  is_active boolean not null default true,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists external_api_keys_provider_idx
  on public.external_api_keys(provider);
