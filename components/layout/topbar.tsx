// Top bar — rendue en server component, embarque MobileNav + UserMenu (client).
import { itemsPourRole } from "@/lib/navigation";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import type { RoleApp } from "@/lib/auth/permissions";

type Props = {
  utilisateur: {
    nom?: string | null;
    email?: string | null;
    role?: RoleApp;
  };
};

export function Topbar({ utilisateur }: Props) {
  const items = itemsPourRole(utilisateur.role);
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <MobileNav items={items} />
      <div className="flex-1" />
      <UserMenu nom={utilisateur.nom} email={utilisateur.email} role={utilisateur.role} />
    </header>
  );
}
