import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

// A self-contained username/password auth layer for the Gauri.ai cattle-
// health module — deliberately separate from the recruiting side's
// Supabase Auth (self-serve login) and site key. Every role except Farmer
// (who never gets an account) logs in here: vet, agent, stockist, admin.
// Password hashing/verification happens inside Postgres via pgcrypto's
// crypt() so there's no bcrypt dependency in the app layer.

const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'gauri_session';

export async function verifyLogin(username, password) {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc('gauri_verify_password', { p_username: username, p_password: password });
  if (error || !data || data.length === 0) return null;
  const account = data[0];
  if (!account.active) return null;
  return { id: account.id, username: account.username, role: account.role, displayName: account.display_name };
}

export async function createSession(accountId) {
  const db = supabaseAdmin();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.from('gauri_sessions').insert({ token, account_id: accountId, expires_at: expiresAt });
  return { token, expiresAt };
}

export async function getSessionAccount(req) {
  const token = req.cookies?.get?.(SESSION_COOKIE)?.value
    || (req.headers.get('cookie') || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.split('=')[1];
  if (!token) return null;

  const db = supabaseAdmin();
  const { data: session } = await db
    .from('gauri_sessions')
    .select('account_id, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: account } = await db
    .from('gauri_accounts')
    .select('id, username, role, display_name, active')
    .eq('id', session.account_id)
    .maybeSingle();
  if (!account || !account.active) return null;

  return { id: account.id, username: account.username, role: account.role, displayName: account.display_name };
}

export async function destroySession(token) {
  if (!token) return;
  const db = supabaseAdmin();
  await db.from('gauri_sessions').delete().eq('token', token);
}
