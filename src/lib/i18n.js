import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = {
  code: string;
  name: string;
  flag: string;
};

export const languages: Language[] = [
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
    selectLanguage: 'Sélectionner une langue'
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
    selectLanguage: 'Select a language'
  }
};

interface I18nStore {
  currentLanguage: Language;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set, get) => ({
      currentLanguage: languages[0],
      setLanguage: (code) => {
        const language = languages.find(lang => lang.code === code);
        if (language) {
          set({ currentLanguage: language });
        }
      },
      t: (key: string) => {
        const { currentLanguage } = get();
        return translations[currentLanguage.code]?.[key] || translations.en[key] || key;
      }
    }),
    {
      name: 'bonkont-language'
    }
  )
);

export function detectBrowserLanguage(): string {
  const browserLang = navigator.language.split('-')[0];
  return languages.some(lang => lang.code === browserLang) ? browserLang : 'fr';
}