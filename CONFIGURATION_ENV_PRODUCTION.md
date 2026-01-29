# 🔧 Configuration des variables d'environnement Firebase pour la production

## ✅ Fichiers créés

1. **`.env`** - Fichier de configuration (ignoré par Git, sécurisé)
2. **`.env.example`** - Template de référence (peut être commité)

---

## 📋 Étapes de configuration

### Étape 1 : Obtenir les clés Firebase

1. **Accéder à la Console Firebase**
   - URL : https://console.firebase.google.com/project/bonkont-48a2c/settings/general
   - Connectez-vous avec votre compte Google

2. **Aller dans les paramètres du projet**
   - Cliquez sur l'icône ⚙️ (Paramètres) en haut à gauche
   - Sélectionnez "Paramètres du projet"

3. **Récupérer les clés de l'application web**
   - Dans l'onglet "Vos applications"
   - Si vous n'avez pas encore d'application web :
     - Cliquez sur "Ajouter une application" (icône `</>`)
     - Sélectionnez "Web"
     - Donnez un nom à l'application (ex: "Bonkont Web")
   - Si l'application existe déjà, cliquez dessus

4. **Copier la configuration**
   - Vous verrez un objet JavaScript avec les clés :
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "bonkont-48a2c.firebaseapp.com",
     projectId: "bonkont-48a2c",
     storageBucket: "bonkont-48a2c.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

### Étape 2 : Configurer le fichier `.env`

1. **Ouvrir le fichier `.env`** à la racine du projet

2. **Remplacer les valeurs par défaut** par vos vraies clés :

```bash
# Avant (valeurs par défaut)
VITE_FIREBASE_API_KEY=AIzaSyDummyKeyReplaceWithReal

# Après (vraies clés)
VITE_FIREBASE_API_KEY=AIzaSyCvBxYz1234567890abcdefghijklmnop
```

3. **Remplacer toutes les variables** :

```bash
VITE_FIREBASE_API_KEY=votre-vraie-api-key
VITE_FIREBASE_AUTH_DOMAIN=bonkont-48a2c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bonkont-48a2c
VITE_FIREBASE_STORAGE_BUCKET=bonkont-48a2c.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre-vrai-sender-id
VITE_FIREBASE_APP_ID=votre-vrai-app-id
```

### Étape 3 : Vérifier la configuration

1. **Redémarrer le serveur de développement** :
   ```bash
   # Arrêter le serveur (Ctrl+C)
   npm run dev
   ```

2. **Vérifier dans la console du navigateur** :
   - Ouvrir http://localhost:5174
   - Ouvrir les DevTools (F12)
   - Aller dans l'onglet Console
   - Vérifier qu'il n'y a pas d'erreurs Firebase

3. **Tester la connexion Firestore** :
   - Aller sur la page "Rejoindre un événement"
   - Saisir un code d'événement
   - Vérifier que la recherche fonctionne

---

## 🔒 Sécurité

### ⚠️ Important : Les clés sont exposées publiquement

Les clés Firebase dans `.env` sont **exposées dans le frontend** (c'est normal pour Firebase). Pour sécuriser :

1. **Configurer les restrictions de domaine** dans Firebase Console :
   - Allez dans "Paramètres du projet" > "Vos applications"
   - Cliquez sur votre application web
   - Dans "Clés API", configurez les restrictions :
     - Autoriser uniquement votre domaine de production
     - Exemple : `bonkont-48a2c.web.app`, `bonkont-48a2c.firebaseapp.com`

2. **Le fichier `.env` est ignoré par Git** :
   - Vérifié dans `.gitignore` (ligne 16)
   - Ne sera jamais commité dans le dépôt

3. **Utiliser des variables d'environnement en production** :
   - Firebase Hosting : Configurer dans `firebase.json` ou via CLI
   - Vercel : Configurer dans les paramètres du projet
   - Autres plateformes : Utiliser leurs systèmes de variables d'environnement

---

## 🚀 Déploiement en production

### Option 1 : Firebase Hosting

Les variables d'environnement sont chargées depuis `.env` lors du build :

```bash
# 1. Configurer .env avec les vraies clés
# 2. Build de l'application
npm run build

# 3. Déployer
firebase deploy --only hosting
```

### Option 2 : Vercel

1. **Configurer dans Vercel Dashboard** :
   - Allez dans votre projet Vercel
   - Settings > Environment Variables
   - Ajoutez chaque variable `VITE_FIREBASE_*`

2. **Ou via CLI** :
   ```bash
   vercel env add VITE_FIREBASE_API_KEY
   vercel env add VITE_FIREBASE_AUTH_DOMAIN
   # ... etc
   ```

### Option 3 : Autres plateformes

Configurez les variables d'environnement dans les paramètres de votre plateforme de déploiement.

---

## ✅ Vérification finale

### Checklist

- [ ] Fichier `.env` créé à la racine du projet
- [ ] Toutes les variables `VITE_FIREBASE_*` remplies avec les vraies clés
- [ ] Serveur de développement redémarré
- [ ] Pas d'erreurs dans la console du navigateur
- [ ] Connexion Firestore fonctionnelle (test avec recherche d'événement)
- [ ] Restrictions de domaine configurées dans Firebase Console
- [ ] Variables d'environnement configurées sur la plateforme de déploiement

---

## 🧪 Test de la configuration

### Test 1 : Vérifier que les variables sont chargées

```javascript
// Dans la console du navigateur (F12)
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID);
// Devrait afficher : "bonkont-48a2c" (ou votre projectId)
```

### Test 2 : Tester la connexion Firestore

1. Ouvrir http://localhost:5174/#/join
2. Saisir un code d'événement existant
3. Vérifier que la recherche fonctionne
4. Vérifier qu'il n'y a pas d'erreurs dans la console

### Test 3 : Vérifier les règles Firestore

```bash
# Déployer les règles
firebase deploy --only firestore:rules

# Vérifier qu'elles sont actives
# Dans Firebase Console > Firestore > Règles
```

---

## 📝 Variables configurées

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Clé API Firebase | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domaine d'authentification | `bonkont-48a2c.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ID du projet | `bonkont-48a2c` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de stockage | `bonkont-48a2c.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID expéditeur messages | `123456789` |
| `VITE_FIREBASE_APP_ID` | ID de l'application | `1:123456789:web:abc123` |

---

## 🆘 Dépannage

### Problème : "Firebase: Error (auth/api-key-not-valid)"

**Solution :** Vérifiez que `VITE_FIREBASE_API_KEY` contient la vraie clé API

### Problème : "Firebase: Error (auth/unauthorized-domain)"

**Solution :** Ajoutez votre domaine dans Firebase Console > Authentication > Settings > Authorized domains

### Problème : Les variables ne sont pas chargées

**Solution :** 
1. Vérifiez que le fichier `.env` est à la racine du projet
2. Redémarrez le serveur de développement
3. Vérifiez que les variables commencent par `VITE_`

### Problème : Erreur de connexion Firestore

**Solution :**
1. Vérifiez que les règles Firestore sont déployées
2. Vérifiez que le projet Firebase est actif
3. Vérifiez les restrictions de domaine dans Firebase Console

---

## 📚 Ressources

- [Documentation Firebase](https://firebase.google.com/docs)
- [Console Firebase](https://console.firebase.google.com/project/bonkont-48a2c)
- [Guide de configuration Spark](FIREBASE_SPARK_SETUP.md)

---

**✅ Configuration terminée ! Votre application est prête pour la production.**







