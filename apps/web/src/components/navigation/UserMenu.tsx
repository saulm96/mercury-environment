'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@mercury/shared';

interface UserMenuProps {
  user: User | null;
  loading: boolean;
}

export function UserMenu({ user, loading }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = useCallback(async () => {
    await fetch('/auth/logout', { credentials: 'include' });
    window.location.href = '/';
  }, []);

  // Close dropdown on click outside
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
    <div ref={menuRef} className="relative">
      {/* Avatar */}
      {loading ? (
        <div className="animate-pulse bg-gray-200 rounded-full w-9 h-9" />
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-full bg-mercury-cta text-white flex items-center justify-center text-sm font-semibold cursor-pointer transition-all duration-200 hover:opacity-90"
          aria-label="User menu"
          aria-expanded={open}
        >
          {initial}
        </button>
      )}

      {/* Dropdown */}
      {open && user && (
        <>
          {/* Click-capture backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-card shadow-mercury-lg border border-gray-100 z-50">
            <div className="px-4 pt-4 pb-2">
              {user.name && (
                <p className="font-semibold text-sm text-mercury-text">{user.name}</p>
              )}
              <p className="text-xs text-mercury-secondary">{user.email}</p>
            </div>
            <hr className="border-gray-100 my-2" />
            <div className="px-2 pb-2">
              <button
                onClick={handleSignOut}
                className="text-sm text-rose-600 hover:bg-rose-50 w-full text-left px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
