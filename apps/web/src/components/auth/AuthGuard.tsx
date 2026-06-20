'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User, ApiResponse } from '@mercury/shared';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await api.get<ApiResponse<User>>('/users/me');
        if (!cancelled) setIsValid(true);
      } catch {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-mercury-cta rounded-full animate-spin" />
      </div>
    );
  }

  if (!isValid) return null;

  return <>{children}</>;
}
