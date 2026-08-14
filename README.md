# Ask Shree

AI-native recruiting tools: Job Postings.ai (post a role, get a shortlisted CV list by email), Apply.ai
(search and apply to open roles), Smart screen.ai (batch-screen CVs against a JD), Assessment.ai (assign
Big Five / PULSE&trade; / IMPACT&trade; psychometric assessments from a CV and get a scored breakdown),
Offer.ai, Smart Source.ai (LinkedIn X-ray search + AI scoring), Smart Hunt.ai (LinkedIn + our own
candidate database + optional local resume files, one consolidated search), Gauri.ai (voice or typed
requests, grounded in an uploaded file and/or live web search), and the Ask Shree chatbot — all with real
backends. The whole site sits behind a shared tool key, with a separate 4332-code lock on the "my
writings" section.

## Setup

1. **Database** — this repo's `supabase/schema.sql` reflects the historical
   base tables; the newer tables (`job_postings`, `applications`,
   `candidates`, `job_posting_usage`, `chatbot_sources`, `chat_logs`,
   `email_verifications`, `screening_batches`, `screening_results`,
   `assessment_usage`, `assessment_assignments`, `assessment_responses`,
   `assessment_results`) were added directly via migration and already
   exist on the connected Supabase project.
2. **Environment variables** (Vercel → Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` — required.
   `RESEND_API_KEY` — optional; without it, email-verification links and
   shortlist emails are returned/logged instead of sent, so nothing breaks,
   it just doesn't email until this is added.
   `SERPAPI_KEY` — required for Smart Source.ai and Smart Hunt.ai's LinkedIn
   X-ray search (serpapi.com, 250 free searches/month); without it those
   tools' LinkedIn source silently returns no results but database/local
   sources still work.
   `GROQ_API_KEY` and/or `OPENAI_API_KEY` — optional, for Gauri.ai's
   "Record voice" and audio-file transcription (Groq tried first, OpenAI as
   fallback). Without either, Gauri.ai still works via typed text and the
   browser's own free live speech recognition (Chrome/Edge) — only
   server-side audio transcription is disabled.
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
  seekers/tool usage, separate 3-free-postings gate for employers, separate
  3-free-assignments gate for Assessment.ai), Assessment.ai (CV upload ->
  AI-extracted role/email/contact with per-field Auto/Manual override,
  candidate de-dup against the existing `candidates` table, tokenised
  candidate link, randomised untimed 50/90-item assessment, one attempt per
  link enforced server-side, weighted scoring with cached AI narrative on the
  recruiter's result view), Offer.ai, Margin.ai (admin-only, key-gated),
  Smart Source.ai (real drag-and-drop JD upload + SerpApi LinkedIn X-ray
  search + AI scoring), Smart Hunt.ai (fans the same search out across
  LinkedIn, the `candidates` table, and optional local files picked via a
  folder dialog — picking the folder is the permission grant), Gauri.ai
  (live browser recording transcribed via Groq/OpenAI Whisper, or the
  browser's free Web Speech API, or typed text; answers via Claude with an
  uploaded file and/or live web search as grounding), a site-wide shared
  tool key gate (`lib/siteAuth.js`) in front of every tool, self-serve
  login/signup that bypasses the 3-free-use IP gate once logged in, and a
  separate 4332-code gate (`lib/writingsAuth.js`) on the "my writings"
  section, independent of the tool key.
- **Still pending**: Google OAuth login for end users once the free-use
  limit is hit (needs a Google Cloud OAuth client to be configured),
  Razorpay billing, partner logo belt backend (homepage + admin).

## Note on the old 8 tools

Fit Check, Smart Source (v1), Smart Hunt, Welcome Flyer, Get JD, Get ATS
Friendly Resume, Run Market Search, and Generate Lead have been removed —
they're superseded by the tools above.
