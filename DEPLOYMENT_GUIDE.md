# Guide de Déploiement - BonKont

## Workflow de déploiement (recommandé)

1. **Faire vos modifications** dans le code.
2. **Commit + push** avec une seule commande :
   ```bash
   npm run git:cp "Description de vos modifications"
   ```
   Voir la section [Commit et push (npm run git / git:cp)](#commit-et-push-npm-run-git--gitcp) ci-dessous.
3. **Déployer** selon la plateforme choisie (Vercel, Firebase, etc.).

---

## Commit et push (npm run git / git:cp)

Avant chaque déploiement, commitez et poussez vos changements pour que le dépôt distant soit à jour.

### Commandes disponibles

| Commande | Description |
|----------|-------------|
| `npm run git "message"` | Commit + push (alias) |
| `npm run git:cp "message"` | Commit + push (raccourci recommandé) |
| `npm run git:commit-push "message"` | Commit + push (nom complet) |

Toutes exécutent le script `scripts/git-commit-push.js`.

### Ce que fait le script

1. Vérifie que le répertoire est un dépôt Git.
2. Détecte les changements à committer.
3. Ajoute tous les fichiers modifiés (`git add .`).
4. Crée le commit avec votre message (`git commit -m "message"`).
5. Pousse vers le dépôt distant (`git push`).

### Exemples

```bash
# Exemple simple
npm run git:cp "fix: Bouton rappel récapitulatif paiements"

# Avec type conventionnel
npm run git:cp "feat: Contribution cagnotte + validation collective BONKONT"

# Plusieurs mots (guillemets obligatoires)
npm run git:cp "docs: Mise à jour guide déploiement avec npm run git:cp"
```

### Règles importantes

- **Message entre guillemets** s’il contient des espaces.
- Tous les fichiers modifiés sont ajoutés automatiquement.
- Si aucun changement n’est détecté, le script s’arrête sans erreur.
- Détails complets : voir [GIT_PROCESS.md](./GIT_PROCESS.md).

---

## Options de Déploiement

### Option 1 : Vercel (Recommandé - Le plus simple) ⚡

0. **Commit et push** (avant de déployer) :
   ```bash
   npm run git:cp "Description des modifications"
   ```
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

0. **Commit et push** :
   ```bash
   npm run git:cp "Description des modifications"
   ```
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

4. **Build et déployer** :
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

0. **Commit et push** :
   ```bash
   npm run git:cp "Description des modifications"
   ```
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

✅ **Build fonctionnel** : `npm run build`  
✅ **Commit + push** : `npm run git:cp "message"` (voir [GIT_PROCESS.md](./GIT_PROCESS.md))  
✅ **Fichier vercel.json** créé  
✅ **Meta viewport** configuré pour mobile  
✅ **Application 100% responsive**

## Prochaines Étapes

1. Faire vos modifications, puis **commit + push** : `npm run git:cp "Description des modifications"`
2. Choisir une plateforme de déploiement
3. Créer un compte et connecter votre repository Git
4. Déployer (ou laisser le déploiement auto après push si Vercel/Netlify)

Une fois déployé, vous recevrez un lien web accessible depuis n'importe quel appareil mobile.

---

## Note Importante

L'application utilise actuellement `localStorage` pour stocker les données. Pour une utilisation en production, il serait recommandé d'ajouter :
- Un backend (Firebase Firestore, Supabase, etc.)
- Une authentification réelle
- Un stockage cloud pour les données

Mais pour un prototype/démo, le déploiement actuel fonctionnera parfaitement !


