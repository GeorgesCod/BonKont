# Guide de Déploiement - BonKont

## Options de Déploiement

### Option 1 : Vercel (Recommandé - Le plus simple) ⚡

1. **Créer un compte sur Vercel** : https://vercel.com
2. **Installer Vercel CLI** (optionnel) :
   ```bash
   npm i -g vercel
   ```
3. **Déployer** :
   ```bash
   vercel
   ```
   Ou connecter votre repo GitHub directement sur le site Vercel.

**Avantages** :
- Gratuit
- Déploiement automatique à chaque push Git
- HTTPS automatique
- CDN global
- Lien du type : `https://bonkont.vercel.app`

---

### Option 2 : Netlify 🚀

1. **Créer un compte sur Netlify** : https://netlify.com
2. **Installer Netlify CLI** (optionnel) :
   ```bash
   npm i -g netlify-cli
   ```
3. **Déployer** :
   ```bash
   netlify deploy --prod
   ```
   Ou connecter votre repo GitHub directement sur le site Netlify.

**Avantages** :
- Gratuit
- Déploiement automatique
- HTTPS automatique
- Lien du type : `https://bonkont.netlify.app`

---

### Option 3 : Firebase Hosting 🔥

Vous avez déjà une configuration Firebase ! 

1. **Installer Firebase CLI** :
   ```bash
   npm install -g firebase-tools
   ```

2. **Se connecter** :
   ```bash
   firebase login
   ```

3. **Initialiser Firebase** (si pas déjà fait) :
   ```bash
   firebase init hosting
   ```
   - Sélectionner "build" comme dossier public
   - Configurer les rewrites pour SPA

4. **Déployer** :
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

**Avantages** :
- Gratuit
- Intégration avec Firebase (si vous utilisez Firestore)
- Lien du type : `https://bonkont.web.app`

---

### Option 4 : GitHub Pages 📄

1. **Installer gh-pages** :
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Ajouter dans package.json** :
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   },
   "homepage": "https://votre-username.github.io/bonkont"
   ```

3. **Déployer** :
   ```bash
   npm run deploy
   ```

**Avantages** :
- Gratuit
- Lien du type : `https://votre-username.github.io/bonkont`

---

## Configuration Actuelle

✅ **Build fonctionnel** : `npm run build` ✅  
✅ **Fichier vercel.json** créé  
✅ **Meta viewport** configuré pour mobile  
✅ **Application 100% responsive**

## Prochaines Étapes

1. Choisir une plateforme de déploiement
2. Créer un compte
3. Connecter votre repository Git
4. Déployer !

Une fois déployé, vous recevrez un lien web accessible depuis n'importe quel appareil mobile.

---

## Note Importante

L'application utilise actuellement `localStorage` pour stocker les données. Pour une utilisation en production, il serait recommandé d'ajouter :
- Un backend (Firebase Firestore, Supabase, etc.)
- Une authentification réelle
- Un stockage cloud pour les données

Mais pour un prototype/démo, le déploiement actuel fonctionnera parfaitement !


