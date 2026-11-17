# 🎬 Clap & Play

Indécis ? Clap & Play propose **3 films** selon ton **mood**, ton **temps libre** et tes **abonnements streaming**
(Netflix, Prime Video, Disney+, Canal+, Apple TV+, Max, Paramount+, MUBI), puis t'envoie sur **Letterboxd** pour le noter.

Avec un compte (connexion **Google**), les propositions s'adaptent à tes goûts : ton journal Letterboxd,
ton historique importé (CSV Letterboxd ou IMDb) et tes avis sur le site (« Déjà vu », « Vu & aimé », « Pas pour moi »).

Sans clé TMDB, le site tourne en **mode démo** avec un petit catalogue d'exemple.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplis les clés
npm run dev                  # http://localhost:3000
```

## Mise en ligne (tout est gratuit)

### 1. Clé TMDB (catalogues des plateformes)
1. Crée un compte sur https://www.themoviedb.org/signup
2. Va dans **Paramètres → API**, demande une clé (usage « Personnel / non commercial »).
3. Copie le **jeton d'accès en lecture** dans `TMDB_API_KEY`.

### 2. Supabase (comptes + base de données)
1. Crée un projet sur https://supabase.com (région Europe).
2. **SQL Editor** → colle le contenu de `supabase/schema.sql` → **Run**.
3. **Project Settings → API** : copie l'URL et la clé `anon`/publishable dans
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 3. Connexion Google
1. https://console.cloud.google.com → nouveau projet → **API et services → Écran de consentement OAuth** (Externe).
2. **Identifiants → Créer → ID client OAuth → Application Web**.
   - URI de redirection autorisée : `https://<ton-projet>.supabase.co/auth/v1/callback`
3. Dans Supabase : **Authentication → Sign In / Providers → Google** → active et colle l'ID client + le secret.
4. Dans Supabase : **Authentication → URL Configuration**
   - Site URL : `https://<ton-site>.vercel.app`
   - Redirect URLs : `https://<ton-site>.vercel.app/auth/callback` et `http://localhost:3000/auth/callback`

### 4. Vercel (hébergement)
1. Pousse le projet sur GitHub.
2. https://vercel.com → **Add New → Project** → importe le dépôt.
3. Ajoute les 3 variables d'environnement (étape 1 et 2) → **Deploy**.

## L'API

| Route | Rôle |
|---|---|
| `GET /api/recommendations?mood=rire&time=normal&providers=8,119` | 3 films (options : `count`, `exclude`) |
| `GET /api/options` | Moods, durées, plateformes |
| `GET /api/letterboxd/:tmdbId` | Redirige vers la page Letterboxd du film |
| `GET/PATCH /api/me/profile` | Profil et abonnements (connecté) |
| `POST /api/me/feedback` | « Déjà vu » / « Vu & aimé » / « Pas pour moi » |
| `POST /api/me/letterboxd` | Lie un pseudo Letterboxd et importe son journal (RSS public) |
| `POST /api/me/import` | Import d'un historique CSV (Letterboxd ou IMDb) |

**Moods** : `rire`, `adrenaline`, `amour`, `frissons`, `emotion`, `evasion`, `enquete`, `cocooning`, `curieux`
**Durées** : `court` (<1h30), `normal` (≤2h), `long` (≤2h30), `illimite`

## Limites à connaître
- **Letterboxd** n'a pas d'API publique : on ne peut pas publier une note automatiquement. Le site ouvre
  la page du film sur Letterboxd (en un clic) et lit le **flux RSS public** du membre (ses ~50 derniers films).
- Les disponibilités viennent de TMDB/JustWatch (région France) et peuvent avoir quelques jours de retard.
