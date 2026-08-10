import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { supabaseAdmin } from '../../../../../../lib/supabase';

export async function GET(req, { params }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data: product, error } = await db.from('margin_products').select('*').eq('id', params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!product) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: recommendations } = await db
    .from('margin_recommendations')
    .select('*')
    .eq('product_id', params.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ product, recommendations: recommendations || [] });
}
