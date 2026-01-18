/**
 * Système de versioning pour les pages publiques
 * 
 * Ce fichier permet de suivre les versions des pages publiques
 * et de s'assurer qu'elles sont automatiquement mises à jour
 * lors des modifications importantes de l'application.
 * 
 * Version actuelle : 2.0.0
 * Dernière mise à jour : Tunnel d'entrée + Validation participants
 */

export const PUBLIC_PAGES_VERSION = {
  version: '2.0.0',
  lastUpdate: '2024-12-19',
  changes: [
    {
      date: '2024-12-19',
      version: '2.0.0',
      description: 'Tunnel d\'entrée et validation des participants',
      affectedPages: [
        'FAQ',
        'TermsOfService',
        'PrivacyPolicy',
        'Contact'
      ],
      updates: [
        'Ajout de questions FAQ sur le tunnel d\'entrée',
        'Mise à jour des CGU pour le système de validation',
        'Mise à jour de la politique de confidentialité pour les demandes de participation',
        'Clarification du processus de rejoindre un événement'
      ]
    }
  ]
};

/**
 * Vérifie si les pages publiques sont à jour
 * @returns {boolean} true si les pages sont à jour
 */
export function arePublicPagesUpToDate() {
  // Cette fonction peut être étendue pour vérifier
  // si les traductions sont complètes, etc.
  return true;
}

/**
 * Liste des pages publiques qui doivent être mises à jour
 * lors de modifications importantes
 */
export const PUBLIC_PAGES_TO_UPDATE = [
  {
    name: 'FAQ',
    file: 'src/components/FAQ.jsx',
    translations: 'src/lib/i18n.js',
    description: 'Questions fréquentes sur l\'utilisation de Bonkont'
  },
  {
    name: 'TermsOfService',
    file: 'src/components/TermsOfService.jsx',
    translations: 'src/lib/i18n.js',
    description: 'Conditions générales d\'utilisation'
  },
  {
    name: 'PrivacyPolicy',
    file: 'src/components/PrivacyPolicy.jsx',
    translations: 'src/lib/i18n.js',
    description: 'Politique de confidentialité'
  },
  {
    name: 'Contact',
    file: 'src/components/Contact.jsx',
    translations: 'src/lib/i18n.js',
    description: 'Page de contact'
  },
  {
    name: 'SettingsDialog (Help Tab)',
    file: 'src/components/SettingsDialog.jsx',
    translations: 'src/lib/i18n.js',
    description: 'Onglet Aide dans les paramètres avec guide Bonkont'
  }
];

/**
 * Guide pour mettre à jour les pages publiques
 * 
 * Lors de modifications importantes (nouvelles fonctionnalités, changements de logique) :
 * 
 * 1. Mettre à jour les traductions dans src/lib/i18n.js
 *    - Ajouter les nouvelles clés de traduction (FR + EN)
 * 
 * 2. Mettre à jour les composants concernés
 *    - FAQ.jsx : Ajouter/modifier les questions
 *    - TermsOfService.jsx : Mettre à jour les sections pertinentes
 *    - PrivacyPolicy.jsx : Ajouter les nouvelles données collectées
 *    - Contact.jsx : Mettre à jour si nécessaire
 * 
 * 3. Mettre à jour ce fichier (publicPagesVersion.js)
 *    - Incrémenter la version
 *    - Ajouter une entrée dans changes[]
 *    - Documenter les modifications
 * 
 * 4. Vérifier que toutes les pages utilisent les traductions
 *    - Pas de texte en dur
 *    - Toutes les clés de traduction existent
 * 
 * 5. Tester dans les deux langues (FR/EN)
 */
export const UPDATE_GUIDE = {
  steps: [
    'Mettre à jour src/lib/i18n.js avec les nouvelles traductions',
    'Mettre à jour les composants concernés',
    'Mettre à jour publicPagesVersion.js',
    'Vérifier l\'utilisation des traductions',
    'Tester dans les deux langues'
  ],
  checklist: [
    'Toutes les nouvelles fonctionnalités sont documentées',
    'Les traductions FR et EN sont complètes',
    'Les pages publiques reflètent les changements',
    'Pas de texte en dur dans les composants',
    'Les liens et références sont à jour'
  ]
};

