import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';
import { UserMenu } from './UserMenu';
import { HamburgerIcon } from '@/components/icons';
import styles from './Navbar.module.css';

export function Navbar() {
  const { user, loading } = useUser();
  const location = useLocation();
  const pathname = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.left}>
          <Link to="/transactions" className={styles.brand}>
            Mercury
          </Link>
          <div className={styles.desktopLinks}>
            <Link
              to="/transactions"
              className={`${styles.navLink} ${isActive('/transactions') ? styles.navLinkActive : ''}`}
            >
              Transactions
            </Link>
          </div>
        </div>

        <div className={styles.desktopUserMenu}>
          <UserMenu user={user} loading={loading} />
        </div>

        <button
          className={styles.hamburgerButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <HamburgerIcon />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className={styles.mobileOverlay}>
          <div className={styles.mobileBackdrop} onClick={() => setMobileMenuOpen(false)} />
          <div ref={mobileMenuRef} className={styles.mobilePanel}>
            <div className={styles.mobilePanelInner}>
              <Link
                to="/transactions"
                className={styles.mobileBrand}
                onClick={() => setMobileMenuOpen(false)}
              >
                Mercury
              </Link>

              <nav className={styles.mobileNav}>
                <Link
                  to="/transactions"
                  className={`${styles.mobileNavLink} ${isActive('/transactions') ? styles.mobileNavLinkActive : ''}`}
                >
                  Transactions
                </Link>
              </nav>

              <hr className={styles.mobileDivider} />

              <div>
                {loading ? (
                  <div className={styles.mobileUserSkeleton}>
                    <div className={styles.mobileUserSkeletonAvatar} />
                    <div>
                      <div className={styles.mobileUserSkeletonName} />
                      <div className={styles.mobileUserSkeletonEmail} />
                    </div>
                  </div>
                ) : user ? (
                  <>
                    <div className={styles.mobileUserInfo}>
                      <div className={styles.mobileUserAvatar}>
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.mobileUserDetails}>
                        <p className={styles.mobileUserName}>{user.name ?? user.email}</p>
                        {user.name && (
                          <p className={styles.mobileUserEmail}>{user.email}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
                        window.location.href = '/';
                      }}
                      className={styles.mobileSignOut}
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
