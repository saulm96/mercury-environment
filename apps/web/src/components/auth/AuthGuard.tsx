import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';
import type { User, ApiResponse } from '@mercury/shared';
import styles from './AuthGuard.module.css';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await api.get<ApiResponse<User>>('/users/me');
        if (!cancelled) setIsValid(true);
      } catch {
        await signOut();
        navigate('/');
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isChecking) {
    return (
      <div className={styles.spinner}>
        <div className={styles.spinnerCircle} />
      </div>
    );
  }

  if (!isValid) return null;

  return <>{children}</>;
}
