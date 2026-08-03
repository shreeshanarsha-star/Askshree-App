import { supabaseAdmin } from './supabase';

const FREE_USES = 4; // uses allowed before the 7-day grace window starts
const GRACE_DAYS = 7;

// Reads the real client IP from Vercel's forwarded-for header.
// Never trust a client-supplied IP header for this — always the platform's.
export function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// Call this before running any gated tool. Returns { allowed, status, message }.
// Also increments the usage counter and starts the grace clock at the right moment.
export async function checkAndRecordUsage(ip) {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('ip_usage')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  const now = new Date();

  if (!row) {
    await db.from('ip_usage').insert({
      ip_address: ip,
      use_count: 1,
      status: 'free',
      last_used_at: now.toISOString(),
    });
    return { allowed: true, status: 'free' };
  }

  if (row.status === 'whitelisted') {
    return { allowed: true, status: 'whitelisted' };
  }

  if (row.status === 'locked') {
    return {
      allowed: false,
      status: 'locked',
      message: 'Your free trial has ended. Log in and subscribe to keep using Ask Shree tools.',
    };
  }

  if (row.status === 'grace') {
    const graceEnds = new Date(row.grace_started_at);
    graceEnds.setDate(graceEnds.getDate() + GRACE_DAYS);
    if (now > graceEnds) {
      await db.from('ip_usage').update({ status: 'locked' }).eq('ip_address', ip);
      return {
        allowed: false,
        status: 'locked',
        message: 'Your 7-day grace period has ended. Log in and subscribe to continue.',
      };
    }
    await db
      .from('ip_usage')
      .update({ use_count: row.use_count + 1, last_used_at: now.toISOString() })
      .eq('ip_address', ip);
    return { allowed: true, status: 'grace', graceEndsAt: graceEnds.toISOString() };
  }

  // status === 'free'
  const newCount = row.use_count + 1;
  if (newCount >= FREE_USES) {
    await db
      .from('ip_usage')
      .update({
        use_count: newCount,
        status: 'grace',
        grace_started_at: now.toISOString(),
        last_used_at: now.toISOString(),
      })
      .eq('ip_address', ip);
    return { allowed: true, status: 'grace', graceStarted: true };
  }

  await db
    .from('ip_usage')
    .update({ use_count: newCount, last_used_at: now.toISOString() })
    .eq('ip_address', ip);
  return { allowed: true, status: 'free' };
}

// Logs which tool was used, for the admin "tool activity" breakdown.
export async function logToolRun(ip, tool) {
  const db = supabaseAdmin();
  await db.from('tool_runs').insert({ ip_address: ip, tool });
}
