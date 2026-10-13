# 10 Around

Trouver ou lancer un minyan autour de soi, en temps réel. Application mobile native (iOS/Android via Capacitor) + web, avec carte de densité floutée respectueuse de la vie privée.

Nom de code interne : `minyannow` (package, bundle ID, projet Supabase).

---

## 1. Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React + TypeScript + Vite |
| Routing | TanStack Router (+ TanStack Start pour le SSR web) |
| UI | Tailwind CSS, composants maison, lucide-react |
| i18n | i18next — 14 langues (en, fr, he, es, ru, pt, de, it, yi, ar, nl, pl, uk, ro) |
| Cartes | Google Maps (`@vis.gl/react-google-maps`) + MarkerClusterer |
| Backend | Supabase (Postgres + RLS, Realtime, Edge Functions, Auth anonyme) |
| Mobile | Capacitor 8 (iOS + Android) |
| Web hosting | Vercel (SSR/Nitro) |

Deux cibles de build distinctes :
- **Web** : `npm run build` → sortie SSR Nitro (`.vercel/output`).
- **Mobile** : `npm run build:mobile` → SPA statique dans `dist-mobile/` (chargée par Capacitor depuis le disque, **pas** de `server.url` — conformité Apple 4.2).

---

## 2. Prérequis

- Node 18+ et npm
- Compte Supabase (projet lié)
- Clé Google Maps (GCP)
- Pour iOS : macOS + **Xcode** (App Store) + un Apple ID
- Pour Android : Android Studio + JDK

---

## 3. Configuration (.env)

`.env` **n'est pas versionné** (voir `.gitignore`). Copier `.env.example` → `.env` et remplir :

```bash
# Supabase
SUPABASE_PROJECT_ID=...
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...        # serveur uniquement (edge/SSR)
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# URL web de prod (share links, proxy server-fn)
VITE_APP_URL=https://<ton-app>.vercel.app

# Google Maps (clé navigateur GCP)
VITE_GOOGLE_MAPS_BROWSER_KEY=...
VITE_GOOGLE_MAPS_TRACKING_ID=...
```

> La clé `VITE_GOOGLE_MAPS_BROWSER_KEY` est publique par nature (embarquée dans le bundle). Restreindre par referrer HTTP / bundle ID côté GCP.
> `SUPABASE_SERVICE_ROLE_KEY` est **secrète** — ne jamais l'exposer côté client.

---

## 4. Développement

```bash
npm install
npm run dev            # web sur http://localhost:5173
```

Lint / types :

```bash
npm run lint
npx tsc --noEmit
```

---

## 5. Base de données (Supabase)

Migrations dans `supabase/migrations/`. Appliquer sur le projet lié :

```bash
npx supabase db push --linked
```

Régénérer les types TS après changement de schéma :

```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Edge Functions dans `supabase/functions/` (ex. `delete-account`). Déployer :

```bash
npx supabase functions deploy delete-account
```

### Modèle de données clé
- `profiles`, `minyanim`, `minyan_participants`, `minyan_confirmations`
- `member_presence` (zone geohash ~1 km, jamais de GPS exact stocké)
- `chat_threads` / `chat_thread_members` / `chat_messages`
- `content_reports` (signalement UGC)
- `user_push_tokens`, `app_config`, `travel_presence` (legacy, vide)

RLS activée sur toutes les tables. Les comptages géo passent par des RPC `SECURITY DEFINER` avec `search_path` fixé.

### Règles produit importantes
- **Création street** : bloquée s'il existe déjà un minyan street < 200 m au même créneau.
- **Carte /home** : minyanim `street` + `scheduled` (uniquement à ±30 min de l'heure) dans un rayon de ~5 km.
- **Liste tiroir** : ~1 km.
- **stay** (séjours) : jamais sur la carte, uniquement dans Planifié.

---

## 6. Build & déploiement

### 6.1 Web (Vercel)
```bash
npm run build
```
Déploiement via l'intégration Vercel (branche `main`). Vérifier les variables d'env sur Vercel.
Le fichier `public/.well-known/apple-app-site-association` doit être servi en HTTPS pour les Universal Links iOS.

### 6.2 iOS
```bash
# 1. Xcode installé + sélectionné :
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# 2. Build web mobile + sync + ouverture Xcode
npm run cap:ios
```
Dans Xcode :
- Target **App** → Signing & Capabilities → **Team** (Apple ID)
- Bundle ID : `com.raphaelkalfon.minyannow`
- Team ID : `44BUT87LCH`
- Choisir un simulateur ou un iPhone physique → ▶ Run

Un **Apple ID gratuit** suffit pour installer sur son propre iPhone (dev). Un **compte Apple Developer payant (99 $/an)** est requis pour TestFlight, push notifications réelles et l'App Store.

### 6.3 Android
```bash
npm run cap:android
```
Ouvre Android Studio. `applicationId` : `com.raphaelkalfon.minyannow`.

---

## 7. Conformité stores

### iOS — statut
| Point | Statut |
|-------|--------|
| Pas de website wrapper (pas de `server.url`) | OK |
| `NSLocationWhenInUseUsageDescription` explicite | OK |
| Modale d'explication avant permission | OK (`LocationPrimerDialog`) |
| Deployment target | iOS 15.0 |
| Bundle ID + Team ID | OK (`com.raphaelkalfon.minyannow` / `44BUT87LCH`) |
| Universal Links (AASA) | OK (Team ID réel) — nécessite domaine déployé |
| Suppression de compte in-app | OK (Settings → Delete + edge `delete-account`) |
| UGC : signalement de messages | OK (`content_reports`, flag in-app) |
| Auth | Anonyme (nom d'affichage) → Sign in with Apple non requis (pas de login social tiers) |
| Politique de confidentialité / CGU | OK (`/privacy`, `/terms`, accès sans auth) |
| SDK iOS exigé à la soumission | À VÉRIFIER au moment de l'upload (dépend de la version Xcode) |

### Android — statut
| Point | Statut |
|-------|--------|
| `applicationId` | OK |
| App Links (`assetlinks.json`) | **À FAIRE** — empreintes SHA-256 encore en placeholder |

---

## 8. Checklist avant soumission App Store

À la charge du développeur (hors code) :
- [ ] Souscrire au **Apple Developer Program** (99 $/an)
- [ ] Installer **Xcode** + `xcode-select`
- [ ] Archiver le build et l'uploader vers App Store Connect
- [ ] **Review Notes** : préciser que l'auth est anonyme (ouvrir l'app → saisir Prénom/Nom → Continue)
- [ ] **App Privacy Labels** (voir §9)
- [ ] Captures d'écran par taille d'appareil, icône, description, mots-clés
- [ ] Catégorie suggérée : **Lifestyle** (ou Social Networking)
- [ ] Redéployer Vercel pour l'AASA en production
- [ ] (Android) Renseigner les vraies empreintes dans `assetlinks.json`

---

## 9. Données collectées (App Privacy Labels)

| Donnée | Usage |
|--------|--------|
| Nom d'affichage (+ avatar optionnel) | Compte |
| Identifiant de compte anonyme | Compte |
| Position (à l'usage) | Carte / création |
| Zone de présence floutée (~1 km geohash) | Densité — pas de GPS exact stocké |
| Minyanim créés / participations | Fonctionnalité cœur |
| Messages de chat | Coordination (UGC) |
| Token push | Notifications (à venir) |
| Analytics (GA4 / Clarity) | Opt-in, anonymisé |

Contact : `support@minyannowapp.com`.

---

## 10. État connu / dette technique

- `tsc --noEmit` : ~8 erreurs de search-params TanStack Router (non bloquantes pour les builds Vite/Capacitor).
- Notifications push : UI en « coming soon » (toggles désactivés, prefs locales) — livraison réelle après compte Apple payant + OneSignal.
- Chunk JS principal ~1 Mo (candidat à `manualChunks`, non bloquant).
- `travel_presence` conservée vide (drop après validation).
- Routes legacy (siddur, kaddish, shabbat, flight, travel, traveler, map, maps-test, synagogue) masquées via `LEGACY_SCREENS_ENABLED = false` (redirigent vers `/home`).

---

## 11. Structure du projet

```
src/
  routes/           # écrans (TanStack Router file-based)
  components/        # UI partagée (GoogleMap, HomePresenceCard, ...)
  hooks/             # use-minyanim, use-density, use-presence, ...
  lib/               # geo, haptics, map-styles, feature-flags, ...
  i18n/locales/      # 14 langues
  integrations/supabase/
supabase/
  migrations/        # schéma SQL versionné
  functions/         # edge functions (delete-account)
ios/ android/        # projets natifs Capacitor
dist-mobile/         # build SPA pour Capacitor (généré)
```

---

## 12. Scripts npm

| Script | Rôle |
|--------|------|
| `npm run dev` | Serveur de dev web |
| `npm run build` | Build web SSR (Vercel) |
| `npm run build:mobile` | Build SPA pour Capacitor (`dist-mobile/`) |
| `npm run cap:sync` | build:mobile + `cap sync` |
| `npm run cap:ios` | build:mobile + sync + ouvre Xcode |
| `npm run cap:android` | build:mobile + sync + ouvre Android Studio |
| `npm run lint` | ESLint |

---

## 13. Documents complémentaires

- `NATIVE_SETUP.md` — mise en place native détaillée
- `IOS_BUILD.md`, `IOS_READINESS.md`, `TESTFLIGHT_GUIDE.md`
- `ANDROID_READINESS.md`
- `STORE_COMPLIANCE.md`
