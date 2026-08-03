-- Run this once in Supabase Dashboard > SQL Editor, on the askshree-db project.

-- Tracks anonymous usage per IP for the free-trial gating logic
create table if not exists ip_usage (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  use_count int not null default 0,
  first_used_at timestamptz not null default now(),
  grace_started_at timestamptz,
  status text not null default 'free', -- free | grace | locked | whitelisted
  last_used_at timestamptz not null default now()
);
create index if not exists idx_ip_usage_ip on ip_usage(ip_address);

-- Every tool run, for the admin "tool activity" panel
create table if not exists tool_runs (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  tool text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_tool_runs_tool on tool_runs(tool);
create index if not exists idx_tool_runs_created on tool_runs(created_at);

-- Paid subscribers (mirrors Stripe subscription state)
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'active', -- active | past_due | canceled
  created_at timestamptz not null default now()
);

-- Ask Shree's admin-added reference repository (URLs and uploaded docs)
create table if not exists repository_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null, -- 'url' | 'doc'
  label text not null,
  url text,
  content text, -- extracted text, for 'doc' sources
  created_at timestamptz not null default now()
);

-- Row Level Security: lock everything down by default.
-- The app talks to these tables using the service-role key from API routes only
-- (never from the browser), so RLS just needs to block the public anon key.
alter table ip_usage enable row level security;
alter table tool_runs enable row level security;
alter table subscribers enable row level security;
alter table repository_sources enable row level security;

-- No policies added = no access via the anon/public key. Service role bypasses RLS.
