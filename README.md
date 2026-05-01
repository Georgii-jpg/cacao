# SOCOPAD — Application de Gestion Opérationnelle

Plateforme web interne pour la centralisation des stocks de cacao et le pilotage des 25 points de vente du réseau SOCOPAD (Côte d'Ivoire).

> **Statut** : Itération 1 — Fondations posées (Next.js 16 + Prisma 7 + shadcn/ui + charte cacao). Modules métier en cours.

---

## 🎯 Objectifs

1. Permettre aux 25 magasins de remonter leurs données de stocks (mobile-first).
2. Donner à la direction un tableau de bord centralisé temps réel.
3. Servir de socle évolutif pour les modules futurs (achats, ventes, logistique, qualité, finance, RH).

## 🛠️ Stack technique

| Couche             | Technologie                            |
| ------------------ | -------------------------------------- |
| Framework          | Next.js 16 (App Router) + React 19     |
| Langage            | TypeScript 5                           |
| Style              | Tailwind CSS 4 + shadcn/ui (Base UI)   |
| ORM                | Prisma 7 (client ESM)                  |
| Base de données    | SQLite (dev) → PostgreSQL/Supabase (prod) |
| Authentification   | NextAuth.js v5 (Auth.js)               |
| Validation         | Zod                                    |
| Visualisation      | Recharts                               |
| Formulaires        | React Hook Form                        |

## 📁 Architecture

Découpage **feature-based** pour faciliter l'ajout de modules métier au fil du temps.

```
app/
  (auth)/              → routes publiques (connexion, inscription)
    connexion/
  (dashboard)/         → routes protégées par NextAuth
    dashboard/         → vue centralisée des KPIs
    stocks/            → module stocks (saisie, validation, historique)
    magasins/          → CRUD des 25 points de vente
    utilisateurs/      → gestion des comptes
    rapports/          → exports & analyses
    parametres/        → configuration
  api/                 → routes API (NextAuth, endpoints métier)
  generated/prisma/    → client Prisma généré (gitignored)
components/
  ui/                  → primitives shadcn (button, card, input…)
  layout/              → en-tête, sidebar, navigation
  dashboard/           → graphiques et widgets KPI
  stocks/              → formulaires et tables stocks
  magasins/            → composants spécifiques magasins
lib/
  auth/                → config NextAuth, helpers requireRole
  db/                  → singleton Prisma client
  stocks/              → logique métier stocks
  magasins/            → logique métier magasins
  validations/         → schémas Zod partagés client/serveur
  utils/               → formatage (FCFA, kg, dates FR)
prisma/
  schema.prisma        → schéma de données
  migrations/          → migrations
  seed.ts              → jeu de données fictives
types/                 → types TypeScript transverses
```

## 🚀 Installation

### Prérequis

- **Node.js ≥ 20** (ce projet est testé avec Node 24)
- **npm** (livré avec Node)
- (optionnel) **Git** pour le versioning

### Installation locale

```powershell
# 1. Installer les dépendances (~2 min)
npm install

# 2. Copier le fichier d'environnement
Copy-Item .env.example .env
#   Puis éditer .env si besoin (le default convient pour SQLite local)

# 3. Générer le client Prisma + créer la base SQLite + appliquer le schéma
npm run db:push

# 4. (à venir Itération 2) Charger les données de seed
npm run db:seed

# 5. Lancer le serveur de développement
npm run dev
```

L'application est accessible sur **http://localhost:3000**.

## 🔐 Variables d'environnement

| Variable                  | Description                                | Exemple                   |
| ------------------------- | ------------------------------------------ | ------------------------- |
| `DATABASE_URL`            | Chaîne de connexion à la base              | `file:./dev.db`           |
| `AUTH_SECRET`             | Secret NextAuth (à générer en prod)        | `openssl rand -base64 32` |
| `AUTH_URL`                | URL canonique de l'app                     | `http://localhost:3000`   |
| `NEXT_PUBLIC_APP_NAME`    | Nom affiché dans l'UI                      | `SOCOPAD`                 |
| `NEXT_PUBLIC_APP_LOCALE`  | Locale par défaut                          | `fr-CI`                   |

Voir `.env.example` pour le détail.

## 👥 Rôles & permissions

| Rôle                  | Périmètre                                                   |
| --------------------- | ----------------------------------------------------------- |
| `ADMIN`               | Accès total sur tout le réseau                              |
| `MANAGER_REGIONAL`    | Vue + validation sur les magasins de sa région              |
| `RESPONSABLE_MAGASIN` | Saisie + validation sur SON magasin uniquement              |
| `OPERATEUR_SAISIE`    | Saisie uniquement (pas de validation)                       |

## 🧪 Comptes de test (après seed — Itération 2)

| Email                    | Mot de passe   | Rôle               |
| ------------------------ | -------------- | ------------------ |
| `admin@socopad.ci`       | `Admin#2026`   | ADMIN              |
| `manager.sud@socopad.ci` | `Manager#2026` | MANAGER_REGIONAL   |
| `mag.abidjan@socopad.ci` | `Magasin#2026` | RESPONSABLE_MAGASIN |

## 📜 Scripts npm

| Script              | Action                                            |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Serveur de développement                          |
| `npm run build`     | Build de production                               |
| `npm run start`     | Lancer le serveur de production                   |
| `npm run lint`      | Vérification ESLint                               |
| `npm run db:push`   | Pousse le schéma Prisma vers la base + génère client |
| `npm run db:migrate` | Crée et applique une migration                   |
| `npm run db:seed`   | Charge les données fictives                       |
| `npm run db:studio` | Ouvre Prisma Studio (UI base de données)          |

## 🗺️ Roadmap MVP

- [x] Itération 1 — Fondations (Next.js, Prisma, shadcn, charte cacao)
- [ ] Itération 2 — Schéma Prisma complet + seed
- [ ] Itération 3 — Auth NextAuth + RBAC
- [ ] Itération 4 — Module Magasins (CRUD)
- [ ] Itération 5 — Module Stocks (saisie, validation, historique)
- [ ] Itération 6 — Dashboard centralisé
- [ ] Itération 7 — Rapports, exports, tests

## 📝 Charte graphique

- **Primary** (cacao) : brun chocolat profond — `oklch(0.36 0.07 45)`
- **Accent** (doré) : or fève — `oklch(0.82 0.13 80)`
- **Background** : crème — `oklch(0.985 0.008 75)`
- **Police** : Inter (Google Fonts)

## 🚧 Évolutions prévues

- Achats producteurs / Coopératives
- Ventes & clients (locaux + export)
- Logistique & transport inter-magasins
- Qualité & certifications (UTZ, Rainforest, Bio)
- Finance & trésorerie par magasin
- RH & paie
- Application mobile React Native
- API publique pour partenaires
- Prévisions de stock par IA & détection d'anomalies

## 📦 Déploiement (cible)

- **Vercel** pour l'app Next.js
- **Supabase** pour PostgreSQL managé
- Variables d'environnement à configurer côté Vercel : `DATABASE_URL` (Postgres), `AUTH_SECRET`, `AUTH_URL` (URL prod).

---

© SOCOPAD — Application interne, usage réservé.
