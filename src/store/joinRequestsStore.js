import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store pour les demandes de participation en attente
 * Ces demandes sont créées par des participants qui n'ont pas encore l'événement dans leur localStorage
 * L'organisateur pourra les synchroniser manuellement
 */
export const useJoinRequestsStore = create()(
  persist(
    (set) => ({
      requests: [],
      
      /**
       * Ajoute une demande de participation
       * @param {Object} requestData - Données de la demande
       * @returns {string} ID de la demande
       */
      addRequest: (requestData) => {
        const requestId = requestData.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newRequest = {
          ...requestData,
          id: requestId,
          createdAt: new Date().toISOString(),
          status: 'pending', // pending, accepted, rejected
        };
        set((state) => ({
          requests: [newRequest, ...state.requests]
        }));
        return requestId;
      },

      /**
       * Supprime une demande
       * @param {string} requestId - ID de la demande
       */
      deleteRequest: (requestId) => set((state) => ({
        requests: state.requests.filter(r => r.id !== requestId)
      })),

      /**
       * Récupère les demandes pour un code d'événement
       * @param {string} eventCode - Code de l'événement
       * @returns {Array} Liste des demandes
       */
      getRequestsByEventCode: (eventCode) => {
        const state = useJoinRequestsStore.getState();
        return state.requests.filter(r => 
          r.eventCode?.toUpperCase() === eventCode?.toUpperCase() && 
          r.status === 'pending'
        );
      },

      /**
       * Marque une demande comme acceptée
       * @param {string} requestId - ID de la demande
       */
      acceptRequest: (requestId) => set((state) => ({
        requests: state.requests.map(r =>
          r.id === requestId ? { ...r, status: 'accepted' } : r
        )
      })),

      /**
       * Marque une demande comme rejetée
       * @param {string} requestId - ID de la demande
       */
      rejectRequest: (requestId) => set((state) => ({
        requests: state.requests.map(r =>
          r.id === requestId ? { ...r, status: 'rejected' } : r
        )
      })),
    }),
    {
      name: 'bonkont-join-requests',
      partialize: (state) => ({ requests: state.requests }),
    }
  )
);

