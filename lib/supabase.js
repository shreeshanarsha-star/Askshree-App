import { createClient } from '@supabase/supabase-js';

// Service-role client: used ONLY in server-side API routes. Bypasses RLS.
// Never import this into a client component or expose the key to the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false },
      // Next.js's App Router patches the global fetch() and, by default,
      // caches ANY fetch call indefinitely (its Data Cache) -- including
      // ones made internally by supabase-js, regardless of a route handler
      // being `export const dynamic = 'force-dynamic'`. That's a separate
      // caching layer: 'force-dynamic' stops the ROUTE from being statically
      // generated, it does not stop an individual fetch() inside it from
      // being cached. Confirmed live: after writing a new value via this
      // client, a route reading it back kept returning the pre-write value
      // on every subsequent request (x-vercel-cache: MISS, so it wasn't a
      // CDN/edge cache -- the function ran fresh every time and still got a
      // stale Supabase response). A service-role client should never serve
      // a stale read, so force every request through with no caching.
      global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }) },
    }
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
