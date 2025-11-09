'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = window.localStorage.getItem('accessToken');
    router.replace(token ? '/conversations' : '/login');
  }, [router]);

  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Redirecting…</span>
        </div>
        <p className="mt-3 text-muted">Loading your messaging workspace…</p>
      </div>
    </div>
  );
}
