# Déploiement sur Railway

Procédure rapide pour mettre SOCOPAD en ligne sur [Railway](https://railway.com).
Compter **15-20 min** la première fois (vs 30-60 min pour Vercel + Supabase).

> **Avantage Railway** : l'app Next.js et la base Postgres tournent sur la même
> plateforme avec une seule facturation (~5 $/mois pour le plan Hobby).

---

## 1. Créer le projet sur Railway

1. Aller sur [railway.com](https://railway.com) (compte connecté à GitHub).
2. **+ New Project → Deploy from GitHub repo → Georgii-jpg/cacao**.
3. Railway lance un premier build qui **va échouer** (DB pas encore là). C'est normal.

## 2. Ajouter la base PostgreSQL

1. Dans le projet, cliquer **+ Create → Database → Add PostgreSQL**.
2. Railway provisionne un Postgres et expose une variable `DATABASE_URL` *interne* au projet.
3. Sur le service **app** (Next.js), aller dans l'onglet **Variables** :
   - Cliquer **+ New Variable → Add Reference**
   - Variable : `DATABASE_URL` → référencer `${{Postgres.DATABASE_URL}}` *(autocompletion)*

## 3. Définir les autres variables d'environnement

Dans le service **app**, onglet **Variables**, ajouter :

| Nom                       | Valeur                                                              |
|---------------------------|---------------------------------------------------------------------|
| `AUTH_SECRET`             | Générer 32 octets random : `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL`                | `https://<nom-du-service>.up.railway.app` (Railway le génère après step 4) — temporaire jusqu'au domaine custom |
| `NEXT_PUBLIC_APP_NAME`    | `SOCOPAD`                                                           |
| `NEXT_PUBLIC_APP_LOCALE`  | `fr-CI`                                                             |

> 💡 `DATABASE_URL` est **déjà** définie via la référence du step 2 — ne pas la dupliquer.

## 4. Exposer le service sur le web

1. Service **app** → onglet **Settings → Networking → Generate Domain**.
2. Railway génère une URL `https://cacao-production-xxxx.up.railway.app`.
3. Mettre à jour `AUTH_URL` avec cette URL exacte.
4. Le service redémarre automatiquement.

## 5. Appliquer le schéma à la base Postgres (une seule fois)

Récupérer la `DATABASE_URL` **publique** : sur le service Postgres → **Variables** → copier `DATABASE_PUBLIC_URL` (celle accessible depuis ta machine).

Depuis ton poste local :

```powershell
cd C:\dev\socopad-app

$env:DATABASE_URL = "postgres://...DATABASE_PUBLIC_URL..."

# Pousse le schéma vers Postgres (crée toutes les tables)
npm run db:push:postgres

# Charge les données fictives (5 régions, 25 magasins, comptes seedés, 30 j d'historique)
$env:DATABASE_URL = "postgres://..."   # même URL
npm run db:seed
```

Vérification : dans Railway, ouvrir le service Postgres → **Data** → tu dois voir les tables remplies.

## 6. Domaine personnalisé `socopad.com`

1. Service **app** → **Settings → Networking → + Custom Domain**.
2. Saisir `socopad.com` et `www.socopad.com`.
3. Railway donne 2 enregistrements DNS à configurer chez le registrar du domaine :
   - `socopad.com` → **A** ou **ALIAS** vers l'IP/host fourni
   - `www.socopad.com` → **CNAME** vers le host fourni
4. Mettre à jour la variable `AUTH_URL` du service app : `https://socopad.com`
5. Attendre la propagation DNS (5 min à 1 h selon le registrar). Railway génère automatiquement un certificat SSL Let's Encrypt.

---

## ⚠️ Sécurité — à faire après le premier déploiement

**Changer immédiatement les mots de passe seedés** :
1. Connexion sur https://socopad.com avec `admin@socopad.ci` / `Admin#2026`
2. Aller sur **/profil** → changer son mot de passe
3. Aller sur **/utilisateurs** → pour chaque compte (manager + responsables magasin), cliquer **Réinitialiser le mot de passe** et générer un MDP fort, puis le communiquer hors-bande à la personne concernée.

---

## Maintenance

### Modifier le schéma de données

```powershell
# 1. Modifier prisma/schema.postgres.prisma  (ne pas toucher schema.prisma SQLite si tu veux garder le dev local)
# 2. Pousser le changement sur Postgres prod :
$env:DATABASE_URL = "postgres://...DATABASE_PUBLIC_URL..."
npm run db:push:postgres

# 3. Commit + push GitHub → Railway redéploie automatiquement le code.
git add prisma/schema.postgres.prisma
git commit -m "schema: ajoute champ X au modèle Y"
git push
```

### Logs

Service **app** → onglet **Deployments** → cliquer sur le dernier deploy → **View logs**.

### Sauvegardes Postgres

Service **Postgres** → onglet **Settings → Backups** : Railway prend des snapshots quotidiens sur le plan Hobby (7 jours de rétention).

---

## Coût estimé

Plan Hobby Railway : **5 $/mois** (crédit inclus, suffit pour cette app + DB tant que l'usage reste raisonnable). Au-delà, facturation à l'usage CPU/RAM/network.
