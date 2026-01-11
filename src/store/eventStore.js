import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export const useEventStore = create()(
  persist(
    (set) => ({
      events: [],
      
      addEvent: (eventData) => set((state) => {
        const now = new Date();
        const newEvent = {
          ...eventData,
          id: nanoid(),
          code: nanoid(8).toUpperCase(),
          createdAt: now,
          updatedAt: now,
          ratings: [],
        };
        return { events: [newEvent, ...state.events] };
      }),

      updateEvent: (id, updates) => set((state) => ({
        events: state.events.map((event) =>
          event.id === id
            ? { ...event, ...updates, updatedAt: new Date() }
            : event
        ),
      })),

      deleteEvent: (id) => set((state) => ({
        events: state.events.filter((event) => event.id !== id),
      })),

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