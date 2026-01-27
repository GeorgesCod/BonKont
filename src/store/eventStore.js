import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { generateEventCode } from '@/lib/auth';

export const useEventStore = create()(
  persist(
    (set) => ({
      events: [],
      
      addEvent: (eventData) => {
        const now = new Date();
        const eventId = eventData.id || nanoid();

        // Normaliser le code pour comparer proprement (évite les doublons d'événements)
        const normalizeCode = (code) =>
          (code || '')
            .toString()
            .toUpperCase()
            .replace(/[^A-Z]/g, '');

        set((state) => {
          const normalizedNewCode = normalizeCode(eventData.code);

          // Chercher un éventuel événement déjà présent (même Firestore ID ou même code/organisateur)
          const existingIndex = state.events.findIndex((event) => {
            const sameId =
              (eventData.id &&
                (String(event.id) === String(eventData.id) ||
                  String(event.firestoreId) === String(eventData.id))) ||
              (eventData.firestoreId &&
                (String(event.id) === String(eventData.firestoreId) ||
                  String(event.firestoreId) === String(eventData.firestoreId)));

            const sameCodeAndOrganizer =
              normalizedNewCode &&
              normalizeCode(event.code) === normalizedNewCode &&
              (!!event.organizerId && !!eventData.organizerId
                ? String(event.organizerId).toLowerCase().trim() ===
                  String(eventData.organizerId).toLowerCase().trim()
                : false);

            return sameId || sameCodeAndOrganizer;
          });

          const baseEvent = {
            ...eventData,
            id: eventId,
            code: eventData.code || generateEventCode(),
            createdAt: eventData.createdAt || now,
            updatedAt: now,
            ratings: eventData.ratings || [],
          };

          // Si un événement équivalent existe déjà, on le met à jour au lieu de créer un doublon
          if (existingIndex !== -1) {
            const updatedEvents = [...state.events];
            updatedEvents[existingIndex] = {
              ...updatedEvents[existingIndex],
              ...baseEvent,
              // Toujours conserver l'ID Firestore si connu
              firestoreId:
                updatedEvents[existingIndex].firestoreId ||
                eventData.firestoreId ||
                eventData.id ||
                updatedEvents[existingIndex].id,
              updatedAt: now,
            };
            return { events: updatedEvents };
          }

          // Sinon, on ajoute simplement le nouvel événement en tête de liste
          return {
            events: [baseEvent, ...state.events],
          };
        });

        return eventId;
      },

      updateEvent: (id, updates) => set((state) => ({
        events: state.events.map((event) =>
          event.id === id
            ? { ...event, ...updates, updatedAt: new Date() }
            : event
        ),
      })),

      deleteEvent: (id) =>
        set((state) => {
          // Identifier l'événement cible pour pouvoir supprimer aussi ses doublons éventuels
          const target = state.events.find(
            (event) =>
              String(event.id) === String(id) ||
              (event.firestoreId && String(event.firestoreId) === String(id))
          );

          const normalizeCode = (code) =>
            (code || '')
              .toString()
              .toUpperCase()
              .replace(/[^A-Z]/g, '');

          if (!target) {
            // Fallback : suppression simple par ID
            return {
              events: state.events.filter((event) => String(event.id) !== String(id)),
            };
          }

          const targetCode = normalizeCode(target.code);
          const targetFirestoreId = target.firestoreId
            ? String(target.firestoreId)
            : null;

          return {
            events: state.events.filter((event) => {
              const sameId = String(event.id) === String(id);
              const sameFirestoreId =
                targetFirestoreId &&
                (String(event.id) === targetFirestoreId ||
                  String(event.firestoreId) === targetFirestoreId);
              const sameCode =
                targetCode &&
                normalizeCode(event.code) === targetCode &&
                // On vérifie aussi l'organisateur pour éviter de supprimer un autre événement légitime
                (!!event.organizerId && !!target.organizerId
                  ? String(event.organizerId).toLowerCase().trim() ===
                    String(target.organizerId).toLowerCase().trim()
                  : false);

              // On garde uniquement les événements qui ne correspondent PAS à la cible
              return !(sameId || sameFirestoreId || sameCode);
            }),
          };
        }),

      updateParticipant: (eventId, participantId, updates) => set((state) => ({
        events: state.events.map((event) => {
          if (event.id !== eventId) return event;

          const updatedParticipants = event.participants.map((participant) => {
            if (participant.id !== participantId) return participant;

            const updatedParticipant = { ...participant, ...updates };

            // Calculate score based on payment timing
            if (updates.hasPaid && updates.paidDate) {
              const paymentDelay = Math.floor(
                (new Date(updates.paidDate).getTime() - new Date(event.startDate).getTime()) 
                / (1000 * 60 * 60 * 24)
              );
              
              updatedParticipant.score = Math.max(
                0,
                100 - (paymentDelay * 5) // -5 points per day of delay
              );
            }

            return updatedParticipant;
          });

          // Update payment ranks
          const paidParticipants = updatedParticipants
            .filter(p => p.hasPaid)
            .sort((a, b) => {
              if (!a.paidDate || !b.paidDate) return 0;
              return new Date(a.paidDate).getTime() - new Date(b.paidDate).getTime();
            });

          paidParticipants.forEach((p, index) => {
            const participant = updatedParticipants.find(up => up.id === p.id);
            if (participant) {
              participant.paymentRank = index + 1;
            }
          });

          return {
            ...event,
            updatedAt: new Date(),
            participants: updatedParticipants,
            totalPaid: updatedParticipants.reduce((sum, p) => sum + (p.paidAmount || 0), 0),
          };
        }),
      })),

      addRating: (eventId, rating) => set((state) => ({
        events: state.events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                ratings: [...event.ratings, rating],
                updatedAt: new Date(),
              }
            : event
        ),
      })),
    }),
    {
      name: 'bonkont-events',
      partialize: (state) => ({ events: state.events }),
    }
  )
);