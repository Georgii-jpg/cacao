// Page de connexion — server component, embarque le formulaire client.
import { Suspense } from "react";
import { FormConnexion } from "./form-connexion";

export const metadata = {
  title: "Connexion",
};

type Props = {
  searchParams: Promise<{ retour?: string; erreur?: string }>;
};

export default async function PageConnexion({ searchParams }: Props) {
  const { retour } = await searchParams;
  return (
    <Suspense>
      <FormConnexion retour={retour} />
    </Suspense>
  );
}
