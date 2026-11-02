import type { NextConfig } from "next";

// Security headers for every response. X-Frame-Options / frame-ancestors are
// deliberately not set so the app can still be shown in an embedded preview.
const securityHeaders = [
  // Browsers only talk to the deployed site over HTTPS (ignored on http://localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: true,
  },
  // Type errors now fail the build instead of being silently shipped.
  // (Previously `typescript.ignoreBuildErrors: true` hid 8 real type errors.)
  serverExternalPackages: ["exceljs", "nodemailer"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
