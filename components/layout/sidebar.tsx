// Sidebar desktop — server component (rendu statique selon le rôle).
// La logique d'état actif est déléguée au composant client `NavLinks`.
import Link from "next/link";
import { itemsPourRole } from "@/lib/navigation";
import { NavLinks } from "./nav-links";
import type { RoleApp } from "@/lib/auth/permissions";

type Props = {
  role: RoleApp | undefined;
};

export function Sidebar({ role }: Props) {
  const items = itemsPourRole(role);
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="12" rx="6" ry="9" />
              <path d="M12 3 v18" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">SOCOPAD</div>
            <div className="text-[10px] uppercase text-sidebar-foreground/60">
              Gestion réseau
            </div>
          </div>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <NavLinks items={items} />
      </div>
      <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/50">
        SOCOPAD · v0.1
      </div>
    </aside>
  );
}
