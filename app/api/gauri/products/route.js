import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getSessionAccount } from '../../../../lib/gauriAuth';

// Vet/admin-only — feeds the product picker on the case-approval screen.
// Not public: the product list itself isn't sensitive, but there's no
// farmer-facing reason to expose it outside the conversation flow (which
// gets its suggestions server-side via lib/gauriConversation.js instead).
export async function GET(req) {
  const account = await getSessionAccount(req);
  if (!account || (account.role !== 'vet' && account.role !== 'admin')) {
    return NextResponse.json({ error: 'Vet login required.' }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data } = await db
    .from('gauri_products')
    .select('id, name, category, use_summary, dosage, pack_sizes, species, price')
    .eq('active', true)
    .order('category');
  return NextResponse.json({ products: data || [] });
}
