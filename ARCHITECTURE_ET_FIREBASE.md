# BonKont – Architecture et impact des règles Firebase

Ce document décrit l’architecture de l’application BonKont et liste les fichiers impactés par les règles Firestore (lecture/écriture selon les collections).

---

## 1. Architecture de l’application BonKont

### 1.1 Vue d’ensemble

- **Frontend** : application React (Vite), SPA avec routage par hash (`#/dashboard`, `#event/{id}`, `#/join`, etc.).
- **Backend / persistance** : Firestore uniquement (pas de Firebase Functions pour la logique métier). Plan Spark : accès direct depuis le client.
- **Authentification** : gérée côté client (localStorage `bonkont-user`), pas d’Auth Firebase côté projet décrit ici.
- **Règle métier** : “BonKont fait les comptes” – partage d’événements, participants, transactions (contributions, dépenses), ajustements équitables, traçabilité.

### 1.2 Arborescence des dossiers (partie applicative)

```
BonKont/
├── firestore.rules          # Règles de sécurité Firestore (impactent tous les accès listés en §2)
├── firestore.indexes.json   # Index Firestore si besoin
├── src/
│   ├── main.jsx             # Point d’entrée React
│   ├── App.jsx              # Racine, routage hash, vues principales, migration transactions
│   ├── App.css
│   ├── index.css
│   │
│   ├── lib/                 # Config et utilitaires partagés
│   │   ├── firebase.js      # Init Firebase + Firestore (db), convertFirestoreDate, toFirestoreDate
│   │   ├── auth.js
│   │   ├── i18n.js
│   │   └── utils.js
│   │
│   ├── services/            # Couche d’accès données
│   │   ├── api.js           # Réexporte firestoreService (point d’entrée unique pour Firestore)
│   │   └── firestoreService.js  # Tous les appels Firestore (events, participants, joinRequests, transactions, notifications)
│   │
│   ├── store/               # État global (Zustand)
│   │   ├── eventStore.js    # Liste d’événements (persist localStorage), pas d’appel Firestore direct
│   │   ├── joinRequestsStore.js
│   │   └── transactionsStore.js  # Transactions en mémoire, alimenté par Firestore (listeners)
│   │
│   ├── hooks/
│   │   ├── useEventTransactions.js  # Abonnement Firestore transactions (listenEventTransactions)
│   │   ├── use-toast.js
│   │   └── usePublicPagesVersion.js
│   │
│   ├── utils/
│   │   ├── bonkontBalances.js   # Calculs soldes, contributions, ajustements (pas d’I/O Firestore)
│   │   ├── migrateLocalTransactions.js  # Migration localStorage → Firestore (addTransactionToFirestore)
│   │   └── publicPagesVersion.js
│   │
│   └── components/          # UI par domaine
│       ├── AuthDialog.jsx
│       ├── EventCreation.jsx    # Création événement → createEvent
│       ├── EventDashboard.jsx   # Liste événements (getEventsByOrganizer, getEventsByParticipant), findEventByCode
│       ├── EventJoin.jsx        # Rejoindre (findEventByCode, createJoinRequest, listenMyJoinRequest, checkParticipantAccess)
│       ├── EventManagement.jsx  # Gestion événement (findEventByCode, getEventById, getJoinRequests, updateJoinRequest, getTransactionsFromFirestore, onSnapshot participants)
│       ├── EventClosure.jsx     # Clôture (transactions via useEventTransactions)
│       ├── EventHistory.jsx     # Historique (getTransactionsFromFirestore)
│       ├── EventTicketScanner.jsx
│       ├── EventDashboardScanner.jsx
│       ├── TransactionManagement.jsx  # CRUD transactions + récap paiements (api transactions)
│       ├── CashPayment.jsx
│       ├── TesseractTest.jsx
│       ├── … (autres composants UI / pages légales / paramètres)
│       └── ui/               # Composants UI réutilisables (sans Firestore)
│
├── functions/               # Firebase Functions (si utilisé ailleurs, non utilisé pour Firestore dans ce doc)
└── …
```

### 1.3 Flux principaux

- **Entrée** : Home → Connexion (local) → Dashboard (événements organisateur + participant).
- **Événement** : Création (EventCreation → `createEvent`) → Code partagé → Invités (EventJoin → `findEventByCode`, `createJoinRequest`, `listenMyJoinRequest`) → Acceptation (EventManagement → `getJoinRequests`, `updateJoinRequest`).
- **Données partagées** : Participants et transactions sont la “vérité” Firestore ; EventManagement / TransactionManagement / EventClosure s’abonnent ou rechargent (sync, `listenEventTransactions`, `getTransactionsFromFirestore`).
- **Calculs** : `bonkontBalances.js` (getContributionToPot, computeBalances, etc.) utilise uniquement les données déjà chargées (event + transactions) ; aucun appel Firestore dans ce module.

---

## 2. Règles Firestore (résumé)

- **events** : `read: true`, `create/update/delete: true` (temporaire).
- **events/{eventId}/participants** : `read, create, update, delete: true`.
- **events/{eventId}/joinRequests** : `read, create, update, delete: true`.
- **events/{eventId}/transactions** : `read, write: true`.
- **notifications** : `read, create, update: true` (temporaire).
- **Par défaut** : `match /{document=**} { allow read, write: false; }`.

Tout fichier qui déclenche une lecture/écriture sur ces collections est **impacté** par ces règles (refus ou autorisation selon les règles déployées).

---

## 3. Fichiers impactés par les règles Firebase

Tout accès Firestore passe par `firebase.js` (db) et soit `firestoreService.js` directement, soit `api.js` (réexport). Les composants ou utilitaires qui appellent l’API Firestore (ou le service) sont donc soumis aux règles ci‑dessus.

### 3.1 Configuration et couche d’accès (indispensables)

| Fichier | Rôle | Collections / opérations concernées |
|--------|------|-------------------------------------|
| `src/lib/firebase.js` | Initialisation Firebase/Firestore (`db`), helpers dates | Aucune règle directement, mais tout accès Firestore dépend de ce module. |
| `src/services/firestoreService.js` | Tous les appels Firestore de l’app | **events** (read, create, update), **participants** (read, add, update), **joinRequests** (read, add, update, delete), **transactions** (add, get, listen, update, delete), **notifications** (create, read, update). |
| `src/services/api.js` | Réexport de firestoreService | Même périmètre que firestoreService (tous les appels sont soumis aux règles). |

### 3.2 Hooks et utilitaires

| Fichier | Rôle | Collections / opérations concernées |
|--------|------|-------------------------------------|
| `src/hooks/useEventTransactions.js` | Abonnement temps réel aux transactions d’un événement | **events/{eventId}/transactions** (read via `listenEventTransactions`). |
| `src/utils/migrateLocalTransactions.js` | Migration une fois : transactions localStorage → Firestore | **events/{eventId}/transactions** (write via `addTransactionToFirestore`). |

### 3.3 Store

| Fichier | Rôle | Impact règles |
|--------|------|----------------|
| `src/store/eventStore.js` | État des événements (Zustand + persist localStorage) | Aucun appel Firestore direct ; les données sont injectées par les composants qui appellent l’API. Indirectement impacté : si les règles bloquent des lectures, les événements ne se remplissent pas. |
| `src/store/transactionsStore.js` | État des transactions (mémoire, alimenté par Firestore) | Alimenté par `listenEventTransactions` et `setTransactionsForEvent` ; impacté par les règles sur **transactions**. |
| `src/store/joinRequestsStore.js` | État des demandes de participation | Pas d’appel Firestore direct dans ce fichier ; impact indirect via composants qui chargent les join requests. |

### 3.4 Composants (par ordre alphabétique)

| Fichier | Opérations Firestore utilisées (via api ou firestoreService) | Collections impactées |
|--------|----------------------------------------------------------------|------------------------|
| `src/App.jsx` | `addTransactionToFirestore` (migration), `findEventByCode`, `removeDuplicateParticipants` | **events**, **events/…/participants**, **events/…/transactions** |
| `src/components/CashPayment.jsx` | `updateParticipantInFirestore`, `updateEventInFirestore`, `addTransactionToFirestore` | **events**, **events/…/participants**, **events/…/transactions** |
| `src/components/EventClosure.jsx` | Données via `useEventTransactions` (transactions) ; calculs locaux (computeBalances) | **events/…/transactions** (read) |
| `src/components/EventCreation.jsx` | `createEvent` | **events**, **events/…/participants** |
| `src/components/EventDashboard.jsx` | `findEventByCode`, `getEventsByOrganizer`, `getEventsByParticipant` | **events**, **events/…/participants** (collectionGroup ou sous-collection selon implémentation) |
| `src/components/EventHistory.jsx` | `getTransactionsFromFirestore` | **events/…/transactions** |
| `src/components/EventJoin.jsx` | `findEventByCode`, `createJoinRequest`, `checkParticipantAccess`, `listenMyJoinRequest` | **events**, **events/…/joinRequests**, **events/…/participants** |
| `src/components/EventManagement.jsx` | `findEventByCode`, `getEventById`, `getJoinRequests`, `updateJoinRequest`, `getTransactionsFromFirestore`, `onSnapshot` sur participants | **events**, **events/…/participants**, **events/…/joinRequests**, **events/…/transactions** |
| `src/components/EventTicketScanner.jsx` | `updateParticipantInFirestore`, `updateEventInFirestore`, `addTransactionToFirestore` | **events**, **events/…/participants**, **events/…/transactions** |
| `src/components/TransactionManagement.jsx` | `addTransactionToFirestore`, `updateTransactionInFirestore`, `deleteTransactionInFirestore`, `updateParticipantInFirestore`, `updateEventInFirestore` ; données via `useEventTransactions` | **events**, **events/…/participants**, **events/…/transactions** |
| `src/components/TesseractTest.jsx` | `addTransactionToFirestore`, `updateParticipantInFirestore`, `updateEventInFirestore` | **events**, **events/…/participants**, **events/…/transactions** |

### 3.5 Fichiers non impactés (ou hors Firestore)

- **Composants** : AboutDialog, AuthDialog, BackButton, Contact, EventCalendar, EventCode, EventLocation, EventStatistics, FAQ, InviteFriends, LanguageSelector, ParticipantForm, PaymentDetails, PaymentMethods, PaymentReminder, PaymentStepper, PaymentValidation, PrivacyPolicy, QRCode, QRCodeScanner, ScrollToTop, SettingsDialog, TermsOfService, ThemeProvider, ThemeToggle, TransactionDetails, TransactionNetwork, UserProfile, etc. Ils n’appellent pas l’API Firestore (au plus le store ou des props déjà chargées).
- **Utils** : `bonkontBalances.js` (calculs purs), `publicPagesVersion.js` (pas Firestore).
- **UI** : tout le dossier `src/components/ui/` (pas d’accès Firestore).

---

## 4. Synthèse par collection Firestore

| Collection / sous-collection | Fichiers impactés (qui lisent ou écrivent) |
|------------------------------|--------------------------------------------|
| **events** | firestoreService, api, App, EventCreation, EventDashboard, EventJoin, EventManagement |
| **events/{eventId}/participants** | firestoreService, api, EventCreation, EventJoin, EventManagement, CashPayment, EventTicketScanner, TransactionManagement, TesseractTest, App (removeDuplicateParticipants) |
| **events/{eventId}/joinRequests** | firestoreService, api, EventJoin, EventManagement |
| **events/{eventId}/transactions** | firestoreService, api, useEventTransactions, migrateLocalTransactions, EventManagement, EventClosure, EventHistory, TransactionManagement, CashPayment, EventTicketScanner, TesseractTest |
| **notifications** | firestoreService, api (création / lecture / marquer lu) |

Tout changement des règles dans `firestore.rules` (restriction par `request.auth`, par `organizerId`, etc.) affectera directement ces fichiers et les écrans qui en dépendent.
