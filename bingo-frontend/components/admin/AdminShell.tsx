"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { RealtimeProvider } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import { PixelIcon } from "@/components/pixel/Sprite";
import type { IconName } from "@/components/pixel/icons";
import { ErrorBox, Loading } from "@/components/ui/Blocks";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Evento", icon: "flag" },
  { href: "/admin/bingo", label: "Bingo", icon: "grid" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "users" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { status, me } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "guest") router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status === "loading" || status === "guest") return <Loading label="Verificando acceso" />;
  if (me?.player.role !== "ADMIN") {
    return (
      <main className="mx-auto max-w-md p-6">
        <ErrorBox message="Esta zona es solo para administradores." />
        <Link href="/inicio" className="px-btn px-btn-dark mt-3">Volver al juego</Link>
      </main>
    );
  }

  return (
    <RealtimeProvider enabled>
      <div className="mx-auto w-full max-w-3xl px-3 pb-12 pt-3">
        <header className="flex items-center justify-between gap-2">
          <span className="font-pixel text-[12px] text-gred">ADMIN</span>
          <div className="flex gap-1">
            <Link href="/pantalla" target="_blank" className="px-btn px-btn-dark px-btn-sm">
              <PixelIcon name="eye" size={12} /> Proyector
            </Link>
            <Link href="/inicio" className="px-btn px-btn-dark px-btn-sm">
              <PixelIcon name="home" size={12} /> Al juego
            </Link>
          </div>
        </header>

        <nav className="mt-3 grid grid-cols-3">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`px-btn ${active ? "px-btn-yellow" : "px-btn-dark"}`}
              >
                <PixelIcon name={tab.icon} size={14} /> {tab.label}
              </Link>
            );
          })}
        </nav>

        <main className="mt-3 flex flex-col gap-2">{children}</main>
      </div>
    </RealtimeProvider>
  );
}
