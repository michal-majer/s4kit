import type { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">S4Kit</h1>
          <p className="text-muted-foreground mt-1">SAP Integration Platform</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border shadow-lg p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
