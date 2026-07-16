# MinyanStreet iOS — Build & Submit

Ce guide est à exécuter **sur ton Mac** (Xcode requis). Tout le code web est déjà prêt — Capacitor enveloppe simplement l'app web publiée.

## Pré-requis Mac

1. **Xcode** (App Store, gratuit, ~15 Go)
2. **CocoaPods** : `sudo gem install cocoapods` (ou `brew install cocoapods`)
3. **Node 20+** et **Bun** (`curl -fsSL https://bun.sh/install | bash`)
4. **Compte Apple Developer** (https://developer.apple.com/programs/ — 99 $/an, validation ~48 h)

## Première installation

Dans le dossier du projet (cloné depuis Lovable) :

```bash
bun install
bunx cap add ios          # crée le dossier ios/
bunx cap sync ios         # installe les pods et copie le bridge
bunx cap open ios         # ouvre Xcode
```

Dans Xcode :

- Sélectionne le projet **App** dans la sidebar
- Onglet **Signing & Capabilities** → **Team** = ton équipe Apple Developer
- **Bundle Identifier** = `app.lovable.minyanstreet` (ou ce que tu veux, doit être unique)
- Onglet **Capabilities** → ajoute :
  - **Push Notifications**
  - **Sign In with Apple**

## Permissions iOS (Info.plist)

Xcode → `App/Info.plist` → ajoute (clic droit → Add Row) :

| Clé                                   | Valeur                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `NSLocationWhenInUseUsageDescription` | MinyanStreet uses your location to find minyanim happening within 1 km of you. |
| `NSCalendarsUsageDescription`         | Add scheduled minyanim to your calendar.                                       |

## Test

- **Simulateur** : ▶️ dans Xcode → choisis un iPhone simulé
- **Vrai iPhone** : branche-le en USB, sélectionne-le dans la barre Xcode, ▶️
  - Il faudra approuver le profil de dev sur le téléphone : Réglages → Général → VPN et gestion d'appareils

## Soumission App Store

1. Dans Xcode : **Product → Archive**
2. Bouton **Distribute App** → **App Store Connect** → Upload
3. https://appstoreconnect.apple.com → crée la fiche : titre, description, captures (6.7" et 6.5"), icône 1024×1024, politique de confidentialité (URL publique obligatoire)
4. Soumets pour review (≈ 24-48 h)

## Mise à jour ultérieure

Tant que tu modifies seulement le code web/UI, **pas besoin de re-soumettre l'app iOS** : `capacitor.config.ts` pointe vers `global-minyan-connect.lovable.app`, l'app va charger les dernières modifs au prochain lancement. Re-soumets seulement si tu ajoutes de nouveaux plugins natifs ou changes les permissions.

```bash
bunx cap sync ios   # à relancer seulement si tu ajoutes des plugins natifs
```

## Assets prêts ✅

J'ai généré pour toi (dans `/mnt/documents/` du sandbox — récupère-les via "Files" dans Lovable) :

- **Icône 1024×1024** → `app-icon-1024.png` (étoile de David dorée sur navy)
- **Splash 2732×2732** → `splash-2732.png` (à recentrer/cropper sur Mac si besoin)

Encore à faire toi-même :

- 3-10 **captures** par taille (6.7" = 1290×2796, 6.5" = 1242×2688) — fais-les depuis le simulateur Xcode
- Adapte l'icône/splash dans Xcode via **App/Assets.xcassets** (AppIcon + Splash)

## Privacy Policy URL ✅

Obligatoire pour soumettre à l'App Store. La page est déjà en ligne :

- **https://global-minyan-connect.lovable.app/privacy** (multilingue EN/FR/ES/HE)

Colle cette URL dans App Store Connect → Politique de confidentialité.

## Multilingue 🌍

L'app gère déjà 4 langues (anglais par défaut, français, espagnol, hébreu avec RTL). Pour le store, soumets la fiche en anglais d'abord, puis ajoute les localisations (FR/ES/HE) avec titre + description + mots-clés traduits dans App Store Connect.
