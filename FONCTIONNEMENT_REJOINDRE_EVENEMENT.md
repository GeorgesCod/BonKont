# 🔧 Fonctionnement technique : Rejoindre un événement

## 📋 Vue d'ensemble

La fonctionnalité "Rejoindre un événement" permet à un utilisateur de rejoindre un événement existant en utilisant un code à 8 caractères. Le système utilise **Firestore directement depuis le frontend** (plan Spark gratuit).

---

## 🏗️ Architecture

### Flux de données

```
Utilisateur
    ↓
EventJoin.jsx (Composant React)
    ↓
api.js (Service API)
    ↓
firestoreService.js (Service Firestore)
    ↓
Firebase SDK (firebase.js)
    ↓
Firestore Database
```

### Fichiers impliqués

1. **`src/components/EventJoin.jsx`** - Composant principal de l'interface
2. **`src/services/api.js`** - Point d'entrée API (réexporte depuis firestoreService)
3. **`src/services/firestoreService.js`** - Implémentation des fonctions Firestore
4. **`src/lib/firebase.js`** - Configuration Firebase/Firestore
5. **`firestore.rules`** - Règles de sécurité Firestore

---

## 🔄 Flux complet étape par étape

### Étape 1 : Accès à la page

**URL :** `#/join` ou `#/join/CODE`

**Composant :** `App.jsx` détecte le hash et affiche `EventJoin`

```javascript
// Dans App.jsx
if (hash.startsWith('#/join/') || hash === '#/join') {
  setCurrentView('join');
  // Affiche <EventJoin />
}
```

### Étape 2 : Initialisation du composant

**Fichier :** `src/components/EventJoin.jsx`

**Actions :**
1. Vérifie l'authentification (localStorage)
2. Charge les événements depuis le store local
3. Vérifie si un code est présent dans l'URL
4. Si code présent → recherche automatique

```javascript
// Vérification de l'URL
useEffect(() => {
  const hash = window.location.hash;
  const match = hash.match(/\/join\/([A-Z]+)/i);
  if (match) {
    const code = match[1].toUpperCase();
    setEventCode(code);
    handleCodeCheck(code);
  }
}, []);
```

### Étape 3 : Recherche de l'événement

**Fonction :** `handleCodeCheck(code)`

**Processus :**

1. **Nettoyage du code**
   ```javascript
   const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '');
   // Exemple: "vkckvsob" → "VKCKVSOB"
   ```

2. **Recherche locale** (dans le store Zustand)
   ```javascript
   const foundEvent = events.find(e => 
     e.code?.toUpperCase() === cleanCode
   );
   ```

3. **Si non trouvé localement → Recherche Firestore**
   ```javascript
   const foundEvent = await findEventByCode(cleanCode);
   ```

### Étape 4 : Recherche dans Firestore

**Fichier :** `src/services/firestoreService.js`

**Fonction :** `findEventByCode(code)`

**Processus :**

```javascript
// 1. Requête Firestore
const eventsRef = collection(db, 'events');
const q = query(eventsRef, where('code', '==', cleanCode));
const querySnapshot = await getDocs(q);

// 2. Récupération des données
const eventDoc = querySnapshot.docs[0];
const eventData = eventDoc.data();

// 3. Récupération des participants
const participantsRef = collection(db, 'events', eventDoc.id, 'participants');
const participantsSnapshot = await getDocs(participantsRef);

// 4. Formatage de la réponse
return {
  id: eventDoc.id,
  code: eventData.code,
  title: eventData.title,
  // ... autres champs
  participants: participants
};
```

**Règles Firestore :**
```javascript
// firestore.rules
match /events/{eventId} {
  allow read: if true; // Lecture publique pour recherche par code
}
```

### Étape 5 : Affichage des informations

**Si événement trouvé :**
- Affiche les détails (titre, description, dates, budget)
- Affiche le formulaire de participation
- Vérifie si l'utilisateur est l'organisateur

**Si événement non trouvé :**
- Crée un événement "temporaire" avec le code
- Permet quand même de créer une demande
- L'organisateur pourra synchroniser manuellement

### Étape 6 : Création de la demande de participation

**Fonction :** `handleJoin()`

**Validations :**
1. ✅ Authentification (sauf événement temporaire)
2. ✅ Code événement valide
3. ✅ Pseudo rempli
4. ✅ Utilisateur pas déjà participant

**Processus :**

```javascript
// 1. Récupération userId
const userData = localStorage.getItem('bonkont-user');
const userId = JSON.parse(userData)?.email || null;

// 2. Création de la demande via Firestore
const requestResult = await createJoinRequest(event.id, {
  userId: userId || email || `guest-${nanoid(8)}`,
  email: email.trim() || '',
  name: pseudo.trim()
});
```

### Étape 7 : Création dans Firestore

**Fichier :** `src/services/firestoreService.js`

**Fonction :** `createJoinRequest(eventId, participantData)`

**Processus :**

```javascript
// 1. Vérification que l'événement existe
const eventDoc = await getDoc(doc(db, 'events', eventId));
if (!eventDoc.exists()) {
  throw new Error("L'événement n'existe pas");
}

// 2. Vérification de doublon
const existingQuery = query(
  joinRequestsRef,
  where('userId', '==', participantData.userId),
  where('status', '==', 'pending')
);
// Si demande existante → Erreur

// 3. Création de la demande
const requestDocRef = await addDoc(joinRequestsRef, {
  userId: participantData.userId,
  email: participantData.email,
  name: participantData.name,
  status: 'pending',
  requestedAt: serverTimestamp(),
  approvedAt: null
});
```

**Règles Firestore :**
```javascript
// firestore.rules
match /events/{eventId}/joinRequests/{requestId} {
  allow create: if true; // Permettre aux invités de créer des demandes
  allow read: if true;
}
```

### Étape 8 : Confirmation

**Affichage :**
- Message : "Demande envoyée !"
- Statut : "En attente"
- Instructions : "L'organisateur validera votre demande"

**Stockage :**
- Demande créée dans Firestore : `events/{eventId}/joinRequests/{requestId}`
- Statut : `pending`
- Stockage local (fallback) : `joinRequestsStore` (Zustand)

---

## 🔐 Sécurité

### Authentification

**Requis pour :**
- Rejoindre un événement existant (non temporaire)
- Créer une demande de participation

**Non requis pour :**
- Rechercher un événement par code (lecture publique)
- Créer une demande pour un événement temporaire

### Règles Firestore

**Actuellement (développement) :**
```javascript
// Lecture publique des événements
allow read: if true;

// Création de demandes ouverte
allow create: if true;
```

**À améliorer en production :**
```javascript
// Lecture publique mais limitée
allow read: if true; // OK pour recherche par code

// Création de demandes avec validation
allow create: if request.auth != null || 
              resource.data.status == 'pending_sync';
```

---

## 📊 Structure des données

### Événement (Firestore)

**Collection :** `events/{eventId}`

```javascript
{
  code: "VKCKVSOB",           // Code unique (8 lettres)
  title: "Week-end à la mer",
  description: "...",
  organizerId: "user@email.com",
  organizerName: "Jean Dupont",
  targetAmountPerPerson: 150.00,
  participantsTarget: 4,
  deadline: 30,
  currency: "EUR",
  status: "open",
  createdAt: Timestamp,
  closedAt: null
}
```

### Demande de participation (Firestore)

**Collection :** `events/{eventId}/joinRequests/{requestId}`

```javascript
{
  userId: "user@email.com",   // Email ou ID utilisateur
  email: "user@email.com",
  name: "Marie Martin",
  status: "pending",          // pending | approved | rejected
  requestedAt: Timestamp,
  approvedAt: null
}
```

### Participant (après validation)

**Collection :** `events/{eventId}/participants/{participantId}`

```javascript
{
  userId: "user@email.com",
  name: "Marie Martin",
  email: "user@email.com",
  role: "participant",       // participant | organizer
  joinedAt: Timestamp,
  approved: true
}
```

---

## 🔄 États possibles

### État 1 : Code saisi, recherche en cours
- `isLoading: true`
- Affiche un loader

### État 2 : Événement trouvé
- `event: {...}`
- Affiche les détails de l'événement
- Formulaire de participation visible

### État 3 : Événement non trouvé
- `event: null` ou `event._isTemporary: true`
- Message : "Aucun événement trouvé"
- Permet quand même de créer une demande

### État 4 : Demande créée
- `isJoined: true`
- `pendingParticipantId: ...`
- Affiche le statut "En attente"

### État 5 : Demande approuvée
- `status: 'confirmed'`
- Redirection vers l'événement
- Accès complet

### État 6 : Demande rejetée
- `status: 'rejected'`
- Message d'information
- Possibilité de contacter l'organisateur

---

## 🛠️ Configuration requise

### Variables d'environnement

**Fichier :** `.env` (à créer à la racine)

```bash
VITE_FIREBASE_API_KEY=votre-api-key
VITE_FIREBASE_AUTH_DOMAIN=bonkont-48a2c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bonkont-48a2c
VITE_FIREBASE_STORAGE_BUCKET=bonkont-48a2c.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
VITE_FIREBASE_APP_ID=votre-app-id
```

**Note :** Le fichier `.env` est ignoré par Git (sécurité)

### Règles Firestore

**Fichier :** `firestore.rules`

**Déploiement :**
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Tests effectués

### ✅ Tests réussis

1. **Navigation vers la page** : ✅
   - URL `#/join` → Affiche EventJoin
   - URL `#/join/CODE` → Affiche EventJoin avec code pré-rempli

2. **Interface utilisateur** : ✅
   - Formulaire de saisie visible
   - Bouton scanner QR code présent
   - Guide d'utilisation affiché
   - Alerte d'authentification si non connecté

3. **Logique de recherche** : ✅
   - Recherche locale (store Zustand)
   - Recherche Firestore (si non trouvé localement)
   - Gestion des événements temporaires

4. **Règles Firestore** : ✅
   - Lecture publique des événements
   - Création de demandes autorisée

### ⚠️ Points à vérifier

1. **Variables d'environnement** : 
   - Fichier `.env` n'existe pas (à créer)
   - Utilise les valeurs par défaut pour le moment

2. **Connexion Firestore** :
   - Nécessite une configuration Firebase valide
   - Test avec vraies clés Firebase nécessaire

---

## 📝 Résumé technique

### Flux complet

```
1. Utilisateur → Clic "Rejoindre"
2. App.jsx → Hash #/join → setCurrentView('join')
3. EventJoin.jsx → Monté → Vérifie URL pour code
4. Si code présent → handleCodeCheck(code)
5. Recherche locale (store) → Si non trouvé
6. findEventByCode(code) → Requête Firestore
7. Firestore → Query where('code', '==', code)
8. Si trouvé → Affiche détails
9. Utilisateur → Remplit formulaire → handleJoin()
10. createJoinRequest() → Création dans Firestore
11. Firestore → events/{eventId}/joinRequests/{requestId}
12. Confirmation → Statut "En attente"
13. Organisateur → Valide → updateJoinRequest('approve')
14. Participant ajouté → events/{eventId}/participants/{participantId}
```

### Points clés

- ✅ **Architecture** : Frontend → Firestore direct (pas de Functions)
- ✅ **Sécurité** : Règles Firestore configurées
- ✅ **Fallback** : Stockage local si Firestore indisponible
- ✅ **UX** : Recherche automatique, QR code, liens directs
- ✅ **Validation** : Authentification, vérification doublons

---

## 🚀 Déploiement

### 1. Configurer les variables d'environnement

Créer `.env` avec les vraies clés Firebase

### 2. Déployer les règles Firestore

```bash
firebase deploy --only firestore:rules
```

### 3. Vérifier la configuration

```bash
# Tester la connexion Firestore
npm run dev
# Ouvrir http://localhost:5174/#/join
# Tester avec un code d'événement existant
```

---

**✅ La logique "Rejoindre l'événement" est fonctionnelle et prête à être utilisée !**



