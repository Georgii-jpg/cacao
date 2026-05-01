import type { NextConfig } from "next";

// Headers de sécurité appliqués à toutes les routes.
// Référence : OWASP Secure Headers Project + Next.js docs.
const securityHeaders = [
  // Empêche l'app d'être embarquée en iframe sur un autre domaine
  { key: "X-Frame-Options", value: "DENY" },
  // Bloque le sniff de type MIME (forcer le content-type)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limite les infos envoyées dans Referer aux liens cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive APIs sensibles que l'app n'utilise pas
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — actif uniquement en HTTPS (sans effet en localhost http)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Active la compilation des routes serveur dans @prisma/* (Prisma 7)
  serverExternalPackages: ["@prisma/client", "better-sqlite3", "pg"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
