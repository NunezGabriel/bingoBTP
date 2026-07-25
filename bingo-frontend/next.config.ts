import type { NextConfig } from "next";

// Backend al que apunta el proxy /api. En local se define en .env.local
// (http://localhost:3001); si no existe, se usa el backend de produccion.
const BACKEND_URL = process.env.BACKEND_URL || "https://bingobtp.onrender.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
