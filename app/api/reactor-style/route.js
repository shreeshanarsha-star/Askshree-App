import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

// Public, read-only — which reactor visual style the AI Systems panel
// renders. 'sunburst' = the current default (dashed spoke lines from each
// node to the core). 'dial' = the rotary-dial alternate (solid ring, tick
// marks, bright core, no center lines) kept as a separate, independently
// switchable layout per admin's request -- future gesture-rotation control
// is planned to pair naturally with the dial's ring/tick structure.
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db.from('site_settings').select('value').eq('key', 'reactor_style').maybeSingle();
  return NextResponse.json({ style: data?.value || 'sunburst' });
}
