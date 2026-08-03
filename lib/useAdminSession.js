'use client';
import { useEffect, useState } from 'react';
import { supabasePublic } from './supabase';

export function useAdminSession() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = supabasePublic();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/admin/login';
        return;
      }
      setToken(data.session.access_token);
      setReady(true);
    });
  }, []);

  return { token, ready };
}
