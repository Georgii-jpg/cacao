# Déploiement SOCOPAD — Vercel + Supabase

Procédure pas à pas pour mettre l'application en ligne. Compter **30 à 60 minutes** la première fois.

---

## 1. Créer la base de données Supabase

1. Aller sur [supabase.com](https://supabase.com) et créer un compte (gratuit jusqu'à 500 Mo de DB).
2. **New project** :
   - Name : `socopad`
   - Region : **AWS Paris (eu-west-3)** ou **AWS Dublin (eu-west-1)** — proche de la Côte d'Ivoire pour minimiser la latence.
   - Database password : générer un mot de passe fort et le **conserver**.
3. Attendre 1–2 min que le projet soit provisionné.
4. **Project Settings → Database → Connection string → Connection pooling** :
   - Mode : `Transaction`
   - Copier l'URI (port `6543`).
   - Remplacer `[YOUR-PASSWORD]` par le mot de passe choisi à l'étape 2.
   - Ajouter à la fin : `?pgbouncer=true&connection_limit=1`

   Exemple final :
   ```
   postgres://postgres.abcdef:VotreMotDePasse@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

---

## 2. Basculer le projet en mode PostgreSQL (en local d'abord)

> Cette étape passe le code en Postgres et applique les migrations sur Supabase. À faire **une seule fois**.

```powershell
cd C:\dev\socopad-app

# 1. Sauvegarder le schéma SQLite
Move-Item prisma\schema.prisma prisma\schema.sqlite.prisma

# 2. Activer le schéma Postgres
Move-Item prisma\schema.postgres.prisma prisma\schema.prisma

# 3. Définir DATABASE_URL vers Supabase (uniquement pour la session)
$env:DATABASE_URL = "postgres://postgres.xxx:VotreMotDePasse@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# 4. Créer et appliquer la migration initiale
npx prisma migrate dev --name init_postgres

# 5. Générer le client Prisma
npx prisma generate

# 6. Charger les données fictives (régions, magasins, comptes, 30 j d'historique)
npm run db:seed
```

> ⚠️ **Pour les migrations futures**, utiliser `prisma migrate deploy` (et non `dev`) — elle ne crée pas de nouvelles migrations, elle applique celles déjà commitées.

À ce stade, le projet est connecté à Supabase. Vous pouvez vérifier dans Supabase **Table Editor** que les tables `regions`, `magasins`, `users`, etc. sont remplies.

---

## 3. Préparer le code pour Vercel

```powershell
# Installer Git si ce n'est pas déjà fait : https://git-scm.com/download/win
git init
git add .
git commit -m "MVP SOCOPAD prêt pour déploiement"
```

Créer un repo GitHub (depuis github.com, bouton **New repository**) et y pousser :

```powershell
git remote add origin https://github.com/<votre-user>/cacao.git
git branch -M main
git push -u origin main
```

---

## 4. Déployer sur Vercel

1. Aller sur [vercel.com](https://vercel.com) et se connecter avec GitHub (gratuit).
2. **Add New → Project → Import Git Repository → cacao**.
3. Framework preset : **Next.js** (détecté automatiquement).
4. **Environment Variables** — ajouter :

   | Nom                       | Valeur                                                        |
   |---------------------------|---------------------------------------------------------------|
   | `DATABASE_URL`            | URL Supabase (port 6543, avec `?pgbouncer=true&connection_limit=1`) |
   | `AUTH_SECRET`             | `openssl rand -base64 32` ou via Node (cf. `.env.example`)    |
   | `AUTH_URL`                | `https://cacao.vercel.app` (URL exacte fournie par Vercel)    |
   | `NEXT_PUBLIC_APP_NAME`    | `SOCOPAD`                                                     |
   | `NEXT_PUBLIC_APP_LOCALE`  | `fr-CI`                                                       |

5. **Deploy**. Compter 2–3 min.

Une fois déployé, votre app est accessible sur `https://cacao.vercel.app` (ou un nom proche selon disponibilité).

> 🔒 **Important** : changer immédiatement les mots de passe par défaut des comptes seedés (`Admin#2026`, etc.) via la page `/utilisateurs`. Le compte `admin@socopad.ci` ne doit **jamais** rester avec son MDP de seed en production.

---

## 5. Domaine personnalisé (optionnel)

Dans Vercel **Project Settings → Domains** :
1. Ajouter votre domaine (ex : `gestion.socopad.ci`).
2. Suivre les instructions DNS (CNAME ou A record) chez votre registrar.
3. Mettre à jour `AUTH_URL` dans les env vars Vercel pour pointer vers le nouveau domaine.
4. Redéployer.

---

## 6. Maintenance & migrations futures

### Modifier le schéma de données
```powershell
# Modifier prisma/schema.prisma puis
npx prisma migrate dev --name nom_explicite_de_la_modif
git add . && git commit -m "Migration: ..." && git push
```
Vercel redéploie automatiquement à chaque push. **Mais les migrations ne sont PAS appliquées automatiquement** sur Supabase — il faut le faire manuellement avant de pusher :

```powershell
$env:DATABASE_URL = "postgres://..."
npx prisma migrate deploy
```

> 💡 Pour automatiser cela, ajouter `prisma migrate deploy &&` au début du script `build` dans `package.json` — mais attention : si la migration échoue, le déploiement échoue aussi.

### Sauvegardes
Supabase fait des sauvegardes quotidiennes automatiques sur le plan Free (7 jours de rétention). Pour des sauvegardes plus fréquentes, passer au plan Pro ou exporter manuellement via `pg_dump`.

### Logs & monitoring
- **Vercel** : `Deployments → [deployment] → Logs`
- **Supabase** : `Logs → Postgres / Auth / Realtime`
- **App** : audit log consultable en SQL via Supabase Studio (`SELECT * FROM audit_logs ORDER BY "createdAt" DESC LIMIT 100;`)

---

## 7. Checklist de mise en production

- [ ] `DATABASE_URL` Supabase configurée (port 6543 + pgbouncer)
- [ ] `AUTH_SECRET` régénéré (32 bytes minimum)
- [ ] `AUTH_URL` correspond au domaine de prod
- [ ] Schema Postgres en place (`prisma/schema.prisma` ≈ ancien `schema.postgres.prisma`)
- [ ] Migrations appliquées sur Supabase (`prisma migrate deploy`)
- [ ] Seed exécuté **une seule fois** (sinon dédupliquer)
- [ ] Mot de passe admin changé après première connexion
- [ ] Mots de passe seedés (`Admin#2026`, `Manager#2026`, `Magasin#2026`) **tous remplacés**
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Sauvegardes Supabase activées (par défaut sur Free)

---

## Coût estimé

| Service     | Plan       | Coût           |
|-------------|------------|----------------|
| Vercel      | Hobby      | **Gratuit** jusqu'à 100 GB de bande passante/mois |
| Supabase    | Free       | **Gratuit** jusqu'à 500 Mo DB + 5 Go bande passante |
| **Total MVP** |          | **0 €/mois**   |

Quand passer au payant (≈ 25 $/mois Supabase Pro) : à partir de 10 utilisateurs actifs avec saisie quotidienne (≈ 9 000 fiches/an) ou si besoin de sauvegardes < 7 jours, support prioritaire, taille DB > 500 Mo.
