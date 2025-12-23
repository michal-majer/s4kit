import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "S4Kit Platform",
  description: "SAP S/4HANA Integration Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster
          richColors
          position="bottom-right"
          toastOptions={{
            className: "font-sans",
          }}
        />
      </body>
    </html>
  );
}
