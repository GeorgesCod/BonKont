# Guide de déploiement des Firebase Functions pour Bonkont

## Prérequis

1. **Plan Firebase Blaze (pay-as-you-go)**
   - Le projet doit être sur le plan Blaze pour déployer les fonctions
   - URL pour activer : https://console.firebase.google.com/project/bonkont-48a2c/usage/details

2. **Firebase CLI installé et configuré**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

## Déploiement

### Option 1 : Déploiement direct (Production)

Une fois le plan Blaze activé :

```bash
# Depuis la racine du projet
firebase deploy --only functions
```

### Option 2 : Test local avec l'emulator

Pour tester localement avant de déployer :

```bash
# Démarrer l'emulator Firestore et Functions
firebase emulators:start --only functions,firestore
```

L'emulator sera accessible sur :
- Functions : http://127.0.0.1:5001/bonkont-48a2c/europe-west1/api
- Firestore UI : http://localhost:4000

### Option 3 : Déploiement sélectif

Pour déployer uniquement la fonction `api` :

```bash
firebase deploy --only functions:api
```

## Configuration de l'URL de l'API

### En développement (avec emulator)

Le fichier `src/services/api.js` détecte automatiquement si vous êtes en localhost et utilise l'emulator :

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://127.0.0.1:5001/bonkont-48a2c/europe-west1/api'
  : 'https://europe-west1-bonkont-48a2c.cloudfunctions.net/api';
```

### En production

Après le déploiement, l'URL de production sera :
```
https://europe-west1-bonkont-48a2c.cloudfunctions.net/api
```

## Endpoints disponibles

Une fois déployé, les endpoints suivants seront disponibles :

1. **GET** `/api/events/code/:code`
   - Recherche un événement par son code
   - Exemple : `/api/events/code/ABC12345`

2. **POST** `/api/events`
   - Crée un nouvel événement
   - Body : `{ code, title, description, location, startDate, endDate, participantsTarget, targetAmountPerPerson, organizerId, organizerName, deadline, currency }`

3. **POST** `/api/events/:eventId/join`
   - Crée une demande de participation
   - Body : `{ userId, email, name }`

4. **GET** `/api/events/:eventId/joinRequests`
   - Récupère les demandes de participation
   - Query params : `?status=pending` (optionnel)

5. **PATCH** `/api/events/:eventId/joinRequests/:requestId`
   - Approuve ou refuse une demande
   - Body : `{ action: "approve" | "reject", organizerId }`

## Vérification du déploiement

Après le déploiement, vous pouvez tester avec :

```bash
# Test de recherche d'événement
curl https://europe-west1-bonkont-48a2c.cloudfunctions.net/api/events/code/TEST1234

# Voir les logs
firebase functions:log
```

## Structure Firestore

Les fonctions utilisent la structure suivante :

```
events/{eventId}
  - code, title, description, location, startDate, endDate
  - participantsTarget, targetAmountPerPerson
  - organizerId, organizerName
  - status, createdAt, closedAt

events/{eventId}/participants/{userId}
  - userId, name, email, role
  - joinedAt, approved

events/{eventId}/joinRequests/{requestId}
  - userId, email, name
  - status, requestedAt, approvedAt

events/{eventId}/transactions/{transactionId}
  - type, amount, payerId
  - concernedParticipantIds, validatedBy
  - createdAt
```

## Dépannage

### Erreur : "must be on the Blaze plan"
- Activez le plan Blaze sur la console Firebase
- Le plan Blaze a un niveau gratuit généreux pour le développement

### Erreur : "API cloudbuild.googleapis.com not enabled"
- Les APIs nécessaires sont activées automatiquement lors du premier déploiement
- Si cela échoue, activez-les manuellement dans la console Google Cloud

### Les fonctions ne répondent pas
- Vérifiez les logs : `firebase functions:log`
- Vérifiez que la région est correcte (europe-west1)
- Vérifiez les règles Firestore dans `firestore.rules`

## Coûts estimés

Avec le plan Blaze :
- **Niveau gratuit** : 2 millions d'invocations/mois
- **Au-delà** : $0.40 par million d'invocations
- **Firestore** : 1 Go de stockage gratuit, 50K lectures/jour, 20K écritures/jour

Pour une application de taille moyenne, vous resterez probablement dans le niveau gratuit.


## Prérequis

1. **Plan Firebase Blaze (pay-as-you-go)**
   - Le projet doit être sur le plan Blaze pour déployer les fonctions
   - URL pour activer : https://console.firebase.google.com/project/bonkont-48a2c/usage/details

2. **Firebase CLI installé et configuré**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

## Déploiement

### Option 1 : Déploiement direct (Production)

Une fois le plan Blaze activé :

```bash
# Depuis la racine du projet
firebase deploy --only functions
```

### Option 2 : Test local avec l'emulator

Pour tester localement avant de déployer :

```bash
# Démarrer l'emulator Firestore et Functions
firebase emulators:start --only functions,firestore
```

L'emulator sera accessible sur :
- Functions : http://127.0.0.1:5001/bonkont-48a2c/europe-west1/api
- Firestore UI : http://localhost:4000

### Option 3 : Déploiement sélectif

Pour déployer uniquement la fonction `api` :

```bash
firebase deploy --only functions:api
```

## Configuration de l'URL de l'API

### En développement (avec emulator)

Le fichier `src/services/api.js` détecte automatiquement si vous êtes en localhost et utilise l'emulator :

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://127.0.0.1:5001/bonkont-48a2c/europe-west1/api'
  : 'https://europe-west1-bonkont-48a2c.cloudfunctions.net/api';
```

### En production

Après le déploiement, l'URL de production sera :
```
https://europe-west1-bonkont-48a2c.cloudfunctions.net/api
```

## Endpoints disponibles

Une fois déployé, les endpoints suivants seront disponibles :

1. **GET** `/api/events/code/:code`
   - Recherche un événement par son code
   - Exemple : `/api/events/code/ABC12345`

2. **POST** `/api/events`
   - Crée un nouvel événement
   - Body : `{ code, title, description, location, startDate, endDate, participantsTarget, targetAmountPerPerson, organizerId, organizerName, deadline, currency }`

3. **POST** `/api/events/:eventId/join`
   - Crée une demande de participation
   - Body : `{ userId, email, name }`

4. **GET** `/api/events/:eventId/joinRequests`
   - Récupère les demandes de participation
   - Query params : `?status=pending` (optionnel)

5. **PATCH** `/api/events/:eventId/joinRequests/:requestId`
   - Approuve ou refuse une demande
   - Body : `{ action: "approve" | "reject", organizerId }`

## Vérification du déploiement

Après le déploiement, vous pouvez tester avec :

```bash
# Test de recherche d'événement
curl https://europe-west1-bonkont-48a2c.cloudfunctions.net/api/events/code/TEST1234

# Voir les logs
firebase functions:log
```

## Structure Firestore

Les fonctions utilisent la structure suivante :

```
events/{eventId}
  - code, title, description, location, startDate, endDate
  - participantsTarget, targetAmountPerPerson
  - organizerId, organizerName
  - status, createdAt, closedAt

events/{eventId}/participants/{userId}
  - userId, name, email, role
  - joinedAt, approved

events/{eventId}/joinRequests/{requestId}
  - userId, email, name
  - status, requestedAt, approvedAt

events/{eventId}/transactions/{transactionId}
  - type, amount, payerId
  - concernedParticipantIds, validatedBy
  - createdAt
```

## Dépannage

### Erreur : "must be on the Blaze plan"
- Activez le plan Blaze sur la console Firebase
- Le plan Blaze a un niveau gratuit généreux pour le développement

### Erreur : "API cloudbuild.googleapis.com not enabled"
- Les APIs nécessaires sont activées automatiquement lors du premier déploiement
- Si cela échoue, activez-les manuellement dans la console Google Cloud

### Les fonctions ne répondent pas
- Vérifiez les logs : `firebase functions:log`
- Vérifiez que la région est correcte (europe-west1)
- Vérifiez les règles Firestore dans `firestore.rules`

## Coûts estimés

Avec le plan Blaze :
- **Niveau gratuit** : 2 millions d'invocations/mois
- **Au-delà** : $0.40 par million d'invocations
- **Firestore** : 1 Go de stockage gratuit, 50K lectures/jour, 20K écritures/jour

Pour une application de taille moyenne, vous resterez probablement dans le niveau gratuit.












