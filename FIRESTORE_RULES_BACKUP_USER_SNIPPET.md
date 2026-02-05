## Sauvegarde – rules Firestore (snippet fourni)

Date de sauvegarde : 2026-02-04

> Contenu exact des rules que tu as fournies (version “transactions + users”).

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Protéger la collection transactions
    match /transactions/{transactionId} {
      // Seul l'utilisateur propriétaire peut lire ses transactions
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;

      // Seul le propriétaire peut modifier ses propres transactions
      allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;

      // Interdire la suppression des transactions
      allow delete: if false;
    }

    // Sécuriser la collection users
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

