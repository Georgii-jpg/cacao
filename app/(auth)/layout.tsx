// Layout pour les pages publiques d'authentification (connexion, etc.)
// Affiche un fond crème + carte centrée.
export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      {children}
    </div>
  );
}
