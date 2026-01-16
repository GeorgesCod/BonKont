/**
 * Module Bonkont : Calcul des soldes et répartition avec POT (Cagnotte)
 * 
 * Modèle POT : La cagnotte est un acteur comptable (compte de groupe)
 * - Reçoit les contributions (cash dans enveloppe, virement, etc.)
 * - Peut payer des dépenses directement
 * - Peut rembourser des participants qui ont avancé
 * 
 * Logique équitable basée sur :
 * - Consommation réelle (dépenses réparties sur concernés)
 * - Mise de fonds réelle (contributions + avances + paiements directs - reçus - remboursements)
 * - Solde = Mise - Consommation
 * 
 * Test de cohérence : Σ soldes participants + soldePOT = 0
 */

// ID constant pour POT (la cagnotte)
export const POT_ID = 'POT';
export const POT_NAME = 'Cagnotte';

/**
 * Identifie si une transaction est une contribution vers POT
 */
function isContribution(transaction, eventId) {
  const fromId = transaction.fromId || transaction.from;
  const toId = transaction.toId || transaction.to;
  const transactionEventId = transaction.eventId || eventId;
  const hasParticipants = transaction.participants && transaction.participants.length > 0;
  const isPaymentType = transaction.type === 'payment' || transaction.type === 'CONTRIBUTION';
  const isPaymentSource = transaction.source === 'payment';
  
  // Log de débogage pour toutes les transactions de type payment
  if (isPaymentType || isPaymentSource) {
    console.log('[isContribution] 🔍 Analyse transaction payment:', {
      transactionId: transaction.id,
      fromId,
      toId,
      transactionEventId,
      eventId,
      type: transaction.type,
      source: transaction.source,
      amount: transaction.amount,
      hasParticipants,
      participants: transaction.participants,
      toIdString: String(toId),
      eventIdString: String(eventId),
      transactionEventIdString: String(transactionEventId)
    });
  }
  
  // Si pas de fromId, ce n'est pas une contribution
  if (!fromId) {
    return false;
  }
  
  // Si c'est un remboursement POT → participant, ce n'est pas une contribution
  if (isPotPayout(transaction)) {
    return false;
  }
  
  // PRIORITÉ 1: Si c'est un paiement vers POT (toId === eventId ou POT_ID), c'est une contribution
  // Vérifier cela AVANT de vérifier isExpense() pour éviter les faux négatifs
  
  // Cas 1: toId === POT_ID (explicite)
  if (toId === POT_ID) {
    console.log('[isContribution] ✅ Contribution identifiée (toId === POT_ID):', {
      transactionId: transaction.id,
      fromId,
      toId,
      amount: transaction.amount
    });
    return true;
  }
  
  // Cas 2: toId === eventId (cagnotte de l'événement)
  // Comparer avec transaction.eventId si disponible, sinon avec eventId passé en paramètre
  // Utiliser String() pour éviter les problèmes de type (string vs number)
  // IMPORTANT: Vérifier toutes les combinaisons possibles
  const toIdMatchesEventId = toId && (
    String(toId) === String(transactionEventId) || 
    String(toId) === String(eventId) ||
    toId === transactionEventId ||
    toId === eventId ||
    String(toId).trim() === String(transactionEventId).trim() ||
    String(toId).trim() === String(eventId).trim()
  );
  
  if (toIdMatchesEventId) {
    // Si toId === eventId ET (pas de participants OU type payment), c'est une contribution
    // Les contributions vers POT ne devraient PAS avoir de participants
    if (!hasParticipants || isPaymentType || isPaymentSource) {
      console.log('[isContribution] ✅ Contribution identifiée (toId === eventId):', {
        transactionId: transaction.id,
        fromId,
        toId,
        transactionEventId,
        eventId,
        toIdString: String(toId),
        eventIdString: String(eventId),
        transactionEventIdString: String(transactionEventId),
        amount: transaction.amount,
        type: transaction.type,
        source: transaction.source,
        hasParticipants,
        isPaymentType,
        isPaymentSource
      });
      return true;
    }
  }
  
  // Cas 3: Pas de toId explicite mais type/source indique un paiement vers POT
  if (!toId && (transaction.type === 'CONTRIBUTION' || isPaymentSource || isPaymentType)) {
    // Vérifier qu'il n'y a pas de participants (sinon c'est une dépense)
    if (!hasParticipants) {
      console.log('[isContribution] ✅ Contribution identifiée (pas de toId, type payment, pas de participants):', {
        transactionId: transaction.id,
        fromId,
        type: transaction.type,
        source: transaction.source,
        amount: transaction.amount
      });
      return true;
    }
  }
  
  // Si c'est une dépense (a des participants concernés), ce n'est pas une contribution
  // IMPORTANT: Vérifier isExpense() APRÈS avoir vérifié les cas de contribution
  if (isExpense(transaction)) {
    if (isPaymentType || isPaymentSource) {
      console.log('[isContribution] ❌ Rejetée car identifiée comme dépense:', {
        transactionId: transaction.id,
        hasParticipants,
        toId,
        eventId
      });
    }
    return false;
  }
  
  if (isPaymentType || isPaymentSource) {
    console.log('[isContribution] ❌ Transaction payment non identifiée comme contribution:', {
      transactionId: transaction.id,
      fromId,
      toId,
      transactionEventId,
      eventId,
      type: transaction.type,
      source: transaction.source,
      hasParticipants,
      toIdMatchesEventId
    });
  }
  
  return false;
}

/**
 * Identifie si une transaction est un remboursement POT → participant
 */
function isPotPayout(transaction) {
  const fromId = transaction.fromId || transaction.from;
  return fromId === POT_ID || transaction.type === 'POT_PAYOUT';
}

/**
 * Identifie si une dépense est payée par POT
 */
function isPaidByPot(transaction) {
  const payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId;
  return payerId === POT_ID || transaction.payerId === POT_ID;
}

/**
 * Identifie si une transaction est validée collectivement par tous les participants
 * 
 * RÈGLE BONKONT : "Que je paie ou dépense, je consomme comme toi, cette avance tu dois me la rembourser, et vice versa, on est quittes"
 * 
 * Si une transaction est validée collectivement, elle est automatiquement équilibrée :
 * - Tous les participants concernés consomment au prorata
 * - Le payeur avance le montant total mais consomme seulement sa part
 * - Les autres participants doivent rembourser leur part au payeur
 * 
 * @param {Object} transaction - Transaction à vérifier
 * @param {Object} event - Événement contenant la liste des participants
 * @returns {boolean} True si la transaction est validée collectivement
 */
function isCollectivelyValidated(transaction, event) {
  // Vérifier les champs de validation collective
  const validatedBy = transaction.validatedBy || [];
  const validationCount = transaction.validationCount || 0;
  const totalValidators = transaction.totalValidators || 0;
  const eventParticipants = event?.participants || [];
  const otherParticipantsCount = Math.max(0, eventParticipants.length - 1); // Exclure le payeur
  
  // Une transaction est validée collectivement si :
  // 1. Elle a un champ validatedBy avec tous les autres participants
  // 2. OU validationCount >= totalValidators (tous ont validé)
  // 3. OU validationCount >= otherParticipantsCount (tous les autres ont validé)
  
  const isFullyValidated = validationCount > 0 && (
    (totalValidators > 0 && validationCount >= totalValidators) ||
    (otherParticipantsCount > 0 && validationCount >= otherParticipantsCount) ||
    (validatedBy.length > 0 && validatedBy.length >= otherParticipantsCount)
  );
  
  if (isFullyValidated) {
    console.log('[isCollectivelyValidated] ✅ Transaction validée collectivement:', {
      transactionId: transaction.id,
      validatedBy,
      validationCount,
      totalValidators,
      otherParticipantsCount,
      eventParticipantsCount: eventParticipants.length
    });
  }
  
  return isFullyValidated;
}

/**
 * Détermine les participants concernés par une dépense selon la règle Bonkont
 * 
 * RÈGLE BONKONT : Seuls les participants qui valident une dépense ou une avance sont redevables au payeur au prorata.
 * La validation (complète ou partielle) détermine la règle de répartition et de transferts.
 * 
 * Exemple : 10 personnes dans un événement, A fait une dépense validée par B et C seulement
 * → Seuls A, B et C sont concernés par la répartition équitable
 * 
 * @param {Object} transaction - Transaction à analyser
 * @param {Object} event - Événement contenant la liste des participants
 * @returns {Array<string>} Liste des IDs des participants concernés par la dépense
 */
function getParticipantsConcernedByExpense(transaction, event) {
  const payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || null;
  const validatedBy = transaction.validatedBy || [];
  const paidByPot = isPaidByPot(transaction);
  const eventParticipants = event?.participants || [];
  const allParticipantIds = eventParticipants.map(p => String(p.id));
  
  // Si dépense payée par POT ou sans payeur, utiliser les participants de la transaction
  if (paidByPot || !payerId) {
    const transactionParticipants = transaction.participants || [];
    const participantsConcerned = transactionParticipants.map(p => String(p)).filter(pId => allParticipantIds.includes(pId));
    
    // Si validée collectivement, tous les participants sont concernés
    if (isCollectivelyValidated(transaction, event)) {
      return allParticipantIds;
    }
    
    // Sinon, utiliser les participants de la transaction + les validateurs
    const result = new Set(participantsConcerned);
    validatedBy.forEach(validatorId => {
      const validatorIdStr = String(validatorId);
      if (allParticipantIds.includes(validatorIdStr)) {
        result.add(validatorIdStr);
      }
    });
    
    return Array.from(result);
  }
  
  // RÈGLE BONKONT : Le payeur est toujours inclus (il consomme aussi sa part)
  const participantsConcerned = new Set([String(payerId)]);
  
  // Si la transaction est validée collectivement (tous les participants), tous sont concernés
  if (isCollectivelyValidated(transaction, event)) {
    allParticipantIds.forEach(id => participantsConcerned.add(id));
  } else if (validatedBy.length > 0) {
    // Sinon, seuls le payeur + les validateurs sont concernés
    validatedBy.forEach(validatorId => {
      const validatorIdStr = String(validatorId);
      if (allParticipantIds.includes(validatorIdStr)) {
        participantsConcerned.add(validatorIdStr);
      }
    });
  } else {
    // Si aucune validation, utiliser les participants de la transaction (compatibilité avec anciennes données)
    const transactionParticipants = transaction.participants || [];
    transactionParticipants.forEach(pId => {
      const pIdStr = String(pId);
      if (allParticipantIds.includes(pIdStr)) {
        participantsConcerned.add(pIdStr);
      }
    });
    
    // Si le payeur est seul dans la transaction, inclure tous les participants (correction automatique)
    if (participantsConcerned.size === 1 && participantsConcerned.has(String(payerId))) {
      allParticipantIds.forEach(id => participantsConcerned.add(id));
      console.log('[getParticipantsConcernedByExpense] ⚠️ CORRECTION: Payeur seul sans validation, ajout de tous les participants:', {
        transactionId: transaction.id,
        payerId,
        message: 'Transaction sans validation détectée. Correction automatique: ajout de tous les participants.'
      });
    }
  }
  
  return Array.from(participantsConcerned);
}

/**
 * Identifie si une transaction est une dépense (vs paiement)
 */
function isExpense(transaction) {
  const fromId = transaction.fromId || transaction.from;
  const toId = transaction.toId || transaction.to;
  const hasParticipants = transaction.participants && transaction.participants.length > 0;
  const isPaymentType = transaction.type === 'payment' || transaction.type === 'CONTRIBUTION' || transaction.type === 'POT_PAYOUT';
  const isScannedOrManual = transaction.source === 'scanned_ticket' || transaction.source === 'manual';
  
  // PRIORITÉ ABSOLUE: Si c'est un paiement vers POT (contribution), ce n'est JAMAIS une dépense
  // Vérifier d'abord si c'est une contribution avant de vérifier si c'est une dépense
  if (fromId && !hasParticipants) {
    // Si pas de participants ET (toId === POT_ID ou type payment), c'est une contribution, pas une dépense
    if (toId === POT_ID || (isPaymentType && transaction.source === 'payment')) {
      return false;
    }
  }
  
  // Si c'est un paiement vers POT (toId === eventId) sans participants, c'est une contribution, pas une dépense
  // Note: on ne peut pas vérifier eventId ici car on ne l'a pas en paramètre, mais on peut vérifier le pattern
  if (fromId && toId && !hasParticipants && isPaymentType) {
    // Si c'est un type payment avec toId mais sans participants, c'est probablement une contribution
    return false;
  }
  
  // Une transaction est une dépense si :
  // 1. Elle a des participants concernés (obligatoire pour une dépense)
  // 2. Elle n'est pas un type de paiement vers POT
  // 3. OU elle est un ticket scanné/manuel (même avec payerId)
  
  if (!hasParticipants) {
    // Pas de participants = pas une dépense
    return false;
  }
  
  // Si c'est un type de paiement avec participants, ce n'est pas une dépense normale
  if (isPaymentType && !isScannedOrManual) {
    return false;
  }
  
  // Dépense si : a des participants ET (ticket scanné/manuel OU pas de type payment)
  const isExp = hasParticipants && (isScannedOrManual || !isPaymentType);
  
  if (isExp && transaction.source === 'scanned_ticket') {
    console.log('[isExpense] Dépense scannée identifiée:', {
      transactionId: transaction.id,
      participants: transaction.participants,
      payerId: transaction.payerId,
      amount: transaction.amount,
      source: transaction.source
    });
  }
  
  return isExp;
}

/**
 * Calcule la contribution totale d'un participant vers POT (cagnotte)
 * 
 * Cette fonction est la source unique de vérité pour les contributions vers POT.
 * Elle doit être utilisée partout : explication du solde, Budget repère, PDF, etc.
 * 
 * Utilise la même logique que isContribution() pour garantir la cohérence.
 * 
 * @param {string} participantId - ID du participant
 * @param {Object} event - Événement contenant l'ID
 * @param {Array} transactions - Liste de toutes les transactions
 * @returns {number} Montant total des contributions vers POT
 */
export function getContributionToPot(participantId, event, transactions) {
  if (!participantId || !event || !transactions || transactions.length === 0) {
    console.log('[getContributionToPot] ⚠️ Paramètres manquants:', {
      participantId,
      hasEvent: !!event,
      eventId: event?.id,
      transactionsCount: transactions?.length
    });
    return 0;
  }
  
  const eventId = event.id;
  
  console.log('[getContributionToPot] 🔍 Début calcul pour participant:', {
    participantId,
    eventId,
    transactionsCount: transactions.length,
    transactionsPayment: transactions.filter(t => t.type === 'payment' || t.source === 'payment').map(t => ({
      id: t.id,
      fromId: t.fromId || t.from,
      toId: t.toId || t.to,
      eventId: t.eventId,
      type: t.type,
      source: t.source,
      amount: t.amount,
      hasParticipants: !!(t.participants && t.participants.length > 0)
    }))
  });
  
  // Filtrer les contributions vers POT en utilisant DIRECTEMENT isContribution()
  // pour garantir 100% de cohérence avec computeBalances()
  const contributions = transactions.filter(t => {
    const fromId = t.fromId || t.from;
    
    // Vérifier que c'est bien ce participant qui contribue
    const isFromParticipant = fromId === participantId || String(fromId) === String(participantId);
    
    if (!isFromParticipant) {
      return false;
    }
    
    // Utiliser DIRECTEMENT isContribution() pour garantir la cohérence
    const isContrib = isContribution(t, eventId);
    
    if (isContrib) {
      console.log('[getContributionToPot] ✅ Contribution trouvée:', {
        transactionId: t.id,
        fromId,
        toId: t.toId || t.to,
        amount: t.amount,
        type: t.type,
        source: t.source
      });
    } else if (t.type === 'payment' || t.source === 'payment') {
      console.log('[getContributionToPot] ❌ Transaction payment non identifiée comme contribution:', {
        transactionId: t.id,
        fromId,
        toId: t.toId || t.to,
        eventId: t.eventId,
        eventIdParam: eventId,
        type: t.type,
        source: t.source,
        hasParticipants: !!(t.participants && t.participants.length > 0),
        toIdMatchesEventId: t.toId && (
          String(t.toId) === String(t.eventId || eventId) ||
          t.toId === (t.eventId || eventId)
        )
      });
    }
    
    return isContrib;
  });
  
  const total = contributions.reduce((sum, t) => {
    const amount = parseFloat(t.amount) || 0;
    return sum + amount;
  }, 0);
  
  console.log('[getContributionToPot] 📊 Résultat final:', {
    participantId,
    eventId,
    contributionsCount: contributions.length,
    total,
    contributionsDetails: contributions.map(c => ({
      id: c.id,
      amount: c.amount,
      fromId: c.fromId,
      toId: c.toId,
      eventId: c.eventId,
      type: c.type,
      source: c.source
    }))
  });
  
  return total;
}

/**
 * Calcule les soldes pour chaque participant + POT
 * 
 * @param {Object} event - L'événement avec participants
 * @param {Array} transactions - Toutes les transactions de l'événement
 * @returns {Object} - { balances: {...}, potBalance: {...}, isBalanced: boolean }
 */
export function computeBalances(event, transactions) {
  console.log('[computeBalances] ⚠️ DÉBUT CALCUL BALANCES:', {
    eventId: event?.id,
    eventTitle: event?.title,
    transactionsCount: transactions?.length,
    participantsCount: event?.participants?.length,
    transactionsDetails: transactions?.map(t => ({
      id: t.id,
      source: t.source,
      participants: t.participants,
      payerId: t.payerId,
      amount: t.amount,
      type: t.type
    }))
  });
  
  const participants = event.participants || [];
  const balances = {};
  const eventId = event.id;
  
  // Initialiser les soldes à 0 pour tous les participants
  participants.forEach(p => {
    balances[p.id] = {
      participantId: p.id,
      participantName: p.name || p.firstName || p.email || 'Participant inconnu',
      // Mise de fonds réelle
      contribution: 0,      // Contributions vers POT
      avance: 0,            // Dépenses avancées (payées pour les autres)
      paidOut: 0,           // Paiements directs vers d'autres participants
      received: 0,           // Paiements directs reçus d'autres participants
      rembPot: 0,           // Remboursements reçus de POT
      mise: 0,              // Total mise de fonds = contrib + avance + paidOut - received - rembPot
      // Consommation réelle
      consomme: 0,          // Ce qu'il a consommé (sa part des dépenses)
      // Solde provisoire équitable
      solde: 0              // solde = mise - consommation
    };
  });
  
  // Initialiser le solde POT
  const potBalance = {
    participantId: POT_ID,
    participantName: POT_NAME,
    contributions: 0,        // Total contributions reçues
    expensesPaid: 0,        // Total dépenses payées par POT
    payouts: 0,             // Total remboursements POT → participants
    solde: 0                // soldePOT = contributions - expensesPaid - payouts
  };
  
  // Séparer les transactions par type
  const contributions = transactions.filter(t => isContribution(t, eventId));
  const expenses = transactions.filter(t => isExpense(t));
  const directTransfers = transactions.filter(t => {
    const fromId = t.fromId || t.from;
    const toId = t.toId || t.to;
    // Transfert direct entre participants (pas vers POT, pas depuis POT)
    return fromId && toId && 
           fromId !== POT_ID && toId !== POT_ID &&
           fromId !== eventId && toId !== eventId &&
           balances[fromId] && balances[toId] &&
           !isContribution(t, eventId) && !isPotPayout(t);
  });
  const potPayouts = transactions.filter(t => isPotPayout(t));
  
  console.log('[computeBalances] Transactions séparées:', {
    total: transactions.length,
    contributions: contributions.length,
    expenses: expenses.length,
    directTransfers: directTransfers.length,
    potPayouts: potPayouts.length
  });
  
  // ===== A) CONTRIBUTIONS (participant → POT) =====
  console.log('[computeBalances] Traitement des contributions:', {
    contributionsCount: contributions.length,
    contributionsDetails: contributions.map(c => ({
      id: c.id,
      fromId: c.fromId || c.from,
      toId: c.toId || c.to,
      amount: c.amount,
      type: c.type,
      source: c.source,
      eventId: c.eventId
    }))
  });
  
  contributions.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const fromId = transaction.fromId || transaction.from;
    
    if (!fromId || amount === 0) {
      console.warn('[computeBalances] Contribution ignorée (pas de fromId ou montant 0):', {
        transactionId: transaction.id,
        fromId,
        amount
      });
      return;
    }
    
    if (!balances[fromId]) {
      console.warn('[computeBalances] Contribution ignorée (participant non trouvé):', {
        transactionId: transaction.id,
        fromId,
        amount,
        availableParticipants: Object.keys(balances)
      });
      return;
    }
    
    balances[fromId].contribution += amount;
    potBalance.contributions += amount;
    console.log('[computeBalances] ✅ Contribution comptabilisée:', {
      transactionId: transaction.id,
      fromId,
      participantName: balances[fromId].participantName,
      amount,
      contributionAvant: balances[fromId].contribution - amount,
      contributionApres: balances[fromId].contribution,
      totalContributionsPot: potBalance.contributions
    });
  });
  
  // ===== B) DÉPENSES =====
  let totalConsommation = 0;
  let totalAvances = 0;
  
  console.log('[computeBalances] Traitement des dépenses:', {
    expensesCount: expenses.length,
    expensesDetails: expenses.map(e => ({
      id: e.id,
      source: e.source,
      participants: e.participants,
      payerId: e.payerId,
      amount: e.amount
    }))
  });
  
  expenses.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    
    if (amount === 0) {
      console.warn('[computeBalances] Dépense ignorée (montant 0):', {
        transactionId: transaction.id,
        amount
      });
      return;
    }
    
    // Identifier le payeur AVANT de déterminer les participants concernés
    let payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || null;
    
    // Si pas de payeur identifié et ticket scanné, prendre le premier participant
    if (!payerId && transaction.source === 'scanned_ticket' && transaction.participants && transaction.participants.length > 0) {
      payerId = transaction.participants[0];
      console.log('[computeBalances] Payeur auto-assigné pour ticket scanné:', {
        transactionId: transaction.id,
        payerId,
        participants: transaction.participants
      });
    }
    
    // RÈGLE BONKONT : Seuls les participants qui valident une dépense ou une avance sont redevables au payeur au prorata.
    // La validation (complète ou partielle) détermine la règle de répartition et de transferts.
    // Exemple : 10 personnes dans un événement, A fait une dépense validée par B et C seulement
    // → Seuls A, B et C sont concernés par la répartition équitable
    const participantsConcerned = getParticipantsConcernedByExpense(transaction, { participants });
    
    if (participantsConcerned.length === 0) {
      console.warn('[computeBalances] Dépense ignorée (aucun participant concerné):', {
        transactionId: transaction.id,
        payerId,
        validatedBy: transaction.validatedBy || [],
        participants: transaction.participants || []
      });
      return;
    }
    
    console.log('[computeBalances] ✅ RÈGLE BONKONT APPLIQUÉE: Participants concernés déterminés par validation:', {
      transactionId: transaction.id,
      payerId,
      amount,
      validatedBy: transaction.validatedBy || [],
      validationCount: transaction.validationCount || 0,
      participantsConcerned,
      nombreParticipants: participantsConcerned.length,
      partParPersonne: (amount / participantsConcerned.length).toFixed(2) + '€',
      soldeAttenduPayeur: payerId ? (amount - amount / participantsConcerned.length).toFixed(2) + '€' : 'N/A',
      message: `RÈGLE BONKONT: Seuls les participants qui valident sont redevables. Payeur avance ${amount}€, chaque participant concerné (y compris le payeur) consomme ${(amount / participantsConcerned.length).toFixed(2)}€`
    });
    
    // Filtrer les participants valides
    const validParticipants = participantsConcerned.filter(pId => balances[pId]);
    
    if (validParticipants.length === 0) {
      console.warn(`[computeBalances] Dépense ignorée : aucun participant valide pour la transaction ${transaction.id}`, {
        transactionId: transaction.id,
        participantsConcerned,
        availableParticipantIds: Object.keys(balances)
      });
      return;
    }
    
    // Part de chacun (montant total divisé par le nombre de participants concernés)
    const share = amount / validParticipants.length;
    totalConsommation += amount; // La consommation totale = montant de la dépense
    
    // LOG DÉTAILLÉ POUR DIAGNOSTIC: Vérifier si c'est une transaction de 12.20€ entre 2 personnes
    if (Math.abs(amount - 12.20) < 0.01 && participants.length === 2) {
      console.warn('[computeBalances] 🔍 DIAGNOSTIC TRANSACTION 12.20€:', {
        transactionId: transaction.id,
        amount,
        participantsConcerned,
        validParticipants,
        validParticipantsCount: validParticipants.length,
        totalParticipantsEvent: participants.length,
        share,
        shareExpected: amount / 2,
        payerId,
        balancesBefore: validParticipants.map(pId => ({
          participantId: pId,
          consommeAvant: balances[pId].consomme,
          avanceAvant: balances[pId].avance
        }))
      });
    }
    
    // Vérifier si payé par POT
    const paidByPot = isPaidByPot(transaction);
    
    // VÉRIFICATION CRITIQUE: Si le payeur est dans la liste mais que le nombre de participants ne correspond pas
    // à ce qui est attendu pour une répartition équitable, logger un avertissement
    const payerIsInParticipants = payerId ? validParticipants.includes(payerId) : null;
    const expectedShareForTwo = amount / 2; // Si 2 participants dans l'événement
    const isShareIncorrect = payerIsInParticipants && validParticipants.length !== participants.length && Math.abs(share - expectedShareForTwo) > 0.01;
    
    console.log('[computeBalances] Traitement dépense:', {
      transactionId: transaction.id,
      source: transaction.source,
      amount,
      participantsConcerned,
      validParticipants,
      validParticipantsCount: validParticipants.length,
      totalParticipantsEvent: participants.length,
      payerId,
      paidByPot,
      share,
      shareFormatted: share.toFixed(2) + '€',
      payerIsInParticipants,
      calculSoldeAttendu: payerId && validParticipants.includes(payerId) 
        ? `Payeur avance ${amount}€, consomme ${share.toFixed(2)}€, solde attendu = ${(amount - share).toFixed(2)}€`
        : payerId 
          ? `⚠️ PROBLÈME: Payeur ${payerId} pas dans participants ${validParticipants.join(', ')}`
          : 'Pas de payeur identifié',
      verificationEquite: payerIsInParticipants && participants.length === 2
        ? `Pour 2 participants: part attendue = ${expectedShareForTwo.toFixed(2)}€, part calculée = ${share.toFixed(2)}€, ${isShareIncorrect ? '⚠️ INCOHÉRENT' : '✅ COHÉRENT'}`
        : null
    });
    
    if (paidByPot) {
      // Dépense payée par POT
      potBalance.expensesPaid += amount;
      
      // Chaque participant concerné consomme sa part
      validParticipants.forEach(participantId => {
        balances[participantId].consomme += share;
      });
      
      console.log('[computeBalances] Dépense payée par POT:', {
        transactionId: transaction.id,
        amount,
        participantsConcerned: validParticipants.length
      });
    } else if (payerId && balances[payerId]) {
      // Dépense payée par un participant
      // IMPORTANT: Le payeur avance le montant TOTAL, mais chaque participant (y compris le payeur) consomme seulement sa PART
      balances[payerId].avance += amount;
      totalAvances += amount;
      
      // Vérifier si le payeur est dans la liste des participants concernés
      const payerIsInParticipants = validParticipants.includes(payerId);
      
      // Chaque participant concerné consomme sa part (y compris le payeur s'il est dans la liste)
      validParticipants.forEach(participantId => {
        const consommeAvant = balances[participantId].consomme;
        balances[participantId].consomme += share;
        const consommeApres = balances[participantId].consomme;
        
        // LOG DÉTAILLÉ POUR DIAGNOSTIC: Vérifier si c'est une transaction de 12.20€ entre 2 personnes
        if (Math.abs(amount - 12.20) < 0.01 && participants.length === 2) {
          console.warn(`[computeBalances] 🔍 DIAGNOSTIC: Ajout consommation pour participant ${participantId}:`, {
            transactionId: transaction.id,
            participantId,
            consommeAvant,
            share,
            consommeApres,
            difference: consommeApres - consommeAvant,
            expectedShare: amount / 2,
            isValid: Math.abs(share - (amount / 2)) < 0.01
      });
    }
  });
  
      // Si le payeur n'est PAS dans la liste des participants, c'est un problème de données
      // Mais on ne peut pas le corriger ici, on doit juste logger
      if (!payerIsInParticipants) {
        console.warn('[computeBalances] ⚠️ ATTENTION: Payeur pas dans la liste des participants concernés:', {
          transactionId: transaction.id,
          payerId,
          participantsConcerned: validParticipants,
          amount,
          share
        });
      }
      
      // Calculer le solde attendu pour le payeur
      const soldePayeur = balances[payerId].avance - balances[payerId].consomme;
      const soldeAttendu = amount - share; // Ce que le payeur devrait recevoir
      
      // Détecter si c'est une transaction suspecte (payeur seul dans participants)
      const isSuspectTransaction = validParticipants.length === 1 && validParticipants[0] === payerId && amount > 10;
      
      console.log('[computeBalances] Dépense payée par participant:', {
        transactionId: transaction.id,
        payerId,
        amount,
        avanceAvant: balances[payerId].avance - amount,
        avanceApres: balances[payerId].avance,
        participantsConcerned: validParticipants,
        participantsCount: validParticipants.length,
        consommationParPersonne: share,
        consommationPayeur: balances[payerId].consomme,
        soldePayeur,
        soldeAttendu,
        payerIsInParticipants,
        isSuspectTransaction,
        message: isSuspectTransaction 
          ? `⚠️ ATTENTION: Transaction suspecte - Le payeur ${payerId} est seul dans la liste des participants. ` +
            `Si c'est une dépense partagée, il faut ajouter tous les participants concernés dans la transaction. ` +
            `Actuellement: payeur avance ${amount}€ et consomme ${share}€ (solde = ${soldePayeur.toFixed(2)}€). ` +
            `Si c'était partagé entre 4 personnes: payeur consommerait ${(amount/4).toFixed(2)}€ (solde = ${(amount - amount/4).toFixed(2)}€).`
          : `✅ Transaction normale - Payeur avance ${amount}€, consomme ${share}€, solde = ${soldePayeur.toFixed(2)}€`
      });
    } else {
      // Dépense équitable (pas de payeur identifié)
      // Chaque participant concerné consomme sa part, personne n'avance
      validParticipants.forEach(participantId => {
        balances[participantId].consomme += share;
      });
      
      console.log('[computeBalances] Dépense équitable (pas de payeur):', {
        transactionId: transaction.id,
        amount,
        participantsConcerned: validParticipants.length
      });
    }
  });
  
  console.log('[computeBalances] Dépenses traitées:', {
    totalConsommation,
    totalAvances,
    expensesPaidByPot: potBalance.expensesPaid
  });
  
  // ===== C) TRANSFERTS DIRECTS ENTRE PARTICIPANTS =====
  directTransfers.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const fromId = transaction.fromId || transaction.from;
    const toId = transaction.toId || transaction.to;
    
    if (!fromId || !toId || amount === 0 || !balances[fromId] || !balances[toId]) return;
    
    balances[fromId].paidOut += amount;
    balances[toId].received += amount;
  });
  
  // ===== D) REMBOURSEMENTS POT → PARTICIPANTS =====
  potPayouts.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const toId = transaction.toId || transaction.to;
    
    if (!toId || amount === 0 || !balances[toId]) return;
    
    balances[toId].rembPot += amount;
    potBalance.payouts += amount;
  });
  
  // ===== CALCUL DES MISES DE FONDS RÉELLES =====
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    balance.mise = balance.contribution + balance.avance + balance.paidOut - balance.received - balance.rembPot;
  });
  
  // ===== CALCUL DES SOLDES PROVISOIRES =====
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    balance.solde = balance.mise - balance.consomme;
  });
  
  // ===== CALCUL DU SOLDE POT =====
  potBalance.solde = potBalance.contributions - potBalance.expensesPaid - potBalance.payouts;
  
  // ===== TEST DE COHÉRENCE =====
  const totalSoldeParticipants = Object.values(balances).reduce((sum, b) => sum + b.solde, 0);
  const totalSolde = totalSoldeParticipants + potBalance.solde;
  const isBalanced = Math.abs(totalSolde) <= 0.01;
  
  // Logs détaillés pour diagnostic
  const totalMise = Object.values(balances).reduce((sum, b) => sum + b.mise, 0);
  const totalConsomme = Object.values(balances).reduce((sum, b) => sum + b.consomme, 0);
  const totalContribution = Object.values(balances).reduce((sum, b) => sum + b.contribution, 0);
  const totalAvance = Object.values(balances).reduce((sum, b) => sum + b.avance, 0);
  const totalPaidOut = Object.values(balances).reduce((sum, b) => sum + b.paidOut, 0);
  const totalReceived = Object.values(balances).reduce((sum, b) => sum + b.received, 0);
  const totalRembPot = Object.values(balances).reduce((sum, b) => sum + b.rembPot, 0);
  
  // DÉTECTION AUTOMATIQUE : Cas "avances sans contributions"
  // Si des avances existent mais aucune contribution au POT, c'est probablement le cas où
  // les participants ont fait des dépenses sans avoir contribué au POT au préalable
  const hasAdvancesWithoutContributions = totalAvance > 0.01 && potBalance.contributions < 0.01 && !isBalanced;
  const theoreticalContributionPerParticipant = event.amount ? (event.amount / participants.length) : 0;
  const totalTheoreticalContributions = theoreticalContributionPerParticipant * participants.length;
  
  console.log('[computeBalances] Détection cas "avances sans contributions":', {
    hasAdvancesWithoutContributions,
    totalAvance,
    potBalanceContributions: potBalance.contributions,
    isBalanced,
    theoreticalContributionPerParticipant,
    totalTheoreticalContributions,
    eventAmount: event.amount,
    participantsCount: participants.length
  });
  
  // LOG DÉTAILLÉ POUR DIAGNOSTIC: Afficher la consommation finale de chaque participant
  // Particulièrement utile pour diagnostiquer les problèmes de calcul avec 2 participants
  if (participants.length === 2) {
    const participantsDetails = participants.map(p => ({
      id: p.id,
      name: p.name,
      avance: balances[p.id]?.avance || 0,
      consomme: balances[p.id]?.consomme || 0,
      mise: balances[p.id]?.mise || 0,
      solde: balances[p.id]?.solde || 0,
      contribution: balances[p.id]?.contribution || 0
    }));
    
    console.warn('[computeBalances] 🔍 DIAGNOSTIC FINAL - Événement à 2 participants:', {
      participants: participantsDetails,
      totalAvance,
      totalConsomme,
      verification: `Total avances (${totalAvance.toFixed(2)}€) devrait égaler total consommation (${totalConsomme.toFixed(2)}€) si équilibré`
    });
    
    // Afficher chaque participant individuellement pour faciliter le diagnostic
    participantsDetails.forEach((p, index) => {
      console.warn(`[computeBalances] 🔍 Participant ${index + 1} - ${p.name}:`, {
        id: p.id,
        avance: `${p.avance.toFixed(2)}€`,
        consomme: `${p.consomme.toFixed(2)}€`,
        mise: `${p.mise.toFixed(2)}€`,
        solde: `${p.solde.toFixed(2)}€`,
        contribution: `${p.contribution.toFixed(2)}€`,
        calculSolde: `mise (${p.mise.toFixed(2)}€) - consomme (${p.consomme.toFixed(2)}€) = solde (${p.solde.toFixed(2)}€)`
      });
    });
  }
  
  console.log('[computeBalances] Totaux calculés:', {
    totalMise,
    totalConsomme,
    totalContribution,
    totalAvance,
    totalPaidOut,
    totalReceived,
    totalRembPot,
    potContributions: potBalance.contributions,
    potExpensesPaid: potBalance.expensesPaid,
    potPayouts: potBalance.payouts,
    potSolde: potBalance.solde,
    totalSoldeParticipants,
    totalSolde,
    isBalanced
  });
  
  // Avec la règle Bonkont simple, toutes les dépenses avec un payeur sont automatiquement partagées
  // entre tous les participants. Il n'y a plus besoin de détecter des transactions suspectes.
  
  // Ajouter les diagnostics
  Object.keys(balances).forEach(participantId => {
    balances[participantId]._isBalanced = isBalanced;
    balances[participantId]._totalSolde = totalSolde;
    balances[participantId]._potBalance = potBalance.solde;
  });
  
  potBalance._isBalanced = isBalanced;
  potBalance._totalSolde = totalSolde;
  
  // Log de diagnostic si déséquilibré
  if (!isBalanced) {
    console.warn('[computeBalances] Déséquilibre détecté:', {
      totalSoldeParticipants,
      potBalance: potBalance.solde,
      totalSolde,
      ecart: totalSolde,
      contributionsCount: contributions.length,
      contributionsTotal: potBalance.contributions,
      expensesCount: expenses.length,
      expensesPaidByPot: potBalance.expensesPaid,
      directTransfersCount: directTransfers.length,
      potPayoutsCount: potPayouts.length,
      potPayoutsTotal: potBalance.payouts
    });
  }
  
  return {
    balances,
    potBalance,
    isBalanced,
    totalSolde
  };
}

/**
 * Calcule les transferts optimaux "qui verse à qui"
 * 
 * Mode 1 : "Règlement entre participants" (ignore POT)
 * Mode 2 : "On utilise la cagnotte en priorité" (recommandé)
 * 
 * @param {Object} balancesResult - Résultat de computeBalances
 * @param {string} mode - 'participants_only' | 'use_pot_priority' (défaut)
 * @returns {Object} - { transfers: [...], potTransfers: [...], isBalanced: boolean, warning: string }
 */
export function computeTransfers(balancesResult, mode = 'use_pot_priority') {
  const { balances, potBalance, isBalanced: globalBalanced } = balancesResult;
  const transfers = [];
  const potTransfers = [];
  
  const balancesArray = Object.values(balances);
  
  // Détecter si tous les soldes sont à 0€ (suspect si des avances existent)
  const totalAvances = balancesArray.reduce((sum, b) => sum + (b.avance || 0), 0);
  const totalConsomme = balancesArray.reduce((sum, b) => sum + (b.consomme || 0), 0);
  const allBalancesZero = balancesArray.every(b => Math.abs(b.solde) < 0.01);
  const hasSuspectTransactions = potBalance._suspectTransactionsCount > 0;
  
  if (allBalancesZero && totalAvances > 0 && hasSuspectTransactions) {
    console.warn('[computeTransfers] ⚠️⚠️⚠️ PROBLÈME DÉTECTÉ:', {
      message: 'Tous les soldes sont à 0€ alors que des avances existent. ' +
               'Cela indique que les transactions ont été créées avec seulement le payeur dans la liste des participants. ' +
               'Les transferts ne peuvent pas être calculés correctement dans ce cas.',
      totalAvances,
      totalConsomme,
      suspectTransactionsCount: potBalance._suspectTransactionsCount,
      solution: 'Il faut corriger les transactions en ajoutant tous les participants concernés dans chaque transaction. ' +
                'Par exemple, si A paie 100€ pour A, B, C, D, la transaction doit avoir participants: [A, B, C, D], pas seulement [A].'
    });
  }
  
  if (mode === 'participants_only') {
    // Mode 1 : Ignorer POT, seulement transferts entre participants
  const creanciers = balancesArray
      .filter(b => b.solde > 0.01)
      .map(b => ({ ...b, solde: b.solde }))
      .sort((a, b) => b.solde - a.solde);
  
  const debiteurs = balancesArray
      .filter(b => b.solde < -0.01)
      .map(b => ({ ...b, solde: b.solde }))
      .sort((a, b) => a.solde - b.solde);
    
    // Algorithme greedy
  let creancierIndex = 0;
  let debiteurIndex = 0;
  
  while (creancierIndex < creanciers.length && debiteurIndex < debiteurs.length) {
    const creancier = creanciers[creancierIndex];
    const debiteur = debiteurs[debiteurIndex];
    
      if (creancier.solde < 0.01) {
      creancierIndex++;
      continue;
    }
    
      if (Math.abs(debiteur.solde) < 0.01) {
      debiteurIndex++;
      continue;
    }
    
      const transferAmount = Math.min(creancier.solde, Math.abs(debiteur.solde));
    
    transfers.push({
      from: debiteur.participantId,
      fromName: debiteur.participantName,
      to: creancier.participantId,
      toName: creancier.participantName,
        amount: Math.round(transferAmount * 100) / 100,
        type: 'participant_to_participant'
      });
      
      creancier.solde -= transferAmount;
      debiteur.solde += transferAmount;
      
      if (creancier.solde < 0.01) creancierIndex++;
      if (Math.abs(debiteur.solde) < 0.01) debiteurIndex++;
    }
    
    return {
      transfers,
      potTransfers: [],
      isBalanced: globalBalanced,
      warning: !globalBalanced ? `Déséquilibre détecté : ${balancesResult.totalSolde.toFixed(2)}€` : null
    };
  } else {
    // Mode 2 : Utiliser POT en priorité (recommandé)
    
    // Si POT a un solde positif, rembourser d'abord les créanciers
    if (potBalance.solde > 0.01) {
      const creanciers = balancesArray
        .filter(b => b.solde > 0.01)
        .map(b => ({ ...b, solde: b.solde }))
        .sort((a, b) => b.solde - a.solde);
      
      let remainingPot = potBalance.solde;
      
      for (const creancier of creanciers) {
        if (remainingPot < 0.01) break;
        
        const payoutAmount = Math.min(creancier.solde, remainingPot);
        
        potTransfers.push({
          from: POT_ID,
          fromName: POT_NAME,
          to: creancier.participantId,
          toName: creancier.participantName,
          amount: Math.round(payoutAmount * 100) / 100,
          type: 'pot_payout'
        });
        
        creancier.solde -= payoutAmount;
        remainingPot -= payoutAmount;
      }
    }
    
    // Ensuite, les débiteurs règlent le reste aux créanciers
    const creanciers = balancesArray
      .filter(b => b.solde > 0.01)
      .map(b => ({ ...b, solde: b.solde }))
      .sort((a, b) => b.solde - a.solde);
    
    const debiteurs = balancesArray
      .filter(b => b.solde < -0.01)
      .map(b => ({ ...b, solde: b.solde }))
      .sort((a, b) => a.solde - b.solde);
    
    let creancierIndex = 0;
    let debiteurIndex = 0;
    
    while (creancierIndex < creanciers.length && debiteurIndex < debiteurs.length) {
      const creancier = creanciers[creancierIndex];
      const debiteur = debiteurs[debiteurIndex];
      
      if (creancier.solde < 0.01) {
      creancierIndex++;
        continue;
    }
      
      if (Math.abs(debiteur.solde) < 0.01) {
      debiteurIndex++;
        continue;
      }
      
      const transferAmount = Math.min(creancier.solde, Math.abs(debiteur.solde));
      
      transfers.push({
        from: debiteur.participantId,
        fromName: debiteur.participantName,
        to: creancier.participantId,
        toName: creancier.participantName,
        amount: Math.round(transferAmount * 100) / 100,
        type: 'participant_to_participant'
      });
      
      creancier.solde -= transferAmount;
      debiteur.solde += transferAmount;
      
      if (creancier.solde < 0.01) creancierIndex++;
      if (Math.abs(debiteur.solde) < 0.01) debiteurIndex++;
    }
    
    // Détecter si tous les soldes sont à 0€
    const totalAvances = balancesArray.reduce((sum, b) => sum + (b.avance || 0), 0);
    const allBalancesZero = balancesArray.every(b => Math.abs(b.solde) < 0.01);
    
    // Si POT a un solde négatif (déficitaire), afficher un avertissement
    let warning = null;
    
    if (potBalance.solde < -0.01) {
      const manque = Math.abs(potBalance.solde).toFixed(2);
      warning = `Cagnotte déficitaire : il manque ${manque}€. ` +
                `Des contributions supplémentaires sont nécessaires pour équilibrer les comptes. ` +
                `L'écart de ${balancesResult.totalSolde ? balancesResult.totalSolde.toFixed(2) : manque}€ doit être comblé par des contributions au POT.`;
    } else if (!globalBalanced) {
      const ecart = Math.abs(balancesResult.totalSolde).toFixed(2);
      const signe = balancesResult.totalSolde > 0 ? 'excédent' : 'déficit';
      warning = `Déséquilibre détecté : ${signe} de ${ecart}€. ` +
                `RÈGLE BONKONT : "Que je paie ou dépense, je consomme comme toi, cette avance tu dois me la rembourser, et vice versa, on est quittes". ` +
                `Si toutes les transactions sont validées collectivement et équilibrées, la somme des soldes des participants et de la cagnotte devrait être égale à 0€. ` +
                `Cet écart peut être dû à : (1) des transactions non validées collectivement avec des participants manquants, ` +
                `(2) des contributions manquantes au POT, ou (3) des transactions incomplètes. ` +
                `Vérifiez que toutes les dépenses partagées incluent tous les participants concernés dans la liste "participants".`;
  }
  
  return {
    transfers,
      potTransfers,
      isBalanced: globalBalanced,
      warning
    };
  }
}

/**
 * Formate les soldes pour l'affichage
 */
export function formatBalance(balance) {
  return {
    ...balance,
    soldeFormatted: balance.solde >= 0 
      ? `+${balance.solde.toFixed(2)} €` 
      : `${balance.solde.toFixed(2)} €`,
    soldeFinalFormatted: balance.solde >= 0 
      ? `+${balance.solde.toFixed(2)} €` 
      : `${balance.solde.toFixed(2)} €`, // Compatibilité avec ancien code
    status: balance.solde > 0.01 
      ? 'doit_recevoir' 
      : balance.solde < -0.01 
        ? 'doit_verser' 
        : 'equilibre'
  };
}

/**
 * Obtient les transferts pour un participant spécifique
 */
export function getParticipantTransfers(participantId, transfersResult) {
  // Vérifier que transfersResult est un objet avec transfers et potTransfers
  if (!transfersResult || typeof transfersResult !== 'object') {
    console.warn('[getParticipantTransfers] transfersResult invalide:', transfersResult);
    return {
      toReceive: [],
      toPay: [],
      hasTransfers: false
    };
  }
  
  const transfers = transfersResult.transfers || [];
  const potTransfers = transfersResult.potTransfers || [];
  const allTransfers = [...transfers, ...potTransfers];
  
  const toReceive = allTransfers.filter(t => t.to === participantId);
  const toPay = allTransfers.filter(t => t.from === participantId);
  
  return {
    toReceive,
    toPay,
    hasTransfers: toReceive.length > 0 || toPay.length > 0
  };
}

/**
 * Obtient l'état de la cagnotte pour affichage
 */
export function getPotStatus(potBalance) {
  return {
    contributions: potBalance.contributions,
    expensesPaid: potBalance.expensesPaid,
    payouts: potBalance.payouts,
    solde: potBalance.solde,
    soldeFormatted: potBalance.solde >= 0 
      ? `+${potBalance.solde.toFixed(2)} €` 
      : `${potBalance.solde.toFixed(2)} €`,
    status: potBalance.solde > 0.01 
      ? 'surplus' 
      : potBalance.solde < -0.01 
        ? 'deficit' 
        : 'equilibre'
  };
}

/**
 * Obtient la traçabilité des paiements pour un participant
 */
export function getPaymentTraceability(participantId, event, transactions) {
  const contributions = transactions.filter(t => isContribution(t, event.id));
  const directTransfers = transactions.filter(t => {
    const fromId = t.fromId || t.from;
    const toId = t.toId || t.to;
    return fromId && toId && 
           fromId !== POT_ID && toId !== POT_ID &&
           fromId !== event.id && toId !== event.id;
  });
  const potPayouts = transactions.filter(t => isPotPayout(t));
  
  const paiementsVerses = [];
  const paiementsRecus = [];
  
  // Contributions vers POT
  contributions.forEach(transaction => {
    const fromId = transaction.fromId || transaction.from;
    if (fromId === participantId) {
      paiementsVerses.push({
        id: transaction.id,
        amount: parseFloat(transaction.amount) || 0,
        description: transaction.description || 'Contribution',
        date: transaction.date || transaction.createdAt,
        toId: POT_ID,
        toName: POT_NAME,
        type: 'contribution',
        validatedBy: transaction.validatedBy || []
      });
    }
  });
  
  // Transferts directs
  directTransfers.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const fromId = transaction.fromId || transaction.from;
    const toId = transaction.toId || transaction.to;
    
    if (fromId === participantId) {
      const recipient = event.participants?.find(p => p.id === toId);
      paiementsVerses.push({
        id: transaction.id,
        amount,
        description: transaction.description || 'Transfert direct',
        date: transaction.date || transaction.createdAt,
        toId,
        toName: recipient?.name || 'Participant inconnu',
        type: 'direct_transfer',
        validatedBy: transaction.validatedBy || []
      });
    }
    
    if (toId === participantId) {
      const payer = event.participants?.find(p => p.id === fromId);
      paiementsRecus.push({
        id: transaction.id,
        amount,
        description: transaction.description || 'Transfert direct',
        date: transaction.date || transaction.createdAt,
        fromId,
        fromName: payer?.name || 'Participant inconnu',
        type: 'direct_transfer',
        validatedBy: transaction.validatedBy || []
      });
    }
  });
  
  // Remboursements POT → participant
  potPayouts.forEach(transaction => {
    const toId = transaction.toId || transaction.to;
    if (toId === participantId) {
      paiementsRecus.push({
        id: transaction.id,
        amount: parseFloat(transaction.amount) || 0,
        description: transaction.description || 'Remboursement cagnotte',
        date: transaction.date || transaction.createdAt,
        fromId: POT_ID,
        fromName: POT_NAME,
        type: 'pot_payout',
        validatedBy: transaction.validatedBy || []
      });
    }
  });
  
  return {
    paiementsVerses,
    paiementsRecus
  };
}

/**
 * Obtient la traçabilité des dépenses pour un participant
 */
export function getExpenseTraceability(participantId, event, transactions) {
  const expenses = transactions.filter(t => isExpense(t));
  
  const depensesAvancees = [];
  const depensesConsommees = [];
  
  expenses.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    
    if (amount === 0) return;
    
    const payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || null;
    const paidByPot = isPaidByPot(transaction);
    
    // RÈGLE BONKONT : Seuls les participants qui valident une dépense ou une avance sont redevables au payeur au prorata.
    // La validation (complète ou partielle) détermine la règle de répartition et de transferts.
    // C'est la même logique que dans computeBalances()
    const participantsConcerned = getParticipantsConcernedByExpense(transaction, event);
    
    // Si aucun participant concerné, on ne peut pas calculer
    if (participantsConcerned.length === 0) return;
    
    // Calcul de la part réelle : montant total / nombre de participants concernés
    const share = amount / participantsConcerned.length;
    
    // Dépense avancée par ce participant
    if (payerId === participantId && !paidByPot) {
      depensesAvancees.push({
        id: transaction.id,
        amount,
        description: transaction.description || transaction.store || 'Dépense',
        date: transaction.date || transaction.createdAt,
        participantsConcerned: participantsConcerned.length,
        share,
        partParPersonne: share // Alias pour compatibilité
      });
    }
    
    // Dépense consommée par ce participant
    if (participantsConcerned.includes(participantId)) {
      depensesConsommees.push({
        id: transaction.id,
        amount,
        description: transaction.description || transaction.store || 'Dépense',
        date: transaction.date || transaction.createdAt,
        payerId: paidByPot ? POT_ID : payerId,
        payerName: paidByPot ? POT_NAME : (payerId ? (event.participants?.find(p => p.id === payerId)?.name || 'Inconnu') : 'Équitable'),
        share,
        part: share // Alias pour compatibilité - C'EST LA PART RÉELLE (montant / nombre de participants)
      });
    }
  });
  
  return {
    depensesAvancees,
    depensesConsommees
  };
}

/**
 * Construit un résumé "qui verse à qui" pour un participant
 */
export function buildParticipantSummary(participantId, balancesResult, transfersResult) {
  const { balances, potBalance } = balancesResult;
  const balance = balances[participantId];
  
  if (!balance) {
    return {
      participantId,
      participantName: 'Participant inconnu',
      solde: 0,
      toReceive: [],
      toPay: [],
      potStatus: null
    };
  }
  
  const participantTransfers = getParticipantTransfers(participantId, transfersResult);
  
  return {
    participantId,
    participantName: balance.participantName,
    solde: balance.solde,
    soldeFormatted: formatBalance(balance).soldeFormatted,
    status: formatBalance(balance).status,
    mise: balance.mise,
    consomme: balance.consomme,
    toReceive: participantTransfers.toReceive,
    toPay: participantTransfers.toPay,
    potStatus: getPotStatus(potBalance)
  };
}
