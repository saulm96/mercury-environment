import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/navigation/Navbar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import styles from './ToolsLayout.module.css';

export default function ToolsLayout() {
  return (
    <AuthGuard>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </AuthGuard>
  );
}
