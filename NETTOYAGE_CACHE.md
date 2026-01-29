# 🧹 Guide de Nettoyage du Cache - Windows

## 📋 Types de cache à nettoyer

### 1. Cache Windows (Fichiers temporaires)

**Méthode 1 : Via PowerShell (Recommandé)**

```powershell
# Nettoyer les fichiers temporaires Windows
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

# Nettoyer le cache Windows Update
Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:SystemRoot\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
Start-Service -Name wuauserv -ErrorAction SilentlyContinue

# Nettoyer le cache DNS
ipconfig /flushdns

# Nettoyer le cache du magasin de composants Windows
Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase
```

**Méthode 2 : Via Nettoyage de disque Windows**

1. Appuyez sur `Win + R`
2. Tapez `cleanmgr` et appuyez sur Entrée
3. Sélectionnez le lecteur C:
4. Cochez tous les éléments à nettoyer
5. Cliquez sur "Nettoyer les fichiers système"

### 2. Cache du navigateur

**Chrome/Edge :**
- `Ctrl + Shift + Delete`
- Sélectionnez "Tout le temps"
- Cochez : Images en cache, Fichiers en cache
- Cliquez sur "Effacer les données"

**Firefox :**
- `Ctrl + Shift + Delete`
- Sélectionnez "Tout"
- Cochez : Cache
- Cliquez sur "Effacer maintenant"

### 3. Cache npm/node_modules (Projet BonKont)

```powershell
# Nettoyer le cache npm global
npm cache clean --force

# Supprimer node_modules et package-lock.json (optionnel)
# ⚠️ ATTENTION : Vous devrez réinstaller les dépendances après
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue

# Réinstaller les dépendances
npm install
```

### 4. Cache de build (dist, build)

```powershell
# Dans le dossier du projet
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
```

### 5. Cache Vite (si vous utilisez Vite)

```powershell
# Supprimer le cache Vite
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
```

### 6. Cache PowerShell

```powershell
# Vider l'historique PowerShell
Clear-History

# Nettoyer le cache des modules PowerShell
Get-ChildItem "$env:LOCALAPPDATA\Microsoft\Windows\PowerShell\CommandAnalysis" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
```

---

## 🚀 Script de nettoyage complet

Créez un fichier `nettoyage-cache.ps1` :

```powershell
Write-Host "=== NETTOYAGE DU CACHE ===" -ForegroundColor Cyan

# 1. Fichiers temporaires
Write-Host "Nettoyage des fichiers temporaires..." -ForegroundColor Yellow
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:LOCALAPPDATA\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Cache DNS
Write-Host "Nettoyage du cache DNS..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null

# 3. Cache npm
Write-Host "Nettoyage du cache npm..." -ForegroundColor Yellow
npm cache clean --force 2>$null

# 4. Cache de build (dans le projet actuel)
Write-Host "Nettoyage des dossiers de build..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Path "dist" -Recurse -Force }
if (Test-Path "build") { Remove-Item -Path "build" -Recurse -Force }
if (Test-Path "node_modules\.vite") { Remove-Item -Path "node_modules\.vite" -Recurse -Force }

Write-Host "✅ Nettoyage terminé !" -ForegroundColor Green
```

**Exécution :**
```powershell
.\nettoyage-cache.ps1
```

---

## 📊 Vérifier l'espace libéré

```powershell
# Avant le nettoyage
$before = (Get-PSDrive C).Free

# Après le nettoyage
$after = (Get-PSDrive C).Free
$freed = $after - $before
Write-Host "Espace libéré : $([math]::Round($freed/1GB, 2)) GB" -ForegroundColor Green
```

---

## ⚠️ Précautions

1. **Sauvegardez vos données importantes** avant de nettoyer
2. **Ne supprimez pas** les fichiers système
3. **Fermez les applications** avant de nettoyer les caches
4. **Redémarrez** après le nettoyage du cache Windows Update

---

## 🔧 Outils supplémentaires

### Nettoyage avancé Windows

```powershell
# Nettoyage complet (nécessite des droits administrateur)
# Exécutez PowerShell en tant qu'administrateur

# Nettoyer les anciennes versions Windows
Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase

# Nettoyer les fichiers système
sfc /scannow

# Vérifier le disque
chkdsk C: /f
```

### Outils tiers recommandés

- **CCleaner** : Nettoyage complet et sécurisé
- **BleachBit** : Alternative open-source à CCleaner
- **Disk Cleanup** : Outil intégré Windows (cleanmgr)

---

## 📝 Nettoyage rapide (1 commande)

```powershell
# Nettoyage rapide des fichiers temporaires et cache npm
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue; npm cache clean --force; ipconfig /flushdns
```

---

**💡 Astuce :** Planifiez un nettoyage automatique mensuel pour maintenir votre PC performant !







