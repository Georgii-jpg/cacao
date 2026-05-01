"use client";
// Formulaire création / édition d'un utilisateur.
// Sélecteurs région / magasin conditionnels selon le rôle choisi.
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  creerUtilisateur,
  modifierUtilisateur,
  type EtatActionUtilisateur,
} from "@/lib/utilisateurs/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/app/generated/prisma/enums";
import { LIBELLE_ROLE } from "@/lib/navigation";

const ETAT_INITIAL: EtatActionUtilisateur = { ok: false, erreur: null };

type Region = { id: string; code: string; nom: string };
type Magasin = {
  id: string;
  code: string;
  nom: string;
  region: { nom: string };
};

type UtilisateurInitial = {
  id: string;
  email: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  role: Role;
  actif: boolean;
  regionId: string | null;
  magasinId: string | null;
};

type Props = {
  regions: Region[];
  magasins: Magasin[];
  utilisateur?: UtilisateurInitial;
};

export function FormUtilisateur({ regions, magasins, utilisateur }: Props) {
  const router = useRouter();
  const enEdition = !!utilisateur;
  const action = enEdition ? modifierUtilisateur : creerUtilisateur;
  const [etat, formAction, enCours] = useActionState(action, ETAT_INITIAL);

  const [role, setRole] = useState<Role>(utilisateur?.role ?? Role.OPERATEUR_SAISIE);
  const [voirMdp, setVoirMdp] = useState(false);

  const erreurs = etat.erreursChamps ?? {};
  const requiertRegion = role === Role.MANAGER_REGIONAL;
  const requiertMagasin =
    role === Role.RESPONSABLE_MAGASIN || role === Role.OPERATEUR_SAISIE;

  useEffect(() => {
    if (etat.ok && etat.utilisateurId) {
      toast.success(
        enEdition ? "Compte mis à jour." : "Compte créé.",
      );
      router.push(`/utilisateurs/${etat.utilisateurId}`);
    }
  }, [etat.ok, etat.utilisateurId, enEdition, router]);

  return (
    <form action={formAction} className="space-y-6">
      {utilisateur && <input type="hidden" name="id" value={utilisateur.id} />}

      {etat.erreur && (
        <Alert variant="destructive">
          <AlertTitle>Action impossible</AlertTitle>
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Champ
            id="nom"
            libelle="Nom"
            placeholder="Konan"
            defaultValue={utilisateur?.nom}
            erreur={erreurs.nom}
            required
          />
          <Champ
            id="prenom"
            libelle="Prénom"
            placeholder="Yao"
            defaultValue={utilisateur?.prenom ?? ""}
            erreur={erreurs.prenom}
          />
          <Champ
            id="email"
            type="email"
            libelle="Email"
            placeholder="prenom.nom@socopad.ci"
            defaultValue={utilisateur?.email}
            erreur={erreurs.email}
            required
          />
          <Champ
            id="telephone"
            libelle="Téléphone"
            placeholder="+225 ..."
            defaultValue={utilisateur?.telephone ?? ""}
            erreur={erreurs.telephone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rôle & affectation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="role">
              Rôle<span className="text-destructive">*</span>
            </Label>
            <Select
              name="role"
              defaultValue={utilisateur?.role ?? Role.OPERATEUR_SAISIE}
              onValueChange={(v) => v && setRole(v as Role)}
            >
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.ADMIN}>{LIBELLE_ROLE.ADMIN}</SelectItem>
                <SelectItem value={Role.MANAGER_REGIONAL}>
                  {LIBELLE_ROLE.MANAGER_REGIONAL}
                </SelectItem>
                <SelectItem value={Role.RESPONSABLE_MAGASIN}>
                  {LIBELLE_ROLE.RESPONSABLE_MAGASIN}
                </SelectItem>
                <SelectItem value={Role.OPERATEUR_SAISIE}>
                  {LIBELLE_ROLE.OPERATEUR_SAISIE}
                </SelectItem>
              </SelectContent>
            </Select>
            {erreurs.role && (
              <p className="text-xs text-destructive">{erreurs.role}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actif">Statut du compte</Label>
            <Select name="actif" defaultValue={utilisateur?.actif === false ? "false" : "true"}>
              <SelectTrigger id="actif" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Actif</SelectItem>
                <SelectItem value="false">Désactivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requiertRegion && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="regionId">
                Région<span className="text-destructive">*</span>
              </Label>
              <Select
                name="regionId"
                defaultValue={utilisateur?.regionId ?? "AUCUNE"}
              >
                <SelectTrigger id="regionId" className="w-full">
                  <SelectValue placeholder="Choisir une région" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUCUNE">— Aucune —</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erreurs.regionId && (
                <p className="text-xs text-destructive">{erreurs.regionId}</p>
              )}
            </div>
          )}

          {requiertMagasin && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="magasinId">
                Magasin<span className="text-destructive">*</span>
              </Label>
              <Select
                name="magasinId"
                defaultValue={utilisateur?.magasinId ?? "AUCUN"}
              >
                <SelectTrigger id="magasinId" className="w-full">
                  <SelectValue placeholder="Choisir un magasin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUCUN">— Aucun —</SelectItem>
                  {magasins.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nom}
                      <span className="text-xs text-muted-foreground">
                        {m.region.nom}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erreurs.magasinId && (
                <p className="text-xs text-destructive">{erreurs.magasinId}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!enEdition && (
        <Card>
          <CardHeader>
            <CardTitle>Mot de passe initial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="motDePasse">
                Mot de passe<span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="motDePasse"
                  name="motDePasse"
                  type={voirMdp ? "text" : "password"}
                  required
                  minLength={8}
                  aria-invalid={!!erreurs.motDePasse}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setVoirMdp((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={voirMdp ? "Masquer" : "Afficher"}
                >
                  {voirMdp ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {erreurs.motDePasse ? (
                <p className="text-xs text-destructive">{erreurs.motDePasse}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Min 8 caractères, avec majuscule, minuscule et chiffre.
                  L&apos;utilisateur pourra le changer depuis son profil.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={enCours}
        >
          <ArrowLeft className="h-4 w-4" />
          Annuler
        </Button>
        <Button type="submit" disabled={enCours}>
          {enCours ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {enEdition ? "Enregistrer" : "Créer le compte"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

type ChampProps = {
  id: string;
  libelle: string;
  erreur?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Champ({ id, libelle, erreur, required, ...rest }: ChampProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {libelle}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        required={required}
        aria-invalid={!!erreur}
        {...rest}
      />
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
    </div>
  );
}
