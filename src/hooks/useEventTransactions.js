import { useEffect, useMemo } from 'react';
import { listenEventTransactions } from '@/services/api';
import { useTransactionsStore } from '@/store/transactionsStore';

/**
 * Abonnement aux transactions Firestore pour un événement (sync partagée entre tous les participants).
 * À utiliser dans les écrans qui affichent ou modifient les transactions.
 * @param {Object} event - Objet événement (doit avoir id et/ou firestoreId)
 * @returns {{ transactions: Array, effectiveEventId: string, isReady: boolean }}
 */
export function useEventTransactions(event) {
  const setTransactionsForEvent = useTransactionsStore((s) => s.setTransactionsForEvent);
  const getTransactionsByEvent = useTransactionsStore((s) => s.getTransactionsByEvent);

  const effectiveEventId = useMemo(() => {
    if (!event) return null;
    return event.firestoreId || event.id || null;
  }, [event?.id, event?.firestoreId]);

  useEffect(() => {
    if (!effectiveEventId) return;
    const unsubscribe = listenEventTransactions(effectiveEventId, (transactions) => {
      setTransactionsForEvent(effectiveEventId, transactions);
    });
    return unsubscribe;
  }, [effectiveEventId, setTransactionsForEvent]);

  const transactions = effectiveEventId ? getTransactionsByEvent(effectiveEventId) : [];
  return {
    transactions,
    effectiveEventId,
    isReady: effectiveEventId != null,
  };
}
