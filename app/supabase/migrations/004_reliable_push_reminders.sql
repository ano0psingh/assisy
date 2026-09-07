-- Idempotent delivery claims for push reminder deduplication and retry.
-- Existing push_subscriptions rows and columns remain unchanged.

-- Subscription writes now go through authenticated server endpoints. Remove
-- the legacy public policy that allowed an anon client to read or rewrite any
-- browser endpoint. The service role bypasses RLS.
alter table public.push_subscriptions enable row level security;
drop policy if exists "Allow all operations" on public.push_subscriptions;

create table if not exists public.push_reminder_deliveries (
  subscription_endpoint text not null,
  reminder_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_for timestamptz not null,
  claimed_at timestamptz not null default now(),
  delivered_at timestamptz,
  primary key (subscription_endpoint, reminder_key)
);

create index if not exists push_reminder_deliveries_cleanup_idx
  on public.push_reminder_deliveries (scheduled_for);

alter table public.push_reminder_deliveries enable row level security;

-- Only the server service-role client uses this table. No browser policy is
-- intentionally created.
