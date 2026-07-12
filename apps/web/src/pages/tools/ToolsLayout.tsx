import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/navigation/Navbar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { RecurringSyncProvider } from '@/components/transactions/RecurringSyncProvider';
import styles from './ToolsLayout.module.css';

export default function ToolsLayout() {
  return (
    <AuthGuard>
      <RecurringSyncProvider>
        <Navbar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </RecurringSyncProvider>
    </AuthGuard>
  );
}
