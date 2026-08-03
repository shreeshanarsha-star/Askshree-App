import { createClient } from '@supabase/supabase-js';

// Service-role client: used ONLY in server-side API routes. Bypasses RLS.
// Never import this into a client component or expose the key to the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Public (anon) client: safe for client components, used only for admin login
// via Supabase Auth (email/password), which is separate from the app's data tables.
export function supabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
