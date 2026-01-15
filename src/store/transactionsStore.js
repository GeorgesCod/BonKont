import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export const useTransactionsStore = create()(
  persist(
    (set) => ({
      transactions: [],
      
      addTransaction: (eventId, transactionData) => set((state) => {
        console.log('[TransactionsStore] ⚠️ ADDING TRANSACTION:', { 
          eventId, 
          transactionData,
          source: transactionData.source,
          participants: transactionData.participants,
          payerId: transactionData.payerId,
          amount: transactionData.amount
        });
        const newTransaction = {
          id: nanoid(),
          eventId,
          ...transactionData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        console.log('[TransactionsStore] ✅ Transaction créée:', {
          id: newTransaction.id,
          eventId: newTransaction.eventId,
          source: newTransaction.source,
          participants: newTransaction.participants,
          payerId: newTransaction.payerId,
          amount: newTransaction.amount
        });
        return { transactions: [newTransaction, ...state.transactions] };
      }),

      updateTransaction: (transactionId, updates) => set((state) => {
        console.log('[TransactionsStore] Updating transaction:', { transactionId, updates });
        return {
          transactions: state.transactions.map((transaction) =>
            transaction.id === transactionId
              ? { ...transaction, ...updates, updatedAt: new Date() }
              : transaction
          ),
        };
      }),

      deleteTransaction: (transactionId) => set((state) => {
        console.log('[TransactionsStore] Deleting transaction:', transactionId);
        return {
          transactions: state.transactions.filter((t) => t.id !== transactionId),
        };
      }),

      getTransactionsByEvent: (eventId) => {
        const state = useTransactionsStore.getState();
        const filtered = state.transactions.filter((t) => t.eventId === eventId);
        console.log('[TransactionsStore] Getting transactions for event:', { eventId, count: filtered.length });
        return filtered;
      },
    }),
    {
      name: 'bonkont-transactions',
      partialize: (state) => ({ transactions: state.transactions }),
    }
  )
);

