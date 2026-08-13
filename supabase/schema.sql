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

-- ---------------------------------------------------------------------------
-- Offer.ai — document-upload -> AI proposal -> sequential approval -> download.
-- Already applied to the connected Supabase project via migration
-- `offer_ai_tables`; kept here so the repo reflects the real schema.
-- Letter generation / candidate e-sign are parked for a later phase.
-- ---------------------------------------------------------------------------

create table if not exists offer_usage (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  create_count int not null default 0,
  status text not null default 'free',
  last_created_at timestamptz not null default now()
);
create index if not exists idx_offer_usage_ip on offer_usage(ip_address);

create table if not exists offer_proposals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id),
  candidate_name text,
  current_designation text,
  proposed_designation text,
  grade text,
  division text,
  department text,
  notice_period text,
  tentative_joining_date text,
  currency text not null default 'INR',
  hike_percent numeric,
  components jsonb not null default '[]'::jsonb,
  gross_current numeric,
  gross_proposed numeric,
  total_ctc_current numeric,
  total_ctc_proposed numeric,
  other_benefits text,
  justification text,
  justification_chat jsonb not null default '[]'::jsonb,
  budget_band text,
  role_title text,
  job_role text,
  recruiter_email text,
  status text not null default 'draft',
  current_approval_step int not null default 0,
  ip_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_offer_proposals_recruiter on offer_proposals(recruiter_email);
create index if not exists idx_offer_proposals_status on offer_proposals(status);
create index if not exists idx_offer_proposals_candidate on offer_proposals(candidate_id);

create table if not exists offer_documents (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references offer_proposals(id) on delete cascade,
  doc_type text not null,
  file_name text,
  extracted_text text,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_offer_documents_proposal on offer_documents(proposal_id);

create table if not exists offer_approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references offer_proposals(id) on delete cascade,
  sequence_order int not null,
  approver_email text not null,
  token text not null unique,
  status text not null default 'pending',
  comment text,
  decided_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_offer_approvals_proposal on offer_approvals(proposal_id);
create index if not exists idx_offer_approvals_token on offer_approvals(token);

alter table offer_usage enable row level security;
alter table offer_proposals enable row level security;
alter table offer_documents enable row level security;
alter table offer_approvals enable row level security;

-- ---------------------------------------------------------------------------
-- Margin.ai — real-time margin leak detection (Finance.ai). CEO-only, gated
-- via the existing admin Supabase Auth. Single-company internal tool,
-- record-only actions (nothing auto-executes). Applied via migration
-- `margin_ai_tables`.
-- ---------------------------------------------------------------------------

create table if not exists margin_uploads (
  id uuid primary key default gen_random_uuid(),
  source_label text,
  sales_row_count int,
  cost_row_count int,
  status text not null default 'processing',
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists margin_products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  customer_name text,
  category text,
  revenue_monthly numeric,
  cost_monthly numeric,
  margin_pct numeric,
  prev_margin_pct numeric,
  cost_breakdown jsonb not null default '[]'::jsonb,
  root_cause text,
  status text not null default 'healthy',
  first_flagged_at timestamptz,
  last_upload_id uuid references margin_uploads(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(product_name, customer_name)
);
create index if not exists idx_margin_products_status on margin_products(status);

create table if not exists margin_recommendations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references margin_products(id) on delete cascade,
  recommendation_text text,
  action_type text,
  expected_impact_monthly numeric,
  status text not null default 'pending',
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_margin_rec_product on margin_recommendations(product_id);
create index if not exists idx_margin_rec_status on margin_recommendations(status);

alter table margin_uploads enable row level security;
alter table margin_products enable row level security;
alter table margin_recommendations enable row level security;

-- Apply.ai questionnaire pipeline (stage 2/3 of matching): a candidate who
-- clears the CV-based AI screen (stage 1, screenCandidate in lib/aiScreen.js)
-- gets emailed this structured questionnaire; only a pass against the JD
-- (lib/questionnaire.js) reaches the job poster.
-- job_postings also gained: min_years_experience numeric, industry text,
-- ctc_budget text — extracted by structureJD alongside the (now capped at
-- exactly 3 each) must_have_skills / good_to_have_skills.
create table if not exists application_questionnaires (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) not null,
  token text unique not null,
  status text not null default 'sent', -- sent | completed | expired
  technical_skill_answers jsonb,
  good_to_have_answers jsonb,
  location text,
  ctc text,
  total_experience numeric,
  qualification text,
  current_industry text,
  open_to_relocation boolean,
  passed boolean,
  verification_reasoning text,
  sent_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_appq_application on application_questionnaires(application_id);
create index if not exists idx_appq_token on application_questionnaires(token);

-- Smart Source.ai free-use gate (mirrors the pattern in every other tool's
-- *Gating.js — 3 free searches per IP, lifted for logged-in accounts).
create table if not exists smart_source_usage (
  ip_address text primary key,
  search_count integer not null default 0,
  status text not null default 'free',
  last_used_at timestamptz default now()
);
alter table smart_source_usage enable row level security;
