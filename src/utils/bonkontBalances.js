/**
 * Module Bonkont : Calcul des soldes et répartition avec POT (Cagnotte)
 *
 * CLARIFICATION DU FLUX (logique établie, sans changer la règle Bonkont) :
 * 1. Montant théorique (ex. 200€/personne) : repère fixé au début de l'événement, il reste THEORIQUE.
 * 2. Le pot reçoit des contributions réelles (validées) ; tant que non dépensées, elles restent en cagnotte.
 * 3. Quand un participant prend du pot pour une dépense du groupe (ex. 50€ courses pour 4), ces 50€
 *    deviennent une avance réelle → entrent dans la règle Bonkont (qui paie, qui consomme, qui doit à qui).
 * 4. Le reste en cagnotte sert à de futures dépenses ou en fin d'événement à rembourser (débiteur)
 *    ou à être augmenté (créancier). La règle Bonkont ne change jamais : "Tu paies, tu consommes,
 *    tu verses ou tu reçois, on est quittes."
 *
 * Équité cagnotte / avance : ce qui compte est la CONTRIBUTION TOTALE du participant. Pour chaque dépense
 * du payeur, part cagnotte = min(montant, contribution totale − déjà utilisée), reste = avance. Logique sans faille.
 *
 * Part théorique vs réel :
 * - Part théorique = repère budgétaire à ne pas dépasser, pas une obligation.
 * - Seules les transactions initiées et validées suivent la logique Bonkont.
 *
 * Modèle POT : La cagnotte est un acteur comptable (compte de groupe)
 * - Reçoit les contributions (cash, virement, etc.)
 * - Dépense avec payeur = contributeur → prélevée sur la cagnotte (reste = contribution - prélevé)
 * - Peut rembourser des participants qui ont avancé
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
  
  // Log désactivé pour éviter la boucle infinie
  // if (isPaymentType || isPaymentSource) {
  //   console.log('[isContribution] 🔍 Analyse transaction payment:', {
  //     transactionId: transaction.id,
  //     fromId,
  //     toId,
  //     transactionEventId,
  //     eventId,
  //     type: transaction.type,
  //     source: transaction.source,
  //     amount: parseFloat((transaction.amount || 0).toFixed(2)),
  //     hasParticipants,
  //     participants: transaction.participants,
  //     toIdString: String(toId),
  //     eventIdString: String(eventId),
  //     transactionEventIdString: String(transactionEventId)
  //   });
  // }
  
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
    // Log désactivé pour éviter la boucle infinie
    // console.log('[isContribution] ✅ Contribution identifiée (toId === POT_ID):', {
    //   transactionId: transaction.id,
    //   fromId,
    //   toId,
    //   amount: parseFloat((transaction.amount || 0).toFixed(2))
    // });
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
      // Log désactivé pour éviter la boucle infinie
      // console.log('[isContribution] ✅ Contribution identifiée (toId === eventId):', {
      //   transactionId: transaction.id,
      //   fromId,
      //   toId,
      //   transactionEventId,
      //   eventId,
      //   toIdString: String(toId),
      //   eventIdString: String(eventId),
      //   transactionEventIdString: String(transactionEventId),
      //   amount: parseFloat((transaction.amount || 0).toFixed(2)),
      //   type: transaction.type,
      //   source: transaction.source,
      //   hasParticipants,
      //   isPaymentType,
      //   isPaymentSource
      // });
      return true;
    }
  }
  
  // Cas 3: Pas de toId explicite mais type/source indique un paiement vers POT
  if (!toId && (transaction.type === 'CONTRIBUTION' || isPaymentSource || isPaymentType)) {
    // Vérifier qu'il n'y a pas de participants (sinon c'est une dépense)
    if (!hasParticipants) {
      // Log désactivé pour éviter la boucle infinie
      // console.log('[isContribution] ✅ Contribution identifiée (pas de toId, type payment, pas de participants):', {
      //   transactionId: transaction.id,
      //   fromId,
      //   type: transaction.type,
      //   source: transaction.source,
      //   amount: parseFloat((transaction.amount || 0).toFixed(2))
      // });
      return true;
    }
  }
  
  // Si c'est une dépense (a des participants concernés), ce n'est pas une contribution
  // IMPORTANT: Vérifier isExpense() APRÈS avoir vérifié les cas de contribution
  if (isExpense(transaction)) {
    // Log désactivé pour éviter la boucle infinie
    // if (isPaymentType || isPaymentSource) {
    //   console.log('[isContribution] ❌ Rejetée car identifiée comme dépense:', {
    //     transactionId: transaction.id,
    //     hasParticipants,
    //     toId,
    //     eventId
    //   });
    // }
    return false;
  }
  
  // Log désactivé pour éviter la boucle infinie
  // if (isPaymentType || isPaymentSource) {
  //   console.log('[isContribution] ❌ Transaction payment non identifiée comme contribution:', {
  //     transactionId: transaction.id,
  //     fromId,
  //     toId,
  //     transactionEventId,
  //     eventId,
  //     type: transaction.type,
  //     source: transaction.source,
  //     hasParticipants,
  //     toIdMatchesEventId
  //   });
  // }
  
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
 * DOUBLE RÈGLE BONKONT (universelle pour toutes les transactions : paiements, avances, dépenses, etc.) :
 * 
 * 1. VALIDATION : Dès qu'un participant valide une transaction, il est concerné par la répartition équitable
 *    - Si validation collective (tous valident) → Tous les participants sont concernés
 *    - Si validation partielle (seulement certains valident) → Seuls les validateurs + le payeur sont concernés
 *    - Si aucune validation explicite → Tous les participants sont concernés par défaut (répartition équitable)
 * 
 * 2. PART ÉQUITABLE : Chaque participant concerné consomme sa part au prorata du nombre de participants concernés
 *    - Le payeur avance le montant TOTAL
 *    - Le payeur consomme sa PART (montant / nombre de participants concernés)
 *    - Chaque autre participant concerné consomme aussi sa PART (montant / nombre de participants concernés)
 *    - Le payeur reçoit le remboursement des autres participants concernés
 * 
 * Exemple concret :
 * - 8 participants dans un événement
 * - kalopic avance 36,61€ pour une dépense validée par tous
 * - kalopic consomme : 36,61€ / 8 = 4,58€ (sa part)
 * - Chaque autre participant consomme aussi : 36,61€ / 8 = 4,58€ (sa part)
 * - kalopic doit recevoir : 36,61€ - 4,58€ = 32,03€ des 7 autres participants
 * 
 * Cette règle s'applique à TOUTES les transactions : paiements, avances, dépenses, etc.
 * 
 * @param {Object} transaction - Transaction à analyser
 * @param {Object} event - Événement contenant la liste des participants
 * @returns {Array<string>} Liste des IDs des participants concernés par la dépense
 */
function getParticipantsConcernedByExpense(transaction, event) {
  // Pour les contributions, utiliser fromId comme payeur si payerId n'est pas défini
  const payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || 
                  (transaction.fromId ? String(transaction.fromId) : null) || 
                  (transaction.from ? String(transaction.from) : null);
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
  
  // RÈGLE BONKONT : Par défaut, TOUS les participants sont concernés (répartition équitable)
  // Exception : Seulement si une validation partielle EXPLICITE (<50% des participants) indique le contraire
  
  // Si la transaction est validée collectivement (tous les participants), tous sont concernés
  if (isCollectivelyValidated(transaction, event)) {
    allParticipantIds.forEach(id => participantsConcerned.add(id));
  } else if (validatedBy.length > 0) {
    // Vérifier si c'est une validation partielle explicite (<50% des autres participants)
    const otherParticipantsCount = Math.max(0, allParticipantIds.length - 1); // Exclure le payeur
    const validatedByCount = validatedBy.length;
    const validationRatio = otherParticipantsCount > 0 ? validatedByCount / otherParticipantsCount : 0;
    
    if (validationRatio < 0.5 && validatedByCount < 3) {
      // Validation partielle EXPLICITE : seuls le payeur + les validateurs sont concernés
      // Exemple : 3 personnes sortent prendre un café, seuls ces 3 consomment
      validatedBy.forEach(validatorId => {
        const validatorIdStr = String(validatorId);
        if (allParticipantIds.includes(validatorIdStr)) {
          participantsConcerned.add(validatorIdStr);
        }
      });
      console.log('[getParticipantsConcernedByExpense] ⚠️ VALIDATION PARTIELLE EXPLICITE: Seulement certains participants sont concernés:', {
        transactionId: transaction.id,
        payerId,
        validatedByCount,
        otherParticipantsCount,
        validationRatio: (validationRatio * 100).toFixed(1) + '%',
        participantsConcerned: Array.from(participantsConcerned),
        message: 'RÈGLE BONKONT: Validation partielle explicite (<50% des participants). Seuls les validateurs consomment leur part.'
      });
    } else {
      // Validation collective implicite ou validation majoritaire : tous les participants sont concernés
      allParticipantIds.forEach(id => participantsConcerned.add(id));
      console.log('[getParticipantsConcernedByExpense] ✅ VALIDATION COLLECTIVE IMPLICITE: Tous les participants sont concernés:', {
        transactionId: transaction.id,
        payerId,
        validatedByCount,
        otherParticipantsCount,
        validationRatio: (validationRatio * 100).toFixed(1) + '%',
        message: 'RÈGLE BONKONT: Validation collective implicite (≥50% des participants ont validé). Tous les participants consomment leur part équitablement.'
      });
    }
  } else {
    // RÈGLE BONKONT : Si aucune validation explicite (validatedBy vide), inclure TOUS les participants par défaut
    // C'est la répartition équitable : le payeur avance pour tous, tous consomment leur part
    // La seule exception est si validatedBy contient explicitement certains participants (validation partielle)
    // Dans ce cas, seuls le payeur + les validateurs sont concernés
    
    // RÈGLE BONKONT : Par défaut, TOUS les participants sont concernés (répartition équitable)
    allParticipantIds.forEach(id => participantsConcerned.add(id));
    
    console.log('[getParticipantsConcernedByExpense] ✅ RÉPARTITION ÉQUITABLE: Tous les participants sont concernés par défaut:', {
      transactionId: transaction.id,
      payerId,
      validatedBy: validatedBy.length,
      allParticipantsCount: allParticipantIds.length,
      participantsConcerned: Array.from(participantsConcerned),
      message: 'RÈGLE BONKONT: Aucune validation explicite (validatedBy vide), répartition équitable par défaut. Le payeur avance le montant total, tous les participants consomment leur part équitablement.'
    });
  }
  
  const result = Array.from(participantsConcerned);
  
  // LOG DE DIAGNOSTIC pour vérifier que tous les participants sont inclus
  const payerName = event.participants?.find(p => String(p.id) === String(payerId))?.name || payerId;
  const participantsNames = result.map(pId => {
    const p = event.participants?.find(participant => String(participant.id) === String(pId));
    return p?.name || pId;
  });
  
  console.log('[getParticipantsConcernedByExpense] ✅ Participants concernés déterminés:', {
    transactionId: transaction.id,
    payerId,
    payerName,
    validatedBy: validatedBy.length,
    isCollectivelyValidated: isCollectivelyValidated(transaction, event),
    participantsConcernedCount: result.length,
    allParticipantsCount: allParticipantIds.length,
    participantsConcerned: participantsNames,
    includesAllParticipants: result.length === allParticipantIds.length,
    message: result.length === allParticipantIds.length 
      ? '✅ Tous les participants sont concernés (répartition équitable)'
      : `⚠️ Seulement ${result.length} participant(s) concerné(s) sur ${allParticipantIds.length}`
  });
  
  return result;
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
    // Log seulement si vraiment un problème (pas juste absence de transactions)
    if (!participantId || !event) {
      console.warn('[getContributionToPot] ⚠️ Paramètres manquants:', {
        participantId,
        hasEvent: !!event,
        eventId: event?.id,
        transactionsCount: transactions?.length
      });
    }
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
 * RÈGLE BONKONT : La validation de TOUTE transaction détermine et déclenche la règle Bonkont
 * 
 * Types de transactions et traitement :
 * 
 * 1. CONTRIBUTIONS (participant → POT) :
 *    - Validées ET déclenchent le partage équitable
 *    - La validation détermine QUI est concerné (qui bénéficie de la contribution)
 *    - Le partage équitable détermine COMBIEN chacun consomme (montant ÷ nombre de participants concernés)
 *    - Le participant qui paie verse le montant total, tous les participants concernés consomment leur part
 *    - Double règle : Validation + Partage Équitable
 * 
 * 2. DÉPENSES/AVANCES (participant paie pour le groupe) :
 *    - Validées ET déclenchent le partage équitable
 *    - La validation détermine QUI est concerné (qui consomme)
 *    - Le partage équitable détermine COMBIEN chacun consomme (montant ÷ nombre de participants concernés)
 *    - Double règle : Validation + Partage Équitable
 * 
 * 3. TRANSFERTS DIRECTS (participant → participant) :
 *    - Validés pour traçabilité et transparence
 *    - Ne déclenchent PAS de partage équitable (paiement direct)
 *    - La validation confirme que le transfert est accepté
 * 
 * 4. REMBOURSEMENTS POT (POT → participant) :
 *    - Validés pour traçabilité et transparence
 *    - Ne déclenchent PAS de partage équitable (remboursement direct)
 *    - La validation confirme que le remboursement est accepté
 * 
 * @param {Object} event - L'événement avec participants
 * @param {Array} transactions - Toutes les transactions de l'événement
 * @returns {Object} - { balances: {...}, potBalance: {...}, isBalanced: boolean }
 */
export function computeBalances(event, transactions) {
  // Log désactivé pour éviter la boucle infinie
  // console.log('[computeBalances] ⚠️ DÉBUT CALCUL BALANCES:', {
  //   eventId: event?.id,
  //   eventTitle: event?.title,
  //   transactionsCount: transactions?.length,
  //   participantsCount: event?.participants?.length,
  //   transactionsDetails: transactions?.map(t => ({
  //     id: t.id,
  //     source: t.source,
  //     participants: t.participants,
  //     payerId: t.payerId,
  //     amount: parseFloat((t.amount || 0).toFixed(2)),
  //     type: t.type
  //   }))
  // });
  
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
  // RÈGLE BONKONT : La validation de TOUTE transaction détermine et déclenche la règle Bonkont
  // - Contributions au POT : Validées ET partagées équitablement (tous les participants concernés consomment leur part)
  // - Dépenses/Avances : Validées ET partagées équitablement selon la validation (qui consomme quoi)
  // - Transferts directs : Validés pour traçabilité
  // - Remboursements POT : Validés pour traçabilité
  const contributions = transactions.filter(t => isContribution(t, eventId));
  const expenses = transactions.filter(t => isExpense(t) && !isContribution(t, eventId));
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
  
  // Log seulement si on a des transactions pour éviter le spam
  if (transactions.length > 0) {
    console.log('[computeBalances] Transactions séparées:', {
      total: transactions.length,
      contributions: contributions.length,
      expenses: expenses.length,
      directTransfers: directTransfers.length,
      potPayouts: potPayouts.length
    });
  }
  
  // ===== A) CONTRIBUTIONS (participant → POT) =====
  // RÈGLE BONKONT : Les contributions au POT validées déclenchent le partage équitable
  // Si une contribution est validée collectivement ou partiellement, tous les participants concernés
  // bénéficient équitablement de cette contribution (chacun consomme sa part au prorata)
  // Le participant qui paie verse le montant total, mais tous les participants concernés consomment leur part
  // Log seulement si on a des contributions pour éviter le spam
  if (contributions.length > 0) {
    console.log('[computeBalances] Traitement des contributions:', {
      contributionsCount: contributions.length,
      contributionsDetails: contributions.map(c => ({
        id: c.id,
        fromId: c.fromId || c.from,
        toId: c.toId || c.to,
        amount: c.amount,
        type: c.type,
        source: c.source,
        eventId: c.eventId,
        validatedBy: c.validatedBy || [],
        message: 'RÈGLE BONKONT: Contribution validée → déclenche le partage équitable entre participants concernés'
      }))
    });
  }
  
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
    
    // Contribution = virement participant → POT. Pour que Σ soldes + solde POT = 0 :
    // - POT reçoit : potBalance.contributions += amount
    // - Le contributeur "sort" l'argent : on augmente sa consomme (il n'a plus cette somme).
    // - On enregistre contribution pour l'affichage ; elle ne doit pas entrer dans "mise" (voir formule mise ci-dessous).
    potBalance.contributions = parseFloat((potBalance.contributions + amount).toFixed(2));
    balances[fromId].consomme = parseFloat((balances[fromId].consomme + amount).toFixed(2));
    balances[fromId].contribution = parseFloat((balances[fromId].contribution + amount).toFixed(2));
  });
  
  // ===== B) DÉPENSES =====
  // RÈGLE BONKONT : Les dépenses/avances sont validées ET déclenchent le partage équitable
  // La validation détermine QUI est concerné (qui consomme)
  // Le partage équitable détermine COMBIEN chacun consomme (montant ÷ nombre de participants concernés)
  // Double règle : Validation + Partage Équitable
  let totalConsommation = 0;
  let totalAvances = 0;
  // Contribution totale déjà utilisée par le pot pour chaque payeur (équité : ne jamais dépasser la contribution totale)
  const contributionUtiliseeParPayeur = {};
  
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
    
    // LOG TEMPORAIRE POUR DIAGNOSTIC
    console.log('[computeBalances] 🔍 DIAGNOSTIC Transaction:', {
      transactionId: transaction.id,
      amount: parseFloat(amount.toFixed(2)),
      source: transaction.source,
      payerId: payerId,
      payerIdFromTransaction: transaction.payerId,
      payerFromTransaction: transaction.payer,
      selectedPayerId: transaction.selectedPayerId,
      participants: transaction.participants,
      validatedBy: transaction.validatedBy || [],
      description: transaction.description || transaction.store || 'N/A'
    });
    
    // RÈGLE BONKONT: Si pas de payeur identifié et ticket scanné, prendre le premier participant
    // Le payeur avance le montant total, tous les participants concernés consomment leur part équitablement
    if (!payerId && transaction.source === 'scanned_ticket' && transaction.participants && transaction.participants.length > 0) {
      payerId = transaction.participants[0];
      console.log('[computeBalances] ✅ RÈGLE BONKONT: Payeur identifié pour ticket scanné:', {
        transactionId: transaction.id,
        payerId,
        participants: transaction.participants,
        message: 'RÈGLE BONKONT: Le payeur avance le montant total, tous les participants concernés consomment leur part équitablement.'
      });
    }
    
    // RÈGLE BONKONT: Si pas de payeur identifié mais qu'il y a des participants,
    // et que la transaction n'est pas payée par POT, on identifie le payeur
    // Le premier participant dans la liste est utilisé comme payeur (répartition équitable)
    if (!payerId && !isPaidByPot(transaction) && transaction.participants && transaction.participants.length > 0) {
      const firstParticipant = String(transaction.participants[0]);
      if (balances[firstParticipant]) {
        payerId = firstParticipant;
        // IMPORTANT: Mettre à jour transaction.payerId pour que getParticipantsConcernedByExpense le trouve
        transaction.payerId = payerId;
        console.log('[computeBalances] ✅ RÈGLE BONKONT: Payeur identifié (premier participant):', {
          transactionId: transaction.id,
          payerId,
          participants: transaction.participants,
          message: 'RÈGLE BONKONT: Le premier participant avance le montant total, tous les participants concernés consomment leur part équitablement.'
        });
      }
    }
    
    // Mettre à jour payerIdStrFinal après avoir identifié le payeur
    const payerIdStrFinal = payerId ? String(payerId) : null;
    
    // Utiliser payerIdStrFinal partout dans cette fonction
    const payerIdStr = payerIdStrFinal; // Alias pour compatibilité avec le code existant
    
    // RÈGLE BONKONT : La validation de cette dépense/avance détermine et déclenche la règle Bonkont
    // Cette fonction analyse la validation (validatedBy) pour déterminer QUI est concerné
    // - Si validation collective → Tous les participants sont concernés
    // - Si validation partielle → Seuls les validateurs + le payeur sont concernés
    // - Si aucune validation explicite → Tous les participants sont concernés par défaut (répartition équitable)
    // Ensuite, le partage équitable s'applique : chacun consomme sa part au prorata
    // Exemple : 10 personnes dans un événement, A fait une dépense validée par B et C seulement
    // → Seuls A, B et C sont concernés par la répartition équitable
    const participantsConcerned = getParticipantsConcernedByExpense(transaction, event);
    
    // LOG CRITIQUE : Vérifier si kalopic est inclus dans cette transaction
    const kalopicId = event.participants?.find(p => p.name?.toLowerCase().includes('kalopic'))?.id;
    const kalopicIdStr = kalopicId ? String(kalopicId) : null;
    const kalopicIncluded = kalopicIdStr ? participantsConcerned.includes(kalopicIdStr) : false;
    const payerName = event.participants?.find(p => String(p.id) === String(payerIdStrFinal))?.name || payerIdStrFinal;
    
    if (!kalopicIncluded && kalopicIdStr && payerIdStrFinal !== kalopicIdStr) {
      console.warn('[computeBalances] ⚠️ KALOPIC NON INCLUS dans cette transaction:', {
        transactionId: transaction.id,
        payerId: payerIdStrFinal,
        payerName,
        amount: parseFloat(amount.toFixed(2)),
        validatedBy: transaction.validatedBy || [],
        validatedByCount: (transaction.validatedBy || []).length,
        participantsConcerned: participantsConcerned.map(pId => {
          const p = event.participants?.find(participant => String(participant.id) === String(pId));
          return p?.name || pId;
        }),
        participantsConcernedCount: participantsConcerned.length,
        allParticipantsCount: event.participants?.length || 0,
        message: `⚠️ PROBLÈME: Kalopic n'est pas inclus dans cette transaction. Il ne consommera pas sa part de ${amount.toFixed(2)}€ avancée par ${payerName}.`
      });
    }
    
    if (participantsConcerned.length === 0) {
      console.warn('[computeBalances] Dépense ignorée (aucun participant concerné):', {
        transactionId: transaction.id,
        payerId,
        validatedBy: transaction.validatedBy || [],
        participants: transaction.participants || []
      });
      return;
    }
    
    // RÈGLE BONKONT : Le payeur DOIT être dans la liste des participants concernés
    // Il consomme toujours sa part au prorata, comme tous les autres participants
    const participantsConcernedSet = new Set(participantsConcerned.map(p => String(p)));
    if (payerIdStr && balances[payerIdStr] && !participantsConcernedSet.has(payerIdStr)) {
      participantsConcernedSet.add(payerIdStr);
      console.log('[computeBalances] ✅ RÈGLE BONKONT: Payeur inclus dans les participants concernés:', {
        transactionId: transaction.id,
        payerId: payerIdStr,
        participantsConcerned: Array.from(participantsConcernedSet),
        message: 'RÈGLE BONKONT: Le payeur consomme sa part au prorata, comme tous les autres participants concernés.'
      });
    }
    
    // Convertir le Set en Array pour la suite
    const participantsConcernedFinal = Array.from(participantsConcernedSet);
    
    // LOG TEMPORAIRE POUR DIAGNOSTIC
    console.log('[computeBalances] ✅ RÈGLE BONKONT APPLIQUÉE: Participants concernés déterminés par validation:', {
      transactionId: transaction.id,
      payerId: payerIdStr,
      amount: parseFloat(amount.toFixed(2)),
      validatedBy: transaction.validatedBy || [],
      validationCount: transaction.validationCount || 0,
      participantsConcerned: participantsConcernedFinal,
      nombreParticipants: participantsConcernedFinal.length,
      partParPersonne: parseFloat((amount / participantsConcernedFinal.length).toFixed(2)),
      soldeAttenduPayeur: payerIdStr ? parseFloat((amount - amount / participantsConcernedFinal.length).toFixed(2)) : null,
      payeurDansListe: payerIdStr ? participantsConcernedFinal.includes(payerIdStr) : false,
      message: `RÈGLE BONKONT: Seuls les participants qui valident sont redevables. Payeur avance ${amount.toFixed(2)}€, chaque participant concerné (y compris le payeur) consomme ${(amount / participantsConcernedFinal.length).toFixed(2)}€`
    });
    
    // Filtrer les participants valides (ceux qui existent dans balances)
    const validParticipants = participantsConcernedFinal.filter(pId => {
      const pIdStr = String(pId);
      const exists = !!balances[pIdStr];
      if (!exists && pIdStr === payerIdStr) {
        console.error('[computeBalances] ❌ ERREUR CRITIQUE: Le payeur n\'existe pas dans balances:', {
          transactionId: transaction.id,
          payerId: pIdStr,
          availableBalances: Object.keys(balances)
        });
      }
      return exists;
    });
    
    // RÈGLE BONKONT : Le payeur DOIT être dans validParticipants pour consommer sa part
    if (payerIdStr && balances[payerIdStr] && !validParticipants.includes(payerIdStr)) {
      validParticipants.push(payerIdStr);
      console.log('[computeBalances] ✅ RÈGLE BONKONT: Payeur inclus dans les participants valides:', {
        transactionId: transaction.id,
        payerId: payerIdStr,
        validParticipants,
        message: 'RÈGLE BONKONT: Le payeur consomme sa part au prorata, comme tous les autres participants concernés.'
      });
    }
    
    if (validParticipants.length === 0) {
      console.warn(`[computeBalances] Dépense ignorée : aucun participant valide pour la transaction ${transaction.id}`, {
        transactionId: transaction.id,
        participantsConcerned: participantsConcernedFinal,
        payerId: payerIdStr,
        availableParticipantIds: Object.keys(balances)
      });
      return;
    }
    
    // Part de chacun (montant total divisé par le nombre de participants concernés)
    const share = parseFloat((amount / validParticipants.length).toFixed(2));
    totalConsommation += amount; // La consommation totale = montant de la dépense
    
    // LOG DÉTAILLÉ POUR DIAGNOSTIC: Vérifier si c'est une transaction de 12.20€ entre 2 personnes
    if (Math.abs(amount - 12.20) < 0.01 && participants.length === 2) {
      console.warn('[computeBalances] 🔍 DIAGNOSTIC TRANSACTION 12.20€:', {
        transactionId: transaction.id,
        amount,
        participantsConcerned: participantsConcernedFinal,
        validParticipants,
        validParticipantsCount: validParticipants.length,
        totalParticipantsEvent: participants.length,
        share,
        shareExpected: amount / 2,
        payerId: payerIdStr,
        payeurDansValidParticipants: payerIdStr ? validParticipants.includes(payerIdStr) : false,
        balancesBefore: validParticipants.map(pId => ({
          participantId: pId,
          consommeAvant: balances[pId].consomme,
          avanceAvant: balances[pId].avance
        }))
      });
    }
    
    // Vérifier si payé par POT (explicite) ou si le payeur a contribué → dépense prélevée sur la cagnotte
    let paidByPot = isPaidByPot(transaction);
    const payerHasContribution = payerIdStr && balances[payerIdStr] && (balances[payerIdStr].contribution || 0) > 0.01;
    if (!paidByPot && payerHasContribution) {
      paidByPot = true; // RÈGLE BONKONT : contribution validée → en cas de dépense avec ce payeur, on prélève sur la cagnotte
    }
    
    // RÈGLE BONKONT : Le payeur DOIT être dans la liste des participants valides
    // Chaque participant qui avance des frais consomme sa part au prorata, comme tous les autres participants concernés
    const payerIsInParticipants = payerIdStr ? validParticipants.includes(payerIdStr) : false;
    
    if (payerIdStr && !payerIsInParticipants) {
      console.error('[computeBalances] ❌ ERREUR: Le payeur n\'est pas dans validParticipants:', {
        transactionId: transaction.id,
        payerId: payerIdStr,
        validParticipants,
        message: 'RÈGLE BONKONT: Le payeur doit toujours consommer sa part au prorata. Vérifiez que le payeur est bien dans la liste des participants de l\'événement.'
      });
    }
    
    const expectedShareForTwo = amount / 2; // Si 2 participants dans l'événement
    const isShareIncorrect = payerIsInParticipants && validParticipants.length !== participants.length && Math.abs(share - expectedShareForTwo) > 0.01;
    
    // Log désactivé pour éviter la boucle infinie
    // console.log('[computeBalances] Traitement dépense:', {
    //   transactionId: transaction.id,
    //   source: transaction.source,
    //   amount: parseFloat(amount.toFixed(2)),
    //   participantsConcerned,
    //   validParticipants,
    //   validParticipantsCount: validParticipants.length,
    //   totalParticipantsEvent: participants.length,
    //   payerId,
    //   paidByPot,
    //   share: parseFloat(share.toFixed(2)),
    //   shareFormatted: share.toFixed(2) + '€',
    //   payerIsInParticipants,
    //   calculSoldeAttendu: payerId && validParticipants.includes(payerId) 
    //     ? `Payeur avance ${amount.toFixed(2)}€, consomme ${share.toFixed(2)}€, solde attendu = ${(amount - share).toFixed(2)}€`
    //     : payerId 
    //       ? `⚠️ PROBLÈME: Payeur ${payerId} pas dans participants ${validParticipants.join(', ')}`
    //       : 'Pas de payeur identifié',
    //   verificationEquite: payerIsInParticipants && participants.length === 2
    //     ? `Pour 2 participants: part attendue = ${expectedShareForTwo.toFixed(2)}€, part calculée = ${share.toFixed(2)}€, ${isShareIncorrect ? '⚠️ INCOHÉRENT' : '✅ COHÉRENT'}`
    //     : null
    // });
    
    if (paidByPot) {
      // Part cagnotte + part avance : on s'appuie sur la CONTRIBUTION TOTALE du participant (équité, logique sans faille).
      // Disponible cagnotte pour ce payeur = contribution totale - déjà utilisée pour ses dépenses précédentes.
      let amountFromPot = amount;
      let amountAsAdvance = 0;
      if (payerHasContribution && payerIdStr && balances[payerIdStr]) {
        const contributionTotale = balances[payerIdStr].contribution || 0;
        const dejaUtilise = contributionUtiliseeParPayeur[payerIdStr] || 0;
        const disponibleCagnotte = Math.max(0, contributionTotale - dejaUtilise);
        amountFromPot = Math.min(amount, disponibleCagnotte);
        amountAsAdvance = parseFloat((amount - amountFromPot).toFixed(2));
        contributionUtiliseeParPayeur[payerIdStr] = parseFloat((dejaUtilise + amountFromPot).toFixed(2));
        potBalance.expensesPaid = parseFloat((potBalance.expensesPaid + amountFromPot).toFixed(2));
        if (amountAsAdvance > 0.01) {
          balances[payerIdStr].avance = parseFloat((balances[payerIdStr].avance + amountAsAdvance).toFixed(2));
          totalAvances = parseFloat((totalAvances + amountAsAdvance).toFixed(2));
        }
        if (amountFromPot > 0.01) {
          balances[payerIdStr].consomme = parseFloat((balances[payerIdStr].consomme - amountFromPot).toFixed(2));
        }
      } else {
        potBalance.expensesPaid = parseFloat((potBalance.expensesPaid + amount).toFixed(2));
      }
      
      validParticipants.forEach(participantId => {
        balances[participantId].consomme = parseFloat((balances[participantId].consomme + share).toFixed(2));
      });
    } else if (payerIdStr && balances[payerIdStr]) {
      // Dépense payée par un participant
      // RÈGLE BONKONT : Le payeur avance le montant TOTAL, mais chaque participant (y compris le payeur) consomme seulement sa PART
      // Chaque participant qui avance des frais consomme sa part au prorata des autres participants
      // Tous les participants concernés consomment aussi leur part
      const avanceAvant = balances[payerIdStr].avance;
      balances[payerIdStr].avance = parseFloat((balances[payerIdStr].avance + amount).toFixed(2));
      totalAvances = parseFloat((totalAvances + amount).toFixed(2));
      
      // LOG TEMPORAIRE POUR DIAGNOSTIC
      console.log('[computeBalances] 💰 AVANCE AJOUTÉE:', {
        transactionId: transaction.id,
        payerId: payerIdStr,
        payerName: balances[payerIdStr].participantName,
        amount: parseFloat(amount.toFixed(2)),
        avanceAvant: parseFloat(avanceAvant.toFixed(2)),
        avanceApres: parseFloat(balances[payerIdStr].avance.toFixed(2)),
        difference: parseFloat((balances[payerIdStr].avance - avanceAvant).toFixed(2)),
        validParticipantsCount: validParticipants.length,
        shareParPersonne: parseFloat(share.toFixed(2)),
        message: `RÈGLE BONKONT: Payeur avance ${amount.toFixed(2)}€, chaque participant (y compris le payeur) consomme ${share.toFixed(2)}€`
      });
      
      // RÈGLE BONKONT : Chaque participant concerné consomme sa part (y compris le payeur)
      // Le payeur consomme sa part, et tous les autres participants concernés consomment aussi leur part
      validParticipants.forEach(participantId => {
        const participantIdStr = String(participantId);
        if (!balances[participantIdStr]) {
          console.error('[computeBalances] ❌ ERREUR: Participant non trouvé dans balances:', {
            transactionId: transaction.id,
            participantId: participantIdStr,
            availableBalances: Object.keys(balances)
          });
      return;
    }
    
        const consommeAvant = balances[participantIdStr].consomme;
        balances[participantIdStr].consomme = parseFloat((balances[participantIdStr].consomme + share).toFixed(2));
        const consommeApres = balances[participantIdStr].consomme;
        
        // LOG TEMPORAIRE POUR DIAGNOSTIC
        const isKalopic = balances[participantIdStr].participantName && balances[participantIdStr].participantName.toLowerCase().includes('kalopic');
        console.log('[computeBalances] 🍽️ CONSOMMATION AJOUTÉE:', {
          transactionId: transaction.id,
          participantId: participantIdStr,
          participantName: balances[participantIdStr].participantName,
          share: parseFloat(share.toFixed(2)),
          consommeAvant: parseFloat(consommeAvant.toFixed(2)),
          consommeApres: parseFloat(consommeApres.toFixed(2)),
          difference: parseFloat((consommeApres - consommeAvant).toFixed(2)),
          estPayeur: participantIdStr === payerIdStr,
          isKalopic,
          payerName: balances[payerIdStr]?.participantName,
          message: participantIdStr === payerIdStr 
            ? `Payeur consomme sa part: ${share.toFixed(2)}€`
            : `Participant consomme sa part: ${share.toFixed(2)}€`
        });
        
        // LOG SPÉCIFIQUE POUR KALOPIC
        if (isKalopic) {
          console.warn('[computeBalances] 🔍 KALOPIC - Consommation ajoutée:', {
            transactionId: transaction.id,
            payerName: balances[payerIdStr]?.participantName,
            amount: parseFloat(amount.toFixed(2)),
            share: parseFloat(share.toFixed(2)),
            consommeAvant: parseFloat(consommeAvant.toFixed(2)),
            consommeApres: parseFloat(consommeApres.toFixed(2)),
            validParticipantsCount: validParticipants.length,
            validParticipants: validParticipants.map(pId => balances[pId]?.participantName || pId),
            message: `Kalopic consomme ${share.toFixed(2)}€ de la dépense de ${balances[payerIdStr]?.participantName || payerIdStr} (${amount.toFixed(2)}€ pour ${validParticipants.length} participants)`
          });
        }
        
        // LOG DÉTAILLÉ POUR DIAGNOSTIC: Vérifier si c'est une transaction de 12.20€ entre 2 personnes
        if (Math.abs(amount - 12.20) < 0.01 && participants.length === 2) {
          console.warn(`[computeBalances] 🔍 DIAGNOSTIC: Ajout consommation pour participant ${participantIdStr}:`, {
            transactionId: transaction.id,
            participantId: participantIdStr,
            consommeAvant,
            share,
            consommeApres,
            difference: consommeApres - consommeAvant,
            expectedShare: amount / 2,
            isValid: Math.abs(share - (amount / 2)) < 0.01,
            estPayeur: participantIdStr === payerIdStr
          });
        }
      });
      
      // Calculer le solde attendu pour le payeur
      const soldePayeur = balances[payerIdStr].avance - balances[payerIdStr].consomme;
      const soldeAttendu = amount - share; // Ce que le payeur devrait recevoir
      
      // RÈGLE BONKONT : Répartition toujours équitable
      // Le payeur avance le montant total, tous les participants concernés consomment leur part équitablement
      
      // Log désactivé pour éviter la boucle infinie
      // console.log('[computeBalances] Dépense payée par participant:', {
      //   transactionId: transaction.id,
      //   payerId,
      //   amount: parseFloat(amount.toFixed(2)),
      //   avanceAvant: parseFloat((balances[payerId].avance - amount).toFixed(2)),
      //   avanceApres: parseFloat(balances[payerId].avance.toFixed(2)),
      //   participantsConcerned: validParticipants,
      //   participantsCount: validParticipants.length,
      //   consommationParPersonne: parseFloat(share.toFixed(2)),
      //   consommationPayeur: parseFloat(balances[payerId].consomme.toFixed(2)),
      //   soldePayeur: parseFloat(soldePayeur.toFixed(2)),
      //   soldeAttendu: parseFloat(soldeAttendu.toFixed(2)),
      //   payerIsInParticipants,
      //   isSuspectTransaction,
      //   message: isSuspectTransaction 
      //     ? `⚠️ ATTENTION: Transaction suspecte - Le payeur ${payerId} est seul dans la liste des participants. ` +
      //       `Si c'est une dépense partagée, il faut ajouter tous les participants concernés dans la transaction. ` +
      //       `Actuellement: payeur avance ${amount.toFixed(2)}€ et consomme ${share.toFixed(2)}€ (solde = ${soldePayeur.toFixed(2)}€). ` +
      //       `Si c'était partagé entre 4 personnes: payeur consommerait ${(amount/4).toFixed(2)}€ (solde = ${(amount - amount/4).toFixed(2)}€).`
      //     : `✅ Transaction normale - Payeur avance ${amount.toFixed(2)}€, consomme ${share.toFixed(2)}€, solde = ${soldePayeur.toFixed(2)}€`
      // });
    } else {
      // RÈGLE BONKONT: Dépense sans payeur identifié (payée par POT ou équitable)
      // Chaque participant concerné consomme sa part équitablement
      console.log('[computeBalances] ✅ RÈGLE BONKONT: Dépense sans payeur (équitable ou POT):', {
        transactionId: transaction.id,
        amount: parseFloat(amount.toFixed(2)),
        participantsConcerned: validParticipants.length,
        validParticipants,
        source: transaction.source,
        participants: transaction.participants,
        message: 'RÈGLE BONKONT: Chaque participant concerné consomme sa part équitablement.'
      });
      
      validParticipants.forEach(participantId => {
        balances[participantId].consomme = parseFloat((balances[participantId].consomme + share).toFixed(2));
      });
      
      // Log désactivé pour éviter la boucle infinie
      // console.log('[computeBalances] Dépense équitable (pas de payeur):', {
      //   transactionId: transaction.id,
      //   amount: parseFloat(amount.toFixed(2)),
      //   participantsConcerned: validParticipants.length
      // });
    }
  });
  
  // Log désactivé pour éviter la boucle infinie
  // console.log('[computeBalances] Dépenses traitées:', {
  //   totalConsommation: parseFloat(totalConsommation.toFixed(2)),
  //   totalAvances: parseFloat(totalAvances.toFixed(2)),
  //   expensesPaidByPot: parseFloat(potBalance.expensesPaid.toFixed(2))
  // });
  
  // ===== C) TRANSFERTS DIRECTS ENTRE PARTICIPANTS =====
  // RÈGLE BONKONT : Les transferts directs sont validés pour traçabilité et transparence
  // Ils ne déclenchent PAS de partage équitable car ce sont des paiements directs entre participants
  // La validation confirme simplement que le transfert est bien effectué et accepté
  directTransfers.forEach(transaction => {
    const amount = parseFloat((parseFloat(transaction.amount) || 0).toFixed(2));
    const fromId = transaction.fromId || transaction.from;
    const toId = transaction.toId || transaction.to;
    
    if (!fromId || !toId || amount === 0 || !balances[fromId] || !balances[toId]) return;
    
    balances[fromId].paidOut = parseFloat((balances[fromId].paidOut + amount).toFixed(2));
    balances[toId].received = parseFloat((balances[toId].received + amount).toFixed(2));
  });
  
  // ===== D) REMBOURSEMENTS POT → PARTICIPANTS =====
  // RÈGLE BONKONT : Les remboursements POT sont validés pour traçabilité et transparence
  // Ils ne déclenchent PAS de partage équitable car ce sont des remboursements directs
  // La validation confirme simplement que le remboursement est bien effectué et accepté
  potPayouts.forEach(transaction => {
    const amount = parseFloat((parseFloat(transaction.amount) || 0).toFixed(2));
    const toId = transaction.toId || transaction.to;
    
    if (!toId || amount === 0 || !balances[toId]) return;
    
    balances[toId].rembPot = parseFloat((balances[toId].rembPot + amount).toFixed(2));
    potBalance.payouts = parseFloat((potBalance.payouts + amount).toFixed(2));
  });
  
  // ===== CONTRIBUTION PRÉLEVÉE / RESTANT CAGNOTTE (pour présentation équitable) =====
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    const contrib = balance.contribution || 0;
    const utilisee = contributionUtiliseeParPayeur[participantId] || 0;
    balance.contributionUtilisee = parseFloat(utilisee.toFixed(2));
    balance.restantCagnotte = parseFloat((contrib - utilisee).toFixed(2));
  });
  
  // ===== CALCUL DES MISES DE FONDS RÉELLES =====
  // Toute somme prélevée sur la cagnotte du participant pour des dépenses devient une avance de fait → entre dans la mise pour le solde.
  // Mise = avance (hors cagnotte) + contributionUtilisee (prélevé sur cagnotte = avance de fait) + paidOut - received - rembPot
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    const avanceDeFait = balance.contributionUtilisee || 0;
    balance.mise = parseFloat((balance.avance + avanceDeFait + balance.paidOut - balance.received - balance.rembPot).toFixed(2));
    balance.miseAvecContribution = parseFloat(((balance.restantCagnotte ?? (balance.contribution || 0)) + balance.avance + avanceDeFait + balance.paidOut - balance.received - balance.rembPot).toFixed(2));
  });
  
  // ===== CALCUL DES SOLDES PROVISOIRES =====
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    balance.solde = parseFloat((balance.mise - balance.consomme).toFixed(2));
    
    // LOG DE DIAGNOSTIC pour vérifier la règle Bonkont
    if (balance.participantName && balance.participantName.toLowerCase().includes('kalopic')) {
      console.log('[computeBalances] 🔍 DIAGNOSTIC KALOPIC - Vérification règle Bonkont:', {
        participantId,
        participantName: balance.participantName,
        contribution: parseFloat((balance.contribution || 0).toFixed(2)),
        avance: parseFloat((balance.avance || 0).toFixed(2)),
        consomme: parseFloat((balance.consomme || 0).toFixed(2)),
        mise: parseFloat((balance.mise || 0).toFixed(2)),
        solde: parseFloat(balance.solde.toFixed(2)),
        calculSolde: `${balance.mise.toFixed(2)}€ (mise) - ${balance.consomme.toFixed(2)}€ (consomme) = ${balance.solde.toFixed(2)}€`,
        message: balance.solde > 0 
          ? `✅ Kalopic doit recevoir ${balance.solde.toFixed(2)}€ (il a avancé plus qu'il n'a consommé)`
          : balance.solde < 0
            ? `⚠️ Kalopic doit verser ${Math.abs(balance.solde).toFixed(2)}€ (il a consommé plus qu'il n'a avancé)`
            : `✅ Kalopic est équilibré`
      });
    }
  });
  
  // ===== CALCUL DU SOLDE POT =====
  potBalance.solde = parseFloat((potBalance.contributions - potBalance.expensesPaid - potBalance.payouts).toFixed(2));
  
  // ===== TEST DE COHÉRENCE =====
  const totalSoldeParticipants = Object.values(balances).reduce((sum, b) => sum + b.solde, 0);
  const totalSolde = totalSoldeParticipants + potBalance.solde;
  // Tolérance 2 centimes : éviter "répartition incomplète" quand tout s'équilibre à 0 (arrondis, flottants)
  const isBalanced = Math.abs(totalSolde) <= 0.02;
  
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
  
  // Log désactivé pour éviter la boucle infinie
  // console.log('[computeBalances] Détection cas "avances sans contributions":', {
  //   hasAdvancesWithoutContributions,
  //   totalAvance: parseFloat(totalAvance.toFixed(2)),
  //   potBalanceContributions: parseFloat(potBalance.contributions.toFixed(2)),
  //   isBalanced,
  //   theoreticalContributionPerParticipant: parseFloat(theoreticalContributionPerParticipant.toFixed(2)),
  //   totalTheoreticalContributions: parseFloat(totalTheoreticalContributions.toFixed(2)),
  //   eventAmount: parseFloat((event.amount || 0).toFixed(2)),
  //   participantsCount: participants.length
  // });
  
  // LOG DÉTAILLÉ POUR DIAGNOSTIC: Désactivé pour éviter la boucle infinie
  // if (participants.length === 2) {
  //   const participantsDetails = participants.map(p => ({
  //     id: p.id,
  //     name: p.name,
  //     avance: parseFloat((balances[p.id]?.avance || 0).toFixed(2)),
  //     consomme: parseFloat((balances[p.id]?.consomme || 0).toFixed(2)),
  //     mise: parseFloat((balances[p.id]?.mise || 0).toFixed(2)),
  //     solde: parseFloat((balances[p.id]?.solde || 0).toFixed(2)),
  //     contribution: parseFloat((balances[p.id]?.contribution || 0).toFixed(2))
  //   }));
  //   
  //   console.warn('[computeBalances] 🔍 DIAGNOSTIC FINAL - Événement à 2 participants:', {
  //     participants: participantsDetails,
  //     totalAvance: parseFloat(totalAvance.toFixed(2)),
  //     totalConsomme: parseFloat(totalConsomme.toFixed(2)),
  //     verification: `Total avances (${totalAvance.toFixed(2)}€) devrait égaler total consommation (${totalConsomme.toFixed(2)}€) si équilibré`
  //   });
  //   
  //   // Afficher chaque participant individuellement pour faciliter le diagnostic
  //   participantsDetails.forEach((p, index) => {
  //     console.warn(`[computeBalances] 🔍 Participant ${index + 1} - ${p.name}:`, {
  //       id: p.id,
  //       avance: `${p.avance.toFixed(2)}€`,
  //       consomme: `${p.consomme.toFixed(2)}€`,
  //       mise: `${p.mise.toFixed(2)}€`,
  //       solde: `${p.solde.toFixed(2)}€`,
  //       contribution: `${p.contribution.toFixed(2)}€`,
  //       calculSolde: `mise (${p.mise.toFixed(2)}€) - consomme (${p.consomme.toFixed(2)}€) = solde (${p.solde.toFixed(2)}€)`
  //     });
  //   });
  // }
  
  // Log désactivé pour éviter la boucle infinie
  // console.log('[computeBalances] Totaux calculés:', {
  //   totalMise: parseFloat(totalMise.toFixed(2)),
  //   totalConsomme: parseFloat(totalConsomme.toFixed(2)),
  //   totalContribution: parseFloat(totalContribution.toFixed(2)),
  //   totalAvance: parseFloat(totalAvance.toFixed(2)),
  //   totalPaidOut: parseFloat(totalPaidOut.toFixed(2)),
  //   totalReceived: parseFloat(totalReceived.toFixed(2)),
  //   totalRembPot: parseFloat(totalRembPot.toFixed(2)),
  //   potContributions: parseFloat(potBalance.contributions.toFixed(2)),
  //   potExpensesPaid: parseFloat(potBalance.expensesPaid.toFixed(2)),
  //   potPayouts: parseFloat(potBalance.payouts.toFixed(2)),
  //   potSolde: parseFloat(potBalance.solde.toFixed(2)),
  //   totalSoldeParticipants: parseFloat(totalSoldeParticipants.toFixed(2)),
  //   totalSolde: parseFloat(totalSolde.toFixed(2)),
  //   isBalanced
  // });
  
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
 *   Affichage : si warning est défini (ex. cagnotte déficitaire), ne pas afficher "répartition équilibrée"
 *   même si isBalanced est true — utiliser (isBalanced && !warning) pour le message équilibré.
 */
export function computeTransfers(balancesResult, mode = 'use_pot_priority') {
  const { balances, potBalance, isBalanced: globalBalanced } = balancesResult;
  const transfers = [];
  const potTransfers = [];
  
  const balancesArray = Object.values(balances);
  
  // RÈGLE BONKONT : Répartition toujours équitable
  // Chaque participant qui avance des frais consomme sa part, et tous les participants concernés consomment aussi leur part
  const totalAvances = balancesArray.reduce((sum, b) => sum + (b.avance || 0), 0);
  const totalConsomme = balancesArray.reduce((sum, b) => sum + (b.consomme || 0), 0);
  
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
    
    // Si POT a un solde négatif (déficitaire), afficher un avertissement (tolérance 2 ct pour arrondis)
    let warning = null;
    
    if (potBalance.solde < -0.02) {
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
 * Obtient la traçabilité des dépenses pour un participant.
 * Aligné sur computeBalances : même résolution du payeur et même règle "avance vs prélèvement cagnotte"
 * pour que détail des transactions = dépenses avancées (somme des montants = balance.avance).
 */
export function getExpenseTraceability(participantId, event, transactions) {
  const expenses = transactions.filter(t => isExpense(t));
  const participantIdStr = String(participantId);
  const depensesAvancees = [];
  const depensesConsommees = [];
  // Même logique que computeBalances : contribution totale déjà utilisée par payeur (équité)
  const contributionUtiliseeParPayeur = {};
  
  expenses.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    
    if (amount === 0) return;
    
    // Même résolution du payeur que computeBalances (pour cohérence détail = avances)
    let payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || null;
    if (!payerId && transaction.source === 'scanned_ticket' && transaction.participants && transaction.participants.length > 0) {
      payerId = transaction.participants[0];
    }
    if (!payerId && !isPaidByPot(transaction) && transaction.participants && transaction.participants.length > 0) {
      const firstId = String(transaction.participants[0]);
      if (event.participants?.some(p => String(p.id) === firstId)) {
        payerId = transaction.participants[0];
      }
    }
    const payerIdStr = payerId ? String(payerId) : null;
    
    // Même règle que computeBalances : explicite POT OU payeur a contribué → part cagnotte + éventuelle part avance
    let paidByPot = isPaidByPot(transaction);
    let payerContribution = 0;
    if (payerIdStr) {
      payerContribution = getContributionToPot(payerIdStr, event, transactions);
      if (payerContribution > 0.01) paidByPot = true;
    }
    
    const participantsConcerned = getParticipantsConcernedByExpense(transaction, event);
    if (participantsConcerned.length === 0) return;
    
    const share = amount / participantsConcerned.length;
    
    // Dépense avancée par ce participant : montant total si pas de pot, sinon seulement la part non couverte par sa cagnotte (ex. 75€ au pot + 129,60€ dépense → 54,60€ avance)
    if (payerIdStr === participantIdStr) {
      if (!paidByPot) {
        depensesAvancees.push({
          id: transaction.id,
          amount,
          description: transaction.description || transaction.store || 'Dépense',
          date: transaction.date || transaction.createdAt,
          participantsConcerned: participantsConcerned.length,
          share,
          partParPersonne: share,
          amountFromPot: 0
        });
      } else if (payerContribution > 0.01) {
        const dejaUtilise = contributionUtiliseeParPayeur[payerIdStr] || 0;
        const disponibleCagnotte = Math.max(0, payerContribution - dejaUtilise);
        const amountFromPot = Math.min(amount, disponibleCagnotte);
        const amountAsAdvance = parseFloat((amount - amountFromPot).toFixed(2));
        contributionUtiliseeParPayeur[payerIdStr] = parseFloat((dejaUtilise + amountFromPot).toFixed(2));
        if (amountAsAdvance > 0.01) {
          depensesAvancees.push({
            id: transaction.id,
            amount: amountAsAdvance,
            description: transaction.description || transaction.store || 'Dépense',
            date: transaction.date || transaction.createdAt,
            participantsConcerned: participantsConcerned.length,
            share,
            partParPersonne: share,
            amountFromPot: parseFloat(amountFromPot.toFixed(2)),
            amountTotal: amount
          });
        }
      }
    }
    
    // Dépense consommée par ce participant
    const isConcerned = participantsConcerned.some(pId => String(pId) === participantIdStr);
    
    if (isConcerned) {
      depensesConsommees.push({
        id: transaction.id,
        amount,
        description: transaction.description || transaction.store || 'Dépense',
        date: transaction.date || transaction.createdAt,
        payerId: paidByPot ? POT_ID : payerId,
        payerName: paidByPot ? POT_NAME : (payerId ? (event.participants?.find(p => String(p.id) === String(payerId))?.name || 'Inconnu') : 'Équitable'),
        share,
        part: share, // Alias pour compatibilité - C'EST LA PART RÉELLE (montant / nombre de participants)
        participantsConcerned: participantsConcerned.length // Nombre de participants concernés pour l'affichage
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
