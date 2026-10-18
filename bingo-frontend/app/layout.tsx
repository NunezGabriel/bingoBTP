import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/Toasts";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Bingo GDG | GDG Arequipa",
    template: "%s | Bingo GDG",
  },
  description:
    "El bingo para conocer gente en los eventos de GDG Arequipa: consigue una firma por casilla.",
  applicationName: "Bingo GDG",
  appleWebApp: { capable: true, title: "Bingo GDG", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f0f0f0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={figtree.variable}>
      <body className="antialiased">
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
