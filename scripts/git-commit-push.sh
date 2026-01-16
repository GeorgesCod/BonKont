#!/bin/bash
# Script Bash pour commit + push Git
# Usage: ./scripts/git-commit-push.sh "Message de commit"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Vérifier si un message est fourni
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erreur: Veuillez fournir un message de commit${NC}"
    echo "Usage: $0 \"Message de commit\""
    exit 1
fi

MESSAGE="$1"

echo -e "${CYAN}🔄 Démarrage du processus Git commit + push...${NC}"

# Vérifier si on est dans un repo Git
if [ ! -d .git ]; then
    echo -e "${RED}❌ Erreur: Ce répertoire n'est pas un dépôt Git${NC}"
    exit 1
fi

# Vérifier s'il y a des changements
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Aucun changement détecté. Rien à committer.${NC}"
    exit 0
fi

echo -e "${GREEN}📝 Changements détectés:${NC}"
git status --short

# Ajouter tous les fichiers modifiés
echo -e "\n${CYAN}➕ Ajout des fichiers modifiés...${NC}"
git add .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'ajout des fichiers${NC}"
    exit 1
fi

# Créer le commit
echo -e "${CYAN}💾 Création du commit avec le message: '$MESSAGE'${NC}"
git commit -m "$MESSAGE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la création du commit${NC}"
    exit 1
fi

# Push vers le dépôt distant
echo -e "${CYAN}🚀 Push vers le dépôt distant...${NC}"
git push

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du push. Vérifiez votre connexion et vos permissions.${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Succès! Commit et push effectués avec succès.${NC}"
echo -e "${GREEN}📦 Commit: $MESSAGE${NC}"

