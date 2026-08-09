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

-- ---------------------------------------------------------------------------
-- Assessment.ai — Big Five (trait profile), PULSE™ and IMPACT™ (evaluative).
-- Already applied to the connected Supabase project via migration
-- `assessment_ai_tables`; kept here so the repo reflects the real schema.
-- ---------------------------------------------------------------------------

-- Free-use counter for the recruiter-side "Assign assessment" action (3 free per IP).
create table if not exists assessment_usage (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  assign_count int not null default 0,
  status text not null default 'free', -- free | locked | whitelisted
  last_assigned_at timestamptz
);

-- One row per assessment handed to one candidate. candidate_id reuses the
-- existing candidates table (de-dup by email on CV upload) — deliberately not a
-- parallel candidate store.
create table if not exists assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id),
  recruiter_email text,
  job_role text,                       -- the role/req this dashboard row is scoped to
  assessment_type text not null,       -- big_five | pulse | impact
  assessment_source text not null default 'auto',  -- auto | manual
  role_level text,                     -- one of the 18-step ladder
  role_source text default 'auto',     -- auto | manual
  candidate_name text,
  email text,
  contact text,
  token text not null unique,
  question_seed bigint not null,       -- stable per-assignment question randomisation
  status text not null default 'pending', -- pending | registered | completed
  consent_accepted_at timestamptz,
  created_ip text,
  created_at timestamptz not null default now(),
  registered_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);
create index if not exists idx_assessment_assignments_token on assessment_assignments(token);
create index if not exists idx_assessment_assignments_recruiter on assessment_assignments(recruiter_email);
create index if not exists idx_assessment_assignments_candidate on assessment_assignments(candidate_id);

-- Raw 1-5 responses. One row per question per assignment.
create table if not exists assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assessment_assignments(id) on delete cascade,
  question_id text not null,
  response smallint not null check (response between 1 and 5),
  created_at timestamptz not null default now(),
  unique (assignment_id, question_id)
);
create index if not exists idx_assessment_responses_assignment on assessment_responses(assignment_id);

-- Computed results. One row per assignment (enforces one attempt per token:
-- a second submit hits this unique constraint / the status check and is rejected).
-- To let a candidate retake, an admin manually deletes this row plus that
-- assignment's assessment_responses and resets status to 'registered'.
create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references assessment_assignments(id) on delete cascade,
  assessment_type text not null,
  dimension_scores jsonb not null default '[]'::jsonb,
  overall_score numeric,               -- null for Big Five (trait profile, no overall)
  band_label text,                     -- null for Big Five
  ai_narrative jsonb,                  -- cached; generated once on first recruiter view
  narrative_generated_at timestamptz,
  computed_at timestamptz not null default now()
);
create index if not exists idx_assessment_results_assignment on assessment_results(assignment_id);

alter table assessment_usage enable row level security;
alter table assessment_assignments enable row level security;
alter table assessment_responses enable row level security;
alter table assessment_results enable row level security;
