import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@mercury/shared';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  user: User | null;
  loading: boolean;
}

export function UserMenu({ user, loading }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = useCallback(async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const initial = user
    ? ((user.name ?? user.email).charAt(0).toUpperCase())
    : '?';

  return (
    <div ref={menuRef} className={styles.wrapper}>
      {loading ? (
        <div className={styles.avatarSkeleton} />
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className={styles.avatar}
          aria-label="User menu"
          aria-expanded={open}
        >
          {initial}
        </button>
      )}

      {open && user && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.userInfo}>
              {user.name && (
                <p className={styles.userName}>{user.name}</p>
              )}
              <p className={styles.userEmail}>{user.email}</p>
            </div>
            <hr className={styles.divider} />
            <div className={styles.signOutArea}>
              <button onClick={handleSignOut} className={styles.signOutButton}>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
