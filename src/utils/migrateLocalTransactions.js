/**
 * Migration unique : envoie les transactions encore présentes dans le localStorage
 * (ancien store persist "bonkont-transactions") vers Firestore, puis nettoie le local.
 * Ainsi les données ne "disparaissent" pas : elles deviennent la vérité Firestore.
 *
 * S'exécute une seule fois par appareil (flag bonkont-transactions-migrated).
 */

const LOCAL_KEY = 'bonkont-transactions';
const MIGRATED_KEY = 'bonkont-transactions-migrated';

/**
 * Lit le contenu persisté par zustand (format attendu : { state: { transactions: [] }, version?: number }).
 * @returns {Array} Liste des transactions ou []
 */
function getOldLocalTransactions() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = parsed?.state?.transactions ?? parsed?.transactions ?? [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Prépare les données d'une transaction pour Firestore (sans id local, dates conservées).
 */
function toFirestoreTransaction(t) {
  const { id, ...rest } = t;
  return {
    ...rest,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    date: t.date,
    paidDate: t.paidDate,
  };
}

/**
 * Lance la migration si nécessaire.
 * À appeler une fois au chargement de l'app, quand le store événements est disponible.
 * @param {Object} options - { getEvents: () => Array, addTransactionToFirestore: (eventId, data) => Promise<string> }
 */
export async function migrateLocalTransactionsToFirestore(options) {
  const { getEvents, addTransactionToFirestore } = options || {};
  if (!getEvents || !addTransactionToFirestore) return;

  try {
    if (localStorage.getItem(MIGRATED_KEY) === 'true') return;
  } catch {
    return;
  }

  const oldTransactions = getOldLocalTransactions();
  if (oldTransactions.length === 0) {
    try {
      localStorage.setItem(MIGRATED_KEY, 'true');
      localStorage.removeItem(LOCAL_KEY);
    } catch {}
    return;
  }

  const events = getEvents();
  const eventById = new Map();
  events.forEach((e) => {
    if (e.id) eventById.set(String(e.id), e);
    if (e.firestoreId) eventById.set(String(e.firestoreId), e);
  });

  // Si des transactions locales existent mais aucun événement chargé, on ne marque pas migré pour réessayer plus tard
  if (events.length === 0) return;

  let migrated = 0;
  let skipped = 0;

  for (const t of oldTransactions) {
    const eventId = t.eventId != null ? String(t.eventId) : null;
    if (!eventId) {
      skipped++;
      continue;
    }
    const event = eventById.get(eventId);
    const effectiveEventId = event ? (event.firestoreId || event.id) : eventId;

    try {
      await addTransactionToFirestore(effectiveEventId, toFirestoreTransaction(t));
      migrated++;
    } catch (err) {
      console.warn('[migrateLocalTransactions] Skip transaction:', t.id || t.eventId, err?.message || err);
      skipped++;
    }
  }

  try {
    localStorage.setItem(MIGRATED_KEY, 'true');
    localStorage.removeItem(LOCAL_KEY);
  } catch {}

  if (migrated > 0 && import.meta.env.DEV) {
    console.log('[migrateLocalTransactions] Migrated', migrated, 'transactions to Firestore, skipped', skipped);
  }
}
