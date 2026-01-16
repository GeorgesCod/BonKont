#!/usr/bin/env node
/**
 * Script Node.js pour commit + push Git
 * Usage: npm run git:commit-push "Message de commit"
 *    ou: npm run git:cp "Message de commit"
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Récupérer le message de commit depuis les arguments
const message = process.argv[2];

if (!message) {
  log('❌ Erreur: Veuillez fournir un message de commit', 'red');
  console.log('\nUsage: npm run git:commit-push "Message de commit"');
  console.log('   ou: npm run git:cp "Message de commit"');
  process.exit(1);
}

// Vérifier si on est dans un repo Git
const gitDir = path.join(process.cwd(), '.git');
if (!fs.existsSync(gitDir)) {
  log('❌ Erreur: Ce répertoire n\'est pas un dépôt Git', 'red');
  process.exit(1);
}

try {
  log('🔄 Démarrage du processus Git commit + push...', 'cyan');

  // Vérifier s'il y a des changements
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  
  if (!status.trim()) {
    log('⚠️  Aucun changement détecté. Rien à committer.', 'yellow');
    process.exit(0);
  }

  log('📝 Changements détectés:', 'green');
  execSync('git status --short', { stdio: 'inherit' });

  // Ajouter tous les fichiers modifiés
  log('\n➕ Ajout des fichiers modifiés...', 'cyan');
  execSync('git add .', { stdio: 'inherit' });

  // Créer le commit
  log(`💾 Création du commit avec le message: '${message}'`, 'cyan');
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

  // Push vers le dépôt distant
  log('🚀 Push vers le dépôt distant...', 'cyan');
  execSync('git push', { stdio: 'inherit' });

  log('\n✅ Succès! Commit et push effectués avec succès.', 'green');
  log(`📦 Commit: ${message}`, 'green');

} catch (error) {
  log('\n❌ Erreur lors de l\'exécution:', 'red');
  console.error(error.message);
  process.exit(1);
}

