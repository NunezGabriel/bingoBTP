import type { NextConfig } from "next";

// Backend al que apunta el proxy /api. En local se define en .env.local
// (http://localhost:3001); si no existe, se usa el backend de produccion.
const BACKEND_URL = process.env.BACKEND_URL || "https://bingobtp.onrender.com";

const nextConfig: NextConfig = {
  // El indicador flotante de Next tapa una esquina del lobby y se confunde con
  // un boton del juego. Solo sale en desarrollo, pero ahi es donde se prueba.
  devIndicators: false,

  // Solo para la imagen Docker: empaqueta un server.js autocontenido.
  // En Render la variable no existe, asi que el build sigue siendo el de siempre.
  ...(process.env.DOCKER_BUILD === "true"
    ? { output: "standalone" as const }
    : {}),

  // Solo en desarrollo: permite abrir `npm run dev` desde el celular por la IP
  // de la red local (WiFi o VPN tipo Radmin). En produccion no tiene efecto.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "26.*.*.*"],

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
