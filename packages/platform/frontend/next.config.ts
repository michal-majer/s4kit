import type { NextConfig } from "next";
import path from "path";

const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname, "../../.."),
  },
  async rewrites() {
    return [
      // Proxy all backend API requests through Next.js to avoid cross-site cookie issues
      {
        source: "/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
