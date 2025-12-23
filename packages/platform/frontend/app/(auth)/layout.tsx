import { Hexagon } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-12 flex-col justify-between overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/30 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/10" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <Hexagon className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-2xl font-bold text-white">S4Kit</span>
            <span className="ml-2 text-sm font-medium text-white/60">Platform</span>
          </div>
        </div>

        {/* Testimonial / Feature highlight */}
        <div className="relative space-y-6">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium text-white/90 leading-relaxed">
              "S4Kit transformed how we integrate with SAP. What used to take weeks now takes hours."
            </p>
            <footer className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/20" />
              <div>
                <p className="font-semibold text-white">Engineering Lead</p>
                <p className="text-sm text-white/60">Enterprise Software Company</p>
              </div>
            </footer>
          </blockquote>
        </div>

        {/* Bottom stats */}
        <div className="relative flex items-center gap-8 text-white/80">
          <div>
            <p className="text-3xl font-bold text-white">10k+</p>
            <p className="text-sm text-white/60">API Requests Daily</p>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div>
            <p className="text-3xl font-bold text-white">99.9%</p>
            <p className="text-sm text-white/60">Uptime SLA</p>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div>
            <p className="text-3xl font-bold text-white">&lt;50ms</p>
            <p className="text-sm text-white/60">Avg Response</p>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 bg-background">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
              <Hexagon className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold">S4Kit</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
