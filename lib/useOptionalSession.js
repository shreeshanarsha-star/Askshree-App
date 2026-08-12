'use client';
import { useState, useEffect } from 'react';
import { supabasePublic } from './supabase';

// Optional auth awareness for public tool pages — unlike useAdminSession,
// this never redirects. No session just means "anonymous", and the normal
// per-IP free-use limit applies. A real session lifts that limit (see
// lib/authedUser.js + the *Gating.js files).
export function useOptionalSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = supabasePublic();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = supabasePublic();
    await supabase.auth.signOut();
    setSession(null);
    window.location.reload();
  }

  return { session, ready, token: session?.access_token || null, email: session?.user?.email || null, signOut };
}
