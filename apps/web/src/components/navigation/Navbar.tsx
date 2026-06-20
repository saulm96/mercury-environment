'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { UserMenu } from './UserMenu';
import { HamburgerIcon } from '@/components/icons';

export function Navbar() {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on click outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileMenuOpen]);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-40 h-16 bg-white border-b border-gray-100 shadow-mercury-sm">
      <div className="flex items-center justify-between px-6 lg:px-8 h-full">
        {/* Left: Logo + Desktop Nav Links */}
        <div className="flex items-center gap-8">
          <Link
            href="/transactions"
            className="font-heading text-2xl text-mercury-text cursor-pointer"
          >
            Mercury
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/transactions"
              className={`font-medium text-sm ${
                isActive('/transactions')
                  ? 'text-mercury-cta font-semibold border-b-2 border-mercury-cta pb-1'
                  : 'text-mercury-secondary hover:text-mercury-text transition-colors'
              }`}
            >
              Transactions
            </Link>
          </div>
        </div>

        {/* Right: UserMenu (desktop only) */}
        <div className="hidden md:block">
          <UserMenu user={user} loading={loading} />
        </div>

        {/* Mobile: Hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <HamburgerIcon />
        </button>
      </div>

      {/* Mobile Menu Slide-in */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-in panel */}
          <div
            ref={mobileMenuRef}
            className="absolute top-0 left-0 w-72 h-full bg-white shadow-mercury-xl border-r border-gray-100 overflow-y-auto"
          >
            <div className="p-6">
              <Link
                href="/transactions"
                className="font-heading text-2xl text-mercury-text cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Mercury
              </Link>

              <nav className="flex flex-col gap-2 mt-8">
                <Link
                  href="/transactions"
                  className={`font-medium text-sm px-3 py-2 rounded-lg transition-colors ${
                    isActive('/transactions')
                      ? 'bg-mercury-cta/10 text-mercury-cta font-semibold'
                      : 'text-mercury-secondary hover:text-mercury-text hover:bg-gray-50'
                  }`}
                >
                  Transactions
                </Link>
              </nav>

              <hr className="border-gray-100 my-6" />

              {/* User info in mobile menu */}
              <div>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse bg-gray-200 rounded-full w-9 h-9" />
                    <div className="space-y-1.5">
                      <div className="animate-pulse bg-gray-200 h-3 w-24 rounded" />
                      <div className="animate-pulse bg-gray-200 h-2.5 w-32 rounded" />
                    </div>
                  </div>
                ) : user ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-full bg-mercury-cta text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-mercury-text truncate">
                          {user.name ?? user.email}
                        </p>
                        {user.name && (
                          <p className="text-xs text-mercury-secondary truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await fetch('/auth/logout', { credentials: 'include' });
                        window.location.href = '/';
                      }}
                      className="text-sm text-rose-600 hover:bg-rose-50 w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
