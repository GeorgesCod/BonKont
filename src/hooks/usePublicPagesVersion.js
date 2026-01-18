import { useEffect, useState } from 'react';
import { PUBLIC_PAGES_VERSION } from '@/utils/publicPagesVersion';

/**
 * Hook pour vérifier et afficher la version des pages publiques
 * Utile pour le développement et le débogage
 */
export function usePublicPagesVersion() {
  const [version, setVersion] = useState(null);
  const [isUpToDate, setIsUpToDate] = useState(true);

  useEffect(() => {
    setVersion(PUBLIC_PAGES_VERSION);
    // Ici, on pourrait ajouter une vérification plus poussée
    // par exemple, comparer avec une version serveur
    setIsUpToDate(true);
  }, []);

  return {
    version,
    isUpToDate,
    lastUpdate: version?.lastUpdate,
    changes: version?.changes || []
  };
}

/**
 * Fonction utilitaire pour afficher les informations de version
 * dans la console (mode développement uniquement)
 */
export function logPublicPagesVersion() {
  if (import.meta.env.DEV) {
    console.group('📄 Pages Publiques Bonkont');
    console.log('Version:', PUBLIC_PAGES_VERSION.version);
    console.log('Dernière mise à jour:', PUBLIC_PAGES_VERSION.lastUpdate);
    console.log('Changements:', PUBLIC_PAGES_VERSION.changes);
    console.groupEnd();
  }
}

