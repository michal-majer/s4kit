import Image from 'next/image';

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
          <Image
            src="/logo.svg"
            alt="S4Kit"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <div>
            <span className="text-2xl font-bold text-white">S4Kit</span>
            <span className="ml-2 text-sm font-medium text-white/60">Platform</span>
          </div>
        </div>

        {/* Main message */}
        <div className="relative space-y-6 flex-1 flex flex-col justify-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white leading-tight">
              SAP Integration,<br />Simplified
            </h2>
            <p className="text-lg text-white/70 max-w-md">
              Connect to SAP S/4HANA with type-safe APIs. No complex infrastructure required.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-white/50 text-sm">
          Secure, scalable, developer-friendly
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 bg-background">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <Image
              src="/logo.svg"
              alt="S4Kit"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-xl font-bold">S4Kit</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
