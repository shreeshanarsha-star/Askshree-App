# Ask Shree — deployment guide

This is the real, working code for everything we designed: the gating logic,
all 8 tools, the Ask Shree chatbot, the admin dashboard, and Stripe billing.
Follow these steps in order.

## 1. Push this code to your GitHub repo

You already have the repo `Askshree-App` under your GitHub account. From
wherever you unzip this folder:

```
cd askshree-app
git init
git add .
git commit -m "Initial Ask Shree build"
git branch -M main
git remote add origin https://github.com/shreeshanarsha-star/Askshree-App.git
git push -u origin main
```

If you're not comfortable with the terminal, GitHub's website also lets you
drag-and-drop upload files directly into the repo — but a full Next.js app
has too many files/folders for that to be practical, so the terminal steps
above are the realistic path here.

## 2. Run the database setup in Supabase

1. Open your `askshree-db` project in Supabase
2. Go to **SQL Editor** → New query
3. Paste the entire contents of `supabase/schema.sql` and run it
4. This creates 4 tables: `ip_usage`, `tool_runs`, `subscribers`, `repository_sources`

## 3. Create your admin login

1. In Supabase Dashboard → **Authentication** → **Users** → Add user
2. Use your real email and a password only you know (don't reuse the one
   suggested earlier in this chat — that one's been seen in this
   conversation log)
3. This is the email/password you'll use at `/admin/login`

## 4. Get your Supabase API keys

1. Supabase Dashboard → **Project Settings** → **API**
2. Copy the **Project URL**, the **anon public** key, and the
   **service_role** key (keep this one secret — never put it in
   client-side code)

## 5. Get your Anthropic API key

From [console.anthropic.com](https://console.anthropic.com) → API Keys

## 6. Set up Stripe

1. Create a product + recurring price in your
   [Stripe Dashboard](https://dashboard.stripe.com/products) — this gives
   you a `price_...` ID
2. Get your **Secret key** from
   [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
   (use the test key first, switch to live key when you're ready to charge
   real customers)
3. Webhook: after deploying (step 8), come back to
   [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks),
   add an endpoint pointing to `https://askshree.com/api/stripe/webhook`,
   select events `checkout.session.completed`,
   `customer.subscription.deleted`, and `invoice.payment_failed`, then copy
   the **signing secret** it gives you

## 7. Add environment variables in Vercel

In your Vercel project (already connected to this GitHub repo) → Settings →
Environment Variables, add every value from `.env.local.example` in this
folder with your real keys from steps 4–6.

## 8. Deploy

Once the environment variables are set and the code is pushed to GitHub,
Vercel will auto-deploy. If it doesn't trigger automatically, go to your
Vercel project → Deployments → Redeploy.

## 9. Connect your domain

In Vercel project → Settings → Domains → add `askshree.com`. Vercel will
show you either nameservers or a DNS record to add in Namecheap
(Domain List → askshree.com → Manage → Advanced DNS).

## 10. Verify everything works

- Visit your site, click a tool, run it once — confirm it responds
- Run it 3–4 more times from the same connection — confirm the grace-window
  message appears
- Log in at `/admin/login` with the account from step 3 — confirm the
  dashboard loads and shows that IP in the usage table
- Add a URL in `/admin/data-sources`, then ask Ask Shree a question related
  to it — confirm it references that content

## What's a placeholder vs. real right now

- **Real and working**: gating logic, all 8 tools' AI calls, Ask Shree,
  admin login/dashboard/repository management, Stripe checkout + webhook
- **You still need to do**: create your Stripe product/price, add your own
  real API keys everywhere, and swap the profile photo filename if you
  use a different one than `public/profile-photo.jpg`
