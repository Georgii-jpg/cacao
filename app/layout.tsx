import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Police lisible et neutre, bien rendue sur écrans bas/moyen DPI (mobile rural).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SOCOPAD — Gestion opérationnelle",
    template: "%s · SOCOPAD",
  },
  description:
    "Plateforme interne SOCOPAD pour la centralisation des stocks de cacao et le pilotage des 25 points de vente.",
  applicationName: "SOCOPAD",
  authors: [{ name: "SOCOPAD" }],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico" },
};

// Mobile-first : viewport adapté aux téléphones (saisie sur le terrain).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5d3a1f" },
    { media: "(prefers-color-scheme: dark)", color: "#2a1810" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr-CI" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delay={200}>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
