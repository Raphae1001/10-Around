# Plan — V1 utilisable + préparation App Store iOS

## Objectif

Transformer le prototype actuel (100% local, données factices) en une vraie application :
- Données partagées en live entre tous les utilisateurs
- Géolocalisation réelle (filtrer les minyanim dans 1 km autour de l'utilisateur)
- Notifications push sur le téléphone
- Ajout au calendrier iOS d'un minyan programmé
- Emballage iOS prêt à être ouvert dans Xcode pour soumission App Store

Tu vas continuer à itérer sur le design web dans Lovable ; chaque changement sera ensuite synchronisé dans l'app iOS via une commande.

---

## Étape 1 — Backend live (Lovable Cloud)

Activation de Lovable Cloud (base de données Postgres + auth + notifications, intégré, zéro setup).

**Authentification** : Email + Google + Sign in with Apple (obligatoire Apple pour l'App Store dès qu'il y a d'autres logins sociaux).

**Tables créées** :
- `profiles` — nom affiché, photo, langue
- `minyanim` — créateur, type (street/airport/hotel/travel), localisation (lat/lng + adresse), date début/fin, heure programmée (pour hotel/travel), nusach, compteur de présents, message
- `minyan_participants` — qui a rejoint quel minyan
- RLS activée partout : un user voit tout en lecture, écrit seulement ses propres lignes

**Index géospatial** : recherche "minyanim dans 1 km autour de moi" via PostGIS.

## Étape 2 — Géolocalisation réelle

- Web : `navigator.geolocation` avec demande de permission
- iOS natif : plugin Capacitor Geolocation (plus précis, marche en arrière-plan si besoin)
- Page d'accueil affiche uniquement les minyanim Street/Airport dans 1 km
- Hotel/Travel s'affichent toujours (programmés à l'avance, peu importe la distance)
- Bouton « rafraîchir ma position »

## Étape 3 — Création d'un minyan branchée au backend

L'écran `create.tsx` existant envoie maintenant vraiment vers la base. La position GPS est capturée au moment du "Set live". Le compteur de présents devient temps-réel (subscriptions Supabase Realtime) : si quelqu'un rejoint, tout le monde voit le compteur monter en direct.

## Étape 4 — Notifications push

- iOS : plugin Capacitor PushNotifications → token enregistré dans la table `profiles`
- Notification envoyée quand : un minyan se crée près de toi (< 1 km), ou ton minyan atteint 10
- Web : notifications navigateur en fallback

## Étape 5 — Calendrier

Pour les minyanim Hotel/Travel avec date+heure programmées : bouton « Ajouter au calendrier » qui ouvre l'app Calendar iOS native (plugin Capacitor Calendar) ou télécharge un fichier `.ics` sur web.

## Étape 6 — Emballage iOS (Capacitor)

J'ajoute Capacitor au projet : `capacitor.config.ts`, dossier `ios/`, plugins (Geolocation, PushNotifications, LocalNotifications, Calendar, App, Haptics, StatusBar). Je te donne ensuite **3 commandes à lancer sur ton Mac** :

```text
git pull
npx cap sync ios
npx cap open ios
```

Ça ouvre Xcode avec ton app dedans. De là tu testes sur simulateur, puis sur ton iPhone branché, puis tu soumets à TestFlight quand tu auras le compte Apple Developer (99 $/an, à créer sur developer.apple.com).

## Étape 7 — Prêt pour soumission App Store

Je prépare aussi : icône d'app (1024×1024), splash screen, captures pour l'App Store, fichier `Info.plist` avec les bons textes de permission ("Minyan utilise votre position pour trouver des prières près de vous"), politique de confidentialité minimale (page web obligatoire pour l'App Store).

---

## Ordre d'implémentation

1. Cloud + auth Apple/Google/Email + tables + RLS — **je le fais maintenant si tu valides**
2. Géoloc + lecture live des minyanim sur la carte/liste
3. Création de minyan branchée backend + realtime
4. Capacitor + plugins natifs (GPS, push, calendrier)
5. Assets iOS (icône, splash, captures) + Info.plist + page privacy
6. Tu lances `npx cap open ios` sur ton Mac, on debug ensemble

---

## Ce que tu dois faire en parallèle (pendant que je code)

1. **Créer le compte Apple Developer** sur https://developer.apple.com/programs/ (99 $/an, ~48h de validation) — sans ça, impossible de soumettre
2. **Installer Xcode** depuis le Mac App Store si pas déjà fait (gratuit, ~15 Go)
3. Préparer un nom définitif d'app + description courte pour l'App Store

---

## Détails techniques (pour info)

- Stack : TanStack Start (déjà en place) + Lovable Cloud (Supabase managé) + Capacitor 6 pour iOS
- Realtime via Supabase Channels pour le compteur de présents
- PostGIS `ST_DWithin` pour la requête "dans 1 km"
- Push via APNs (Apple Push) — config via certificats dans Apple Developer Console
- Le code web et iOS partagent 100% du code React ; Capacitor wrappe simplement la web view

Dis "go" et j'enchaîne avec l'étape 1 (activation Cloud + auth + schéma DB).