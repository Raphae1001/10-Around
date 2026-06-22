## Translations (anglais, français, espagnol, hébreu)

Pages déjà traduites : auth, home, settings, BottomNav, create (partiel)

**Pages à traduire (~1800 lignes UI) :**
- `create.tsx` — compléter les chaînes restantes
- `profile.tsx` — déjà ~50% via clés existantes, finir
- `onboarding.tsx` — flow d'accueil
- `notifications.tsx`
- `share.tsx`
- `success.tsx`
- `map.tsx`
- `travel.tsx` + `traveler.tsx` + `flight.tsx`
- `minyan.tsx` (détail)
- `kaddish.tsx`, `shabbat.tsx`, `siddur.tsx`, `synagogue.tsx`, `trust.tsx`, `backup.tsx`
- `ConfirmationPrompt.tsx`

**Méthode :**
1. Étendre `en.json` avec toutes les nouvelles clés groupées par page
2. Générer `fr.json`, `es.json`, `he.json` en miroir (traductions natives, RTL pour hébreu déjà géré dans `__root.tsx`)
3. Remplacer les chaînes en dur par `t("page.key")` dans chaque route

**Hébreu (RTL) :** classes Tailwind utilisent déjà `text-start/end`, vérifier sur 2-3 pages.

---

## Build iOS — état actuel

Le guide `IOS_BUILD.md` à la racine est **complet et prêt** :
- Prérequis Mac (Xcode, CocoaPods, compte Apple Developer 99 $/an)
- `bunx cap add ios && bunx cap sync ios && bunx cap open ios`
- Bundle ID, signing, capabilities (Push, Sign in with Apple)
- Permissions Info.plist (localisation, calendrier)
- Archive → Distribute → App Store Connect
- Assets requis (icône 1024, splash 2732, captures, privacy URL)

`capacitor.config.ts` pointe déjà vers `global-minyan-connect.lovable.app` → mises à jour web sans re-soumission.

**Ce que je peux faire ici (sandbox Linux) :**
- Générer l'icône 1024×1024 et le splash 2732×2732
- Préparer une page Privacy Policy publique (route `/privacy`) — obligatoire pour App Store
- Vérifier `capacitor.config.ts` et permissions

**Ce que tu dois faire sur ton Mac :**
- Tout ce qui touche Xcode (le sandbox ne peut pas builder iOS)
- Compte Apple Developer
- Upload App Store Connect

---

## Ordre d'exécution proposé

1. Traductions complètes (4 langues × pages restantes)
2. Génération icône + splash
3. Création page `/privacy` (Privacy Policy)
4. Tu fais les étapes Xcode sur ton Mac en suivant `IOS_BUILD.md`

Je commence ?
