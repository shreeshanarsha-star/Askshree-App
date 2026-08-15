'use client';
import { useEffect } from 'react';

export default function AdminThemeRedirect() {
  useEffect(() => { window.location.href = '/settings'; }, []);
  return <div className="admin-main">Redirecting to Settings…</div>;
}
