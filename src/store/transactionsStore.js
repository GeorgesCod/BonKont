import { create } from 'zustand';
import { nanoid } from 'nanoid';

/**
 * Store des transactions par événement.
 * Règle BonKont : la source de vérité est Firestore (events/{eventId}/transactions).
 * Ce store est alimenté par listenEventTransactions() ; ne pas persister en local
 * pour que tous les participants voient les mêmes données (sync partagée).
 */
export const useTransactionsStore = create()((set, get) => ({
  transactions: [],

  /** Remplace les transactions d’un événement (appelé par l’abonnement Firestore). */
  setTransactionsForEvent: (eventId, transactionsList) => {
    const eventIdStr = String(eventId);
    set((state) => {
      const others = state.transactions.filter((t) => String(t.eventId) !== eventIdStr);
      const withEventId = (transactionsList || []).map((t) => ({ ...t, eventId: t.eventId || eventIdStr }));
      return { transactions: [...others, ...withEventId] };
    });
  },

  addTransaction: (eventId, transactionData) => set((state) => {
    const newTransaction = {
      id: nanoid(),
      eventId,
      ...transactionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return { transactions: [newTransaction, ...state.transactions] };
  }),

  updateTransaction: (transactionId, updates) => set((state) => ({
    transactions: state.transactions.map((t) =>
      t.id === transactionId ? { ...t, ...updates, updatedAt: new Date() } : t
    ),
  })),

  deleteTransaction: (transactionId) => set((state) => ({
    transactions: state.transactions.filter((t) => t.id !== transactionId),
  })),

  getTransactionsByEvent: (eventId) => {
    const state = get();
    return state.transactions.filter((t) => String(t.eventId) === String(eventId));
  },
}));
