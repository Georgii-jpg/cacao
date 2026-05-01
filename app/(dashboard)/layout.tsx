// Layout protégé du dashboard — toute route enfant nécessite une session.
// Le middleware redirige déjà les non-connectés vers /connexion, mais on
// double la sécurité ici (defense in depth).
import { exigerAuth } from "@/lib/auth/require";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { RoleApp } from "@/lib/auth/permissions";

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          utilisateur={{
            nom: session.user.name,
            email: session.user.email,
            role,
          }}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
