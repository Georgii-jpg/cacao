"use client";
// Formulaire de création / édition d'un magasin.
// Le mode est déduit de la présence d'un magasin initial.
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import {
  creerMagasin,
  modifierMagasin,
  type EtatActionMagasin,
} from "@/lib/magasins/actions";
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
import { toast } from "sonner";
import { StatutMagasin } from "@/app/generated/prisma/enums";

const ETAT_INITIAL: EtatActionMagasin = { ok: false, erreur: null };

type MagasinInitial = {
  id: string;
  code: string;
  nom: string;
  ville: string;
  adresse: string | null;
  telephone: string | null;
  capaciteKg: number;
  statut: StatutMagasin;
  regionId: string;
  latitude: number | null;
  longitude: number | null;
  responsableId: string | null;
};

type Region = { id: string; code: string; nom: string };
type Candidat = {
  id: string;
  email: string;
  nom: string;
  prenom: string | null;
};

type Props = {
  regions: Region[];
  candidatsResponsable: Candidat[];
  magasin?: MagasinInitial;
};

export function FormMagasin({ regions, candidatsResponsable, magasin }: Props) {
  const router = useRouter();
  const enEdition = !!magasin;
  const action = enEdition ? modifierMagasin : creerMagasin;
  const [etat, formAction, enCours] = useActionState(action, ETAT_INITIAL);

  // Redirection après succès — on attend que la revalidation server soit faite
  useEffect(() => {
    if (etat.ok && etat.magasinId) {
      toast.success(
        enEdition ? "Magasin mis à jour avec succès." : "Magasin créé avec succès.",
      );
      router.push(`/magasins/${etat.magasinId}`);
    }
  }, [etat.ok, etat.magasinId, enEdition, router]);

  const erreurs = etat.erreursChamps ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {magasin && <input type="hidden" name="id" value={magasin.id} />}

      {etat.erreur && (
        <Alert variant="destructive">
          <AlertTitle>Action impossible</AlertTitle>
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations principales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Champ
            id="code"
            libelle="Code magasin"
            placeholder="MAG-ABJ-01"
            defaultValue={magasin?.code}
            erreur={erreurs.code}
            required
            description="Identifiant court en majuscules (ex : MAG-ABJ-01)"
          />
          <Champ
            id="nom"
            libelle="Nom"
            placeholder="Abidjan Plateau"
            defaultValue={magasin?.nom}
            erreur={erreurs.nom}
            required
          />
          <Champ
            id="ville"
            libelle="Ville"
            placeholder="Abidjan"
            defaultValue={magasin?.ville}
            erreur={erreurs.ville}
            required
          />
          <Champ
            id="telephone"
            libelle="Téléphone"
            placeholder="+225 27 22 ..."
            defaultValue={magasin?.telephone ?? ""}
            erreur={erreurs.telephone}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              name="adresse"
              defaultValue={magasin?.adresse ?? ""}
              placeholder="Rue, quartier"
              aria-invalid={!!erreurs.adresse}
            />
            {erreurs.adresse && (
              <p className="text-xs text-destructive">{erreurs.adresse}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Localisation & exploitation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="regionId">
              Région<span className="text-destructive">*</span>
            </Label>
            <Select
              name="regionId"
              defaultValue={magasin?.regionId}
              required
            >
              <SelectTrigger id="regionId" className="w-full">
                <SelectValue placeholder="Choisir une région" />
              </SelectTrigger>
              <SelectContent>
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

          <div className="space-y-1.5">
            <Label htmlFor="statut">Statut</Label>
            <Select
              name="statut"
              defaultValue={magasin?.statut ?? StatutMagasin.ACTIF}
            >
              <SelectTrigger id="statut" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={StatutMagasin.ACTIF}>Actif</SelectItem>
                <SelectItem value={StatutMagasin.MAINTENANCE}>
                  Maintenance
                </SelectItem>
                <SelectItem value={StatutMagasin.INACTIF}>Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Champ
            id="capaciteKg"
            type="number"
            libelle="Capacité de stockage (kg)"
            placeholder="50000"
            defaultValue={magasin?.capaciteKg?.toString()}
            erreur={erreurs.capaciteKg}
            required
            min="0"
            step="1"
          />
          <div className="flex items-end gap-2 sm:col-span-1" />
          <Champ
            id="latitude"
            type="number"
            libelle="Latitude"
            placeholder="5.3197"
            defaultValue={magasin?.latitude?.toString() ?? ""}
            erreur={erreurs.latitude}
            step="any"
          />
          <Champ
            id="longitude"
            type="number"
            libelle="Longitude"
            placeholder="-4.0267"
            defaultValue={magasin?.longitude?.toString() ?? ""}
            erreur={erreurs.longitude}
            step="any"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsable du magasin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="responsableId">Responsable</Label>
            <Select
              name="responsableId"
              defaultValue={magasin?.responsableId ?? "AUCUN"}
            >
              <SelectTrigger id="responsableId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUCUN">Aucun (à pourvoir)</SelectItem>
                {candidatsResponsable.map((c) => {
                  const nomComplet = [c.prenom, c.nom]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {nomComplet || c.email}
                      <span className="text-xs text-muted-foreground">
                        {c.email}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {erreurs.responsableId && (
              <p className="text-xs text-destructive">{erreurs.responsableId}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Seuls les utilisateurs avec le rôle « Responsable magasin » non
              déjà affectés ailleurs apparaissent ici.
            </p>
          </div>
        </CardContent>
      </Card>

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
              {enEdition ? "Enregistrer les modifications" : "Créer le magasin"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Champ générique avec libellé + erreur ──────────────────────────────

type ChampProps = {
  id: string;
  libelle: string;
  erreur?: string;
  description?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Champ({
  id,
  libelle,
  erreur,
  description,
  required,
  ...rest
}: ChampProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {libelle}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={id} name={id} required={required} aria-invalid={!!erreur} {...rest} />
      {description && !erreur && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
    </div>
  );
}
