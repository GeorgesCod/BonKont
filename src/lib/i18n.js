import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

const translations = {
  fr: {
    welcome: 'Bienvenue sur BONKONT',
    tagline: 'Les bons comptes font les bons amis',
    login: 'Connexion',
    register: 'Inscription',
    dashboard: 'Tableau de bord',
    statistics: 'Statistiques',
    getStarted: 'Commencer',
    loginPrompt: 'Connectez-vous pour gérer vos événements partagés',
    changeLanguage: 'Changer de langue',
    currentLanguage: 'Langue actuelle',
    selectLanguage: 'Sélectionner une langue',
    // Settings
    settings: 'Paramètres',
    settingsDescription: 'Gérez vos préférences, votre compte et vos paramètres de confidentialité',
    account: 'Compte',
    preferences: 'Préférences',
    privacy: 'Confidentialité',
    help: 'Aide',
    subscriptionPlan: 'Plan d\'abonnement',
    subscriptionDescription: 'Choisissez le plan qui correspond à vos besoins',
    free: 'Gratuit',
    premium: 'Premium',
    pro: 'Pro',
    popular: 'Populaire',
    perMonth: '/mois',
    security: 'Sécurité',
    securityDescription: 'Gérez la sécurité de votre compte',
    resetPassword: 'Réinitialiser le mot de passe',
    generalPreferences: 'Préférences générales',
    currency: 'Devise',
    language: 'Langue',
    languageDescription: 'La langue s\'applique aux pages publiques et aux paramètres de confidentialité',
    appearance: 'Apparence',
    theme: 'Thème',
    themeDescription: 'Choisissez entre le thème clair et sombre',
    light: 'Clair',
    dark: 'Sombre',
    privacySecurity: 'Confidentialité et sécurité',
    privacyPolicy: 'Politique de confidentialité',
    support: 'Support et assistance',
    helpCenter: 'Centre d\'aide',
    logout: 'Déconnexion',
    deleteAccount: 'Supprimer mon compte',
    // Currency names
    eur: 'EUR (€)',
    usd: 'USD ($)',
    gbp: 'GBP (£)',
    // Messages
    currencyUpdated: 'Devise mise à jour',
    currencyChanged: 'La devise a été changée en',
    languageUpdated: 'Langue mise à jour',
    languageChanged: 'La langue a été changée en',
    themeUpdated: 'Thème mis à jour',
    themeChanged: 'Le thème a été changé en',
    planUpdated: 'Plan mis à jour',
    planSubscribed: 'Vous avez souscrit au plan',
    emailSent: 'Email envoyé',
    resetPasswordSent: 'Les instructions de réinitialisation ont été envoyées à',
    logoutSuccess: 'Déconnexion réussie',
    logoutMessage: 'Vous avez été déconnecté avec succès.',
    accountDeleted: 'Compte supprimé',
    accountDeletedMessage: 'Votre compte a été supprimé avec succès.',
    // Confirmations
    confirmResetPassword: 'Réinitialiser le mot de passe',
    confirmResetPasswordDescription: 'Un email contenant les instructions de réinitialisation sera envoyé à votre adresse email. Êtes-vous sûr de vouloir continuer ?',
    confirmLogout: 'Déconnexion',
    confirmLogoutDescription: 'Êtes-vous sûr de vouloir vous déconnecter ?',
    confirmDeleteAccount: 'Supprimer mon compte',
    confirmDeleteAccountDescription: 'Cette action est irréversible. Toutes vos données seront définitivement supprimées. Êtes-vous absolument sûr de vouloir supprimer votre compte ?',
    cancel: 'Annuler',
    sendEmail: 'Envoyer l\'email',
    deletePermanently: 'Supprimer définitivement',
    // Subscription features
    upTo3Events: 'Jusqu\'à 3 événements',
    basicSupport: 'Support de base',
    essentialFeatures: 'Fonctionnalités essentielles',
    unlimitedEvents: 'Événements illimités',
    prioritySupport: 'Support prioritaire',
    advancedPdfExport: 'Export PDF avancé',
    detailedStats: 'Statistiques détaillées',
    allPremium: 'Tout Premium',
    customApi: 'API personnalisée',
    dedicatedSupport: 'Support dédié',
    advancedFeatures: 'Fonctionnalités avancées'
  },
  en: {
    welcome: 'Welcome to BONKONT',
    tagline: 'Good accounts make good friends',
    login: 'Login',
    register: 'Register',
    dashboard: 'Dashboard',
    statistics: 'Statistics',
    getStarted: 'Get Started',
    loginPrompt: 'Login to manage your shared events',
    changeLanguage: 'Change language',
    currentLanguage: 'Current language',
    selectLanguage: 'Select a language',
    // Settings
    settings: 'Settings',
    settingsDescription: 'Manage your preferences, account and privacy settings',
    account: 'Account',
    preferences: 'Preferences',
    privacy: 'Privacy',
    help: 'Help',
    subscriptionPlan: 'Subscription Plan',
    subscriptionDescription: 'Choose the plan that suits your needs',
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
    popular: 'Popular',
    perMonth: '/month',
    security: 'Security',
    securityDescription: 'Manage your account security',
    resetPassword: 'Reset Password',
    generalPreferences: 'General Preferences',
    currency: 'Currency',
    language: 'Language',
    languageDescription: 'The language applies to public pages and privacy settings',
    appearance: 'Appearance',
    theme: 'Theme',
    themeDescription: 'Choose between light and dark theme',
    light: 'Light',
    dark: 'Dark',
    privacySecurity: 'Privacy and Security',
    privacyPolicy: 'Privacy Policy',
    support: 'Support and Assistance',
    helpCenter: 'Help Center',
    logout: 'Logout',
    deleteAccount: 'Delete my account',
    // Currency names
    eur: 'EUR (€)',
    usd: 'USD ($)',
    gbp: 'GBP (£)',
    // Messages
    currencyUpdated: 'Currency updated',
    currencyChanged: 'Currency changed to',
    languageUpdated: 'Language updated',
    languageChanged: 'Language changed to',
    themeUpdated: 'Theme updated',
    themeChanged: 'Theme changed to',
    planUpdated: 'Plan updated',
    planSubscribed: 'You have subscribed to the',
    emailSent: 'Email sent',
    resetPasswordSent: 'Reset instructions have been sent to',
    logoutSuccess: 'Logout successful',
    logoutMessage: 'You have been successfully logged out.',
    accountDeleted: 'Account deleted',
    accountDeletedMessage: 'Your account has been successfully deleted.',
    // Confirmations
    confirmResetPassword: 'Reset Password',
    confirmResetPasswordDescription: 'An email containing reset instructions will be sent to your email address. Are you sure you want to continue?',
    confirmLogout: 'Logout',
    confirmLogoutDescription: 'Are you sure you want to logout?',
    confirmDeleteAccount: 'Delete my account',
    confirmDeleteAccountDescription: 'This action is irreversible. All your data will be permanently deleted. Are you absolutely sure you want to delete your account?',
    cancel: 'Cancel',
    sendEmail: 'Send email',
    deletePermanently: 'Delete permanently',
    // Subscription features
    upTo3Events: 'Up to 3 events',
    basicSupport: 'Basic support',
    essentialFeatures: 'Essential features',
    unlimitedEvents: 'Unlimited events',
    prioritySupport: 'Priority support',
    advancedPdfExport: 'Advanced PDF export',
    detailedStats: 'Detailed statistics',
    allPremium: 'All Premium',
    customApi: 'Custom API',
    dedicatedSupport: 'Dedicated support',
    advancedFeatures: 'Advanced features'
  }
};

export const useI18nStore = create(
  persist(
    (set, get) => ({
      currentLanguage: languages[0],
      setLanguage: (code) => {
        const language = languages.find(lang => lang.code === code);
        if (language) {
          set({ currentLanguage: language });
        }
      },
      t: (key) => {
        const { currentLanguage } = get();
        return translations[currentLanguage.code]?.[key] || translations.en[key] || key;
      }
    }),
    {
      name: 'bonkont-language'
    }
  )
);

export function detectBrowserLanguage() {
  const browserLang = navigator.language.split('-')[0];
  return languages.some(lang => lang.code === browserLang) ? browserLang : 'fr';
}