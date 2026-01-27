# Configuration Firebase pour Bonkont (Plan Spark Gratuit)

## ✅ Compatible avec le plan Spark gratuit

Bonkont utilise maintenant **Firestore directement depuis le frontend** au lieu de Firebase Functions, ce qui permet de rester sur le **plan Spark gratuit**.

## Configuration requise

### 1. Récupérer les clés Firebase

1. Allez sur la [Console Firebase](https://console.firebase.google.com/project/bonkont-48a2c/settings/general)
2. Dans "Paramètres du projet" > "Vos applications"
3. Si vous n'avez pas encore d'application web, cliquez sur "Ajouter une application" > Web (</>)
4. Copiez les clés de configuration

### 2. Créer le fichier `.env`

Créez un fichier `.env` à la racine du projet :

```bash
# Configuration Firebase pour Bonkont
VITE_FIREBASE_API_KEY=votre-api-key
VITE_FIREBASE_AUTH_DOMAIN=bonkont-48a2c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bonkont-48a2c
VITE_FIREBASE_STORAGE_BUCKET=bonkont-48a2c.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
VITE_FIREBASE_APP_ID=votre-app-id
```

### 3. Configurer les règles Firestore

Assurez-vous que `firestore.rules` autorise les opérations nécessaires :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Événements : lecture publique par code, écriture pour les organisateurs
    match /events/{eventId} {
      allow read: if true; // Lecture publique pour permettre la recherche par code
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.organizerId == request.auth.uid;
      
      // Participants : lecture pour les participants, écriture pour l'organisateur
      match /participants/{participantId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null;
      }
      
      // Demandes de participation : lecture pour l'organisateur, écriture pour tous
      match /joinRequests/{requestId} {
        allow read: if request.auth != null;
        allow create: if true; // Permettre aux invités de créer des demandes
        allow update: if request.auth != null;
      }
      
      // Transactions : lecture/écriture pour les participants
      match /transactions/{transactionId} {
        allow read: if true;
        allow create, update, delete: if request.auth != null;
      }
    }
  }
}
```

### 4. Créer les index Firestore

Créez un index composite pour la recherche par code dans `firestore.indexes.json` :

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "code",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Déployez les index :
```bash
firebase deploy --only firestore:indexes
```

## Architecture

### Avant (avec Firebase Functions - nécessite Blaze)
```
Frontend → Firebase Functions → Firestore
```

### Maintenant (direct Firestore - Spark gratuit)
```
Frontend → Firestore (direct)
```

## Services disponibles

Tous les services sont dans `src/services/firestoreService.js` :

- ✅ `findEventByCode(code)` - Recherche un événement par code
- ✅ `createEvent(eventData)` - Crée un événement
- ✅ `createJoinRequest(eventId, participantData)` - Crée une demande de participation
- ✅ `getJoinRequests(eventId, status)` - Récupère les demandes
- ✅ `updateJoinRequest(eventId, requestId, action, organizerId)` - Approuve/refuse une demande

## Avantages du plan Spark

- ✅ **Gratuit** - Pas de coûts cachés
- ✅ **Firestore** - 1 GB de stockage, 50K lectures/jour, 20K écritures/jour
- ✅ **Hosting** - 10 GB de stockage, 360 MB/jour de transfert
- ✅ **Authentication** - Illimité
- ✅ **Pas de limite d'utilisateurs** pour l'authentification

## Limites du plan Spark

- ⚠️ **Firestore** : 50K lectures/jour, 20K écritures/jour
- ⚠️ **Hosting** : 360 MB/jour de transfert
- ⚠️ Pas de Firebase Functions (mais on n'en a plus besoin !)

## Déploiement

```bash
# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer les index
firebase deploy --only firestore:indexes

# Déployer l'application
npm run build
firebase deploy --only hosting
```

## Test local

Pour tester avec l'emulator Firestore :

```bash
# Démarrer l'emulator
firebase emulators:start --only firestore

# Dans src/lib/firebase.js, utilisez connectFirestoreEmulator
```

## Sécurité

⚠️ **Important** : Les clés Firebase dans `.env` sont exposées dans le frontend. C'est normal et sécurisé car :
- Les règles Firestore protègent vos données
- Les clés API sont limitées par domaine dans la console Firebase
- Configurez les restrictions de domaine dans la console Firebase

## Support

Pour toute question, consultez :
- [Documentation Firestore](https://firebase.google.com/docs/firestore)
- [Plan Spark](https://firebase.google.com/pricing)


## ✅ Compatible avec le plan Spark gratuit

Bonkont utilise maintenant **Firestore directement depuis le frontend** au lieu de Firebase Functions, ce qui permet de rester sur le **plan Spark gratuit**.

## Configuration requise

### 1. Récupérer les clés Firebase

1. Allez sur la [Console Firebase](https://console.firebase.google.com/project/bonkont-48a2c/settings/general)
2. Dans "Paramètres du projet" > "Vos applications"
3. Si vous n'avez pas encore d'application web, cliquez sur "Ajouter une application" > Web (</>)
4. Copiez les clés de configuration

### 2. Créer le fichier `.env`

Créez un fichier `.env` à la racine du projet :

```bash
# Configuration Firebase pour Bonkont
VITE_FIREBASE_API_KEY=votre-api-key
VITE_FIREBASE_AUTH_DOMAIN=bonkont-48a2c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bonkont-48a2c
VITE_FIREBASE_STORAGE_BUCKET=bonkont-48a2c.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
VITE_FIREBASE_APP_ID=votre-app-id
```

### 3. Configurer les règles Firestore

Assurez-vous que `firestore.rules` autorise les opérations nécessaires :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Événements : lecture publique par code, écriture pour les organisateurs
    match /events/{eventId} {
      allow read: if true; // Lecture publique pour permettre la recherche par code
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.organizerId == request.auth.uid;
      
      // Participants : lecture pour les participants, écriture pour l'organisateur
      match /participants/{participantId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null;
      }
      
      // Demandes de participation : lecture pour l'organisateur, écriture pour tous
      match /joinRequests/{requestId} {
        allow read: if request.auth != null;
        allow create: if true; // Permettre aux invités de créer des demandes
        allow update: if request.auth != null;
      }
      
      // Transactions : lecture/écriture pour les participants
      match /transactions/{transactionId} {
        allow read: if true;
        allow create, update, delete: if request.auth != null;
      }
    }
  }
}
```

### 4. Créer les index Firestore

Créez un index composite pour la recherche par code dans `firestore.indexes.json` :

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "code",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Déployez les index :
```bash
firebase deploy --only firestore:indexes
```

## Architecture

### Avant (avec Firebase Functions - nécessite Blaze)
```
Frontend → Firebase Functions → Firestore
```

### Maintenant (direct Firestore - Spark gratuit)
```
Frontend → Firestore (direct)
```

## Services disponibles

Tous les services sont dans `src/services/firestoreService.js` :

- ✅ `findEventByCode(code)` - Recherche un événement par code
- ✅ `createEvent(eventData)` - Crée un événement
- ✅ `createJoinRequest(eventId, participantData)` - Crée une demande de participation
- ✅ `getJoinRequests(eventId, status)` - Récupère les demandes
- ✅ `updateJoinRequest(eventId, requestId, action, organizerId)` - Approuve/refuse une demande

## Avantages du plan Spark

- ✅ **Gratuit** - Pas de coûts cachés
- ✅ **Firestore** - 1 GB de stockage, 50K lectures/jour, 20K écritures/jour
- ✅ **Hosting** - 10 GB de stockage, 360 MB/jour de transfert
- ✅ **Authentication** - Illimité
- ✅ **Pas de limite d'utilisateurs** pour l'authentification

## Limites du plan Spark

- ⚠️ **Firestore** : 50K lectures/jour, 20K écritures/jour
- ⚠️ **Hosting** : 360 MB/jour de transfert
- ⚠️ Pas de Firebase Functions (mais on n'en a plus besoin !)

## Déploiement

```bash
# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer les index
firebase deploy --only firestore:indexes

# Déployer l'application
npm run build
firebase deploy --only hosting
```

## Test local

Pour tester avec l'emulator Firestore :

```bash
# Démarrer l'emulator
firebase emulators:start --only firestore

# Dans src/lib/firebase.js, utilisez connectFirestoreEmulator
```

## Sécurité

⚠️ **Important** : Les clés Firebase dans `.env` sont exposées dans le frontend. C'est normal et sécurisé car :
- Les règles Firestore protègent vos données
- Les clés API sont limitées par domaine dans la console Firebase
- Configurez les restrictions de domaine dans la console Firebase

## Support

Pour toute question, consultez :
- [Documentation Firestore](https://firebase.google.com/docs/firestore)
- [Plan Spark](https://firebase.google.com/pricing)












