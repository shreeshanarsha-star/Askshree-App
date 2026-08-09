# Ask Shree

AI-native recruiting tools: Job Postings.ai (post a role, get a shortlisted CV list by email), Apply.ai (search and apply to open roles), and the
Ask Shree chatbot, all with real backends. Smart Source.ai is in progress.

## Setup

1. **Database** — this repo's `supabase/schema.sql` reflects the historical
   base tables; the newer tables (`job_postings`, `applications`,
   `candidates`, `job_posting_usage`, `chatbot_sources`, `chat_logs`,
   `email_verifications`) were added directly via migration and already
   exist on the connected Supabase project.
2. **Environment variables** (Vercel → Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` — required.
   `RESEND_API_KEY` — optional; without it, email-verification links and
   shortlist emails are returned/logged instead of sent, so nothing breaks,
   it just doesn't email until this is added.
3. **Admin login** — create your admin user in Supabase Dashboard →
   Authentication → Users, with a password only you know. Use that at
   `/admin/login`.
4. **Deploy** — this Vercel project is connected to this repo; pushing to
   `main` triggers an auto-deploy.

## What's real vs. still pending

- **Real and working**: Job Postings.ai (post, email verification with
  domain-match check, admin approval, capped AI shortlist emailing) and
  Apply.ai (apply/auto-apply, AI screening against open roles), Ask Shree chatbot v2 (answers only from
  admin-curated `chatbot_sources`, no open web search, every conversation
  logged), admin pages for both, IP-based free-use gating (shared gate for
  seekers/tool usage, separate 3-free-postings gate for employers).
- **Still pending**: Google OAuth login for end users once the free-use
  limit is hit (needs a Google Cloud OAuth client to be configured),
  Smart Source.ai's real backend (needs Serper + SignalHire API keys),
  Razorpay billing.

## Note on the old 8 tools

Fit Check, Smart Source (v1), Smart Hunt, Welcome Flyer, Get JD, Get ATS
Friendly Resume, Run Market Search, and Generate Lead have been removed —
they're superseded by the tools above.
