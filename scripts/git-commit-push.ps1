# Script PowerShell pour commit + push Git
# Usage: .\scripts\git-commit-push.ps1 "Message de commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

Write-Host "🔄 Démarrage du processus Git commit + push..." -ForegroundColor Cyan

# Vérifier si on est dans un repo Git
if (-not (Test-Path .git)) {
    Write-Host "❌ Erreur: Ce répertoire n'est pas un dépôt Git" -ForegroundColor Red
    exit 1
}

# Vérifier s'il y a des changements
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "⚠️  Aucun changement détecté. Rien à committer." -ForegroundColor Yellow
    exit 0
}

Write-Host "📝 Changements détectés:" -ForegroundColor Green
git status --short

# Ajouter tous les fichiers modifiés
Write-Host "`n➕ Ajout des fichiers modifiés..." -ForegroundColor Cyan
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'ajout des fichiers" -ForegroundColor Red
    exit 1
}

# Créer le commit
Write-Host "💾 Création du commit avec le message: '$Message'" -ForegroundColor Cyan
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la création du commit" -ForegroundColor Red
    exit 1
}

# Push vers le dépôt distant
Write-Host "🚀 Push vers le dépôt distant..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du push. Vérifiez votre connexion et vos permissions." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Succès! Commit et push effectués avec succès." -ForegroundColor Green
Write-Host "📦 Commit: $Message" -ForegroundColor Green

