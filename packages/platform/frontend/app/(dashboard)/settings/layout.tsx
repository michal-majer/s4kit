import { PageHeader } from '@/components/common/page-header';
import { SettingsNav } from '@/components/settings/settings-nav';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Settings"
        description="Manage your organization and account preferences"
      />

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Settings Navigation Sidebar */}
        <aside className="w-full lg:w-72 lg:min-w-72 shrink-0">
          <div className="sticky top-5">
            <div className="rounded-xl border bg-card p-2.5 shadow-sm">
              <SettingsNav />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
