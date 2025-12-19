import { Sidebar } from '@/components/nav/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}


