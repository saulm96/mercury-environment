import { Navbar } from '@/components/navigation/Navbar';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Navbar />
      <main className="pt-16">{children}</main>
    </AuthGuard>
  );
}
