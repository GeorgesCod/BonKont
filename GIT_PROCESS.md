# 🚀 Processus Git Commit + Push

## 📝 Vue d'ensemble

Ce projet contient plusieurs scripts pour automatiser le processus `git commit` + `git push` en une seule commande.

## 🎯 Méthode recommandée (la plus simple)

### Via npm (fonctionne partout)

```bash
npm run git:cp "Votre message de commit"
```

**Exemple:**
```bash
npm run git:cp "Ajout de l'animation sur le bouton scanner CB"
```

## 📋 Autres méthodes disponibles

### 1. PowerShell (Windows)

```powershell
.\scripts\git-commit-push.ps1 "Votre message de commit"
```

### 2. Bash (Linux/Mac/Git Bash)

```bash
./scripts/git-commit-push.sh "Votre message de commit"
```

### 3. Node.js direct

```bash
node scripts/git-commit-push.js "Votre message de commit"
```

## 🔄 Ce que fait le script

1. ✅ Vérifie qu'on est dans un dépôt Git
2. ✅ Détecte les changements à committer
3. ✅ Ajoute tous les fichiers modifiés (`git add .`)
4. ✅ Crée le commit avec votre message (`git commit -m "message"`)
5. ✅ Push vers le dépôt distant (`git push`)

## 💡 Exemples d'utilisation

```bash
# Exemple 1: Commit simple
npm run git:cp "Correction du bug d'affichage"

# Exemple 2: Commit avec plusieurs mots
npm run git:cp "Ajout de l'animation sur le bouton scanner CB"

# Exemple 3: Commit avec emoji (optionnel)
npm run git:cp "✨ Ajout de l'animation sur le bouton scanner"
```

## ⚠️ Notes importantes

- Le message de commit doit être entre **guillemets** s'il contient des espaces
- Tous les fichiers modifiés seront ajoutés automatiquement (`git add .`)
- Si aucun changement n'est détecté, le script s'arrête sans erreur
- En cas d'erreur, le script s'arrête et affiche un message d'erreur

## 🎨 Format de message recommandé

Pour des commits clairs et professionnels :

```
npm run git:cp "Type: Description courte

Description détaillée si nécessaire"
```

**Types courants:**
- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `refactor:` Refactorisation du code
- `style:` Changements de style/formatage
- `docs:` Documentation
- `perf:` Amélioration de performance

**Exemple:**
```bash
npm run git:cp "feat: Ajout de l'animation sur le bouton scanner CB"
```

