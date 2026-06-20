import { Navbar } from '@/components/navigation/Navbar';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
    </>
  );
}
