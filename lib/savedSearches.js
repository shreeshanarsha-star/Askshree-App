import { supabaseAdmin } from './supabase';

// Saved searches for Smart Source.ai / Smart Hunt.ai — same ownership
// pattern as projects.js (tied to a real user_id if logged in, otherwise
// falls back to IP). `params` is opaque JSON; each tool's page interprets
// its own shape when loading a saved search back into the form.

async function ownerFilter({ userId, ip }) {
  return userId ? { column: 'user_id', value: userId } : { column: 'ip_address', value: ip };
}

export async function listSavedSearches({ tool, userId, ip }) {
  const db = supabaseAdmin();
  const owner = await ownerFilter({ userId, ip });
  const { data } = await db
    .from('saved_searches')
    .select('id, name, params, created_at')
    .eq('tool', tool)
    .eq(owner.column, owner.value)
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

export async function createSavedSearch({ tool, userId, ip, name, params }) {
  const db = supabaseAdmin();
  const row = { tool, name: name.trim(), params };
  if (userId) row.user_id = userId; else row.ip_address = ip;
  const { data, error } = await db.from('saved_searches').insert(row).select('id, name, params, created_at').single();
  if (error) throw error;
  return data;
}

export async function deleteSavedSearch({ id, userId, ip }) {
  const db = supabaseAdmin();
  const owner = await ownerFilter({ userId, ip });
  await db.from('saved_searches').delete().eq('id', id).eq(owner.column, owner.value);
}
