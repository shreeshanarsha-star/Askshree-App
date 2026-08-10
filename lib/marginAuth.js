import { NextResponse } from 'next/server';

// Margin.ai isn't behind the admin Supabase login — it's a standalone tool
// gated by a single shared key (matches the site's existing lightweight-gate
// pattern, e.g. the homepage settings shortcut). Every API route checks this
// server-side, so the data is actually protected, not just the UI hidden.
const MARGIN_KEY = 'Cows@123#';

export function requireMarginKey(req) {
  const key = req.headers.get('x-margin-key') || '';
  if (key !== MARGIN_KEY) {
    return NextResponse.json({ error: 'Incorrect key.' }, { status: 401 });
  }
  return null;
}
