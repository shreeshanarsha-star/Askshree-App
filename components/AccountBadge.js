'use client';
import { useOptionalSession } from '../lib/useOptionalSession';

// Small account indicator reused across every public tool page. Signed-in
// users get their free-use limits lifted on that tool (see authedUser.js);
// signed-out users still get the normal 3-free-tries-then-log-in flow.
export function AccountBadge() {
  const { ready, email, signOut } = useOptionalSession();
  if (!ready) return null;
  return (
    <div style={{ position: 'absolute', top: 18, right: 24, fontSize: 11.5, color: 'var(--slate)' }}>
      {email ? (
        <span>{email} · <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={signOut}>Log out</span></span>
      ) : (
        <a href="/login" style={{ color: 'var(--amber-dim)', textDecoration: 'none' }}>Log in</a>
      )}
    </div>
  );
}
