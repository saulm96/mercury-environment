import { NavLink, Outlet, Navigate } from 'react-router-dom';
import styles from './EconomyLayout.module.css';

export default function EconomyLayout() {
  const isActive = ({ isActive: active }: { isActive: boolean }) =>
    active ? `${styles.tab} ${styles.tabActive}` : styles.tab;

  return (
    <div className={styles.wrapper}>
      <nav className={styles.subNav}>
        <NavLink to="/economy/dashboard" end className={isActive}>
          Dashboard
        </NavLink>
        <NavLink to="/economy/budgets" className={isActive}>
          Budgets
        </NavLink>
        <NavLink to="/economy/transactions" className={isActive}>
          Transactions
        </NavLink>
      </nav>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

export function EconomyIndex() {
  return <Navigate to="/economy/dashboard" replace />;
}
