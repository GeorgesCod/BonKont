# Scripts Git - Commit & Push

Ce dossier contient des scripts pour automatiser le processus `git commit` + `git push`.

**Guide déploiement** : le workflow `npm run git:cp` est intégré au [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md). Voir aussi [GIT_PROCESS.md](../GIT_PROCESS.md).

## 📋 Scripts disponibles

### 1. Script PowerShell (Windows)
**Fichier:** `git-commit-push.ps1`

**Usage:**
```powershell
.\scripts\git-commit-push.ps1 "Message de commit"
```

**Exemple:**
```powershell
.\scripts\git-commit-push.ps1 "Ajout de l'animation sur le bouton scanner"
```

### 2. Script Bash (Linux/Mac/Git Bash)
**Fichier:** `git-commit-push.sh`

**Usage:**
```bash
chmod +x scripts/git-commit-push.sh
./scripts/git-commit-push.sh "Message de commit"
```

**Exemple:**
```bash
./scripts/git-commit-push.sh "Ajout de l'animation sur le bouton scanner"
```

### 3. Script Node.js (Cross-platform)
**Fichier:** `git-commit-push.js`

**Usage via npm:**
```bash
npm run git "Message de commit"
npm run git:cp "Message de commit"
npm run git:commit-push "Message de commit"
```

**Exemple:**
```bash
npm run git:cp "Ajout de l'animation sur le bouton scanner"
```

## 🔄 Processus exécuté

Tous les scripts suivent le même processus :

1. ✅ **Vérification** : S'assure qu'on est dans un dépôt Git
2. ✅ **Détection** : Vérifie s'il y a des changements à committer
3. ✅ **Ajout** : `git add .` (ajoute tous les fichiers modifiés)
4. ✅ **Commit** : `git commit -m "message"`
5. ✅ **Push** : `git push`

## ⚠️ Notes importantes

- Les scripts ajoutent **tous** les fichiers modifiés (`git add .`)
- Si aucun changement n'est détecté, le script s'arrête sans erreur
- En cas d'erreur à une étape, le script s'arrête et affiche un message d'erreur
- Le message de commit doit être entre guillemets s'il contient des espaces

## 🎯 Recommandation

Pour une utilisation quotidienne, utilisez le script npm :
```bash
npm run git:cp "Votre message de commit"
```

C'est le plus simple et fonctionne sur tous les systèmes d'exploitation.

