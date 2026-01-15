/**
 * Module Bonkont : Calcul des soldes et répartition
 * 
 * Distingue :
 * - Budget (limite théorique) vs Répartition (réalité)
 * - Dépenses (tickets payés) vs Paiements (règlements)
 * 
 * Calcule les soldes finaux et les transferts "qui verse à qui"
 */

/**
 * Calcule les soldes pour chaque participant d'un événement
 * 
 * @param {Object} event - L'événement avec participants
 * @param {Array} transactions - Toutes les transactions de l'événement
 * @returns {Object} - Soldes par participant
 */
export function computeBalances(event, transactions) {
  const participants = event.participants || [];
  const balances = {};
  
  // Initialiser les soldes à 0 pour tous les participants
  participants.forEach(p => {
    balances[p.id] = {
      participantId: p.id,
      participantName: p.name || p.firstName || p.email || 'Participant inconnu',
      // Solde dépenses (Avancé - Consommé)
      soldeDepenses: 0,
      avance: 0,        // Ce qu'il a avancé (payé pour les autres)
      consomme: 0,      // Ce qu'il a consommé (sa part)
      // Solde paiements (Versé - Reçu)
      soldePaiements: 0,
      verse: 0,         // Ce qu'il a versé (règlements)
      recu: 0,          // Ce qu'il a reçu (règlements)
      // Solde final
      soldeFinal: 0
    };
  });
  
  // Séparer les transactions en dépenses et paiements
  const depenses = transactions.filter(t => 
    t.source === 'scanned_ticket' || 
    t.source === 'manual' || 
    !t.source || 
    (t.participants && t.participants.length > 0)
  );
  
  const paiements = transactions.filter(t => {
    // Identifier les paiements :
    // 1. Transactions explicites avec source='payment' ou type='payment'
    // 2. Transactions avec fromId (paiement d'un participant)
    //    - toId peut être un autre participant (transfert) ou eventId (cagnotte) ou null (cagnotte)
    // 3. Exclure les dépenses (scanned_ticket, manual sans fromId/toId)
    const isPayment = t.source === 'payment' || t.type === 'payment';
    const hasPaymentFields = t.fromId; // Un paiement a toujours un fromId (qui paie)
    
    // Exclure les dépenses qui n'ont pas de fromId/toId
    const isExpense = (t.source === 'scanned_ticket' || t.source === 'manual' || !t.source) && !t.fromId;
    
    return (isPayment || hasPaymentFields) && !isExpense;
  });
  
  // ===== LIVRE A : DÉPENSES =====
  depenses.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const participantsConcerned = transaction.participants || [];
    
    if (participantsConcerned.length === 0 || amount === 0) return;
    
    // Filtrer les participants qui existent réellement dans l'événement
    // CRUCIAL pour garantir l'équilibre : si un participant n'existe plus,
    // sa part ne doit pas être comptabilisée
    const validParticipants = participantsConcerned.filter(pId => balances[pId]);
    
    if (validParticipants.length === 0) {
      console.warn(`[computeBalances] Dépense ignorée : aucun participant valide pour la transaction ${transaction.id}`);
      return;
    }
    
    // Part de chacun (basée sur les participants valides uniquement)
    // Cela garantit que : somme(consomme) = amount pour chaque dépense
    const partParPersonne = amount / validParticipants.length;
    
    // Identifier le payeur
    let payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || null;
    
    if (!payerId && transaction.source === 'scanned_ticket' && validParticipants.length > 0) {
      payerId = validParticipants[0];
    }
    
    if (!payerId && transaction.source === 'scanned_ticket' && validParticipants.length === 1) {
      payerId = validParticipants[0];
    }
    
    // Vérifier que le payeur existe dans les participants valides
    if (payerId && !balances[payerId]) {
      console.warn(`[computeBalances] Payeur ${payerId} non trouvé, dépense traitée comme équitable`);
      payerId = null;
    }
    
    // Si pas de payeur identifié, dépense équitable
    if (!payerId) {
      // Dépense équitable : chacun consomme sa part, personne n'avance
      // Équilibre garanti : somme(consomme) = amount
      validParticipants.forEach(participantId => {
        balances[participantId].consomme += partParPersonne;
      });
    } else {
      // Dépense avec payeur identifié
      balances[payerId].avance += amount;
      
      // Chaque participant valide consomme sa part
      // Équilibre garanti : avance = amount, somme(consomme) = amount
      validParticipants.forEach(participantId => {
        balances[participantId].consomme += partParPersonne;
      });
    }
  });
  
  // Calculer soldeDepenses = Avancé - Consommé
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    balance.soldeDepenses = balance.avance - balance.consomme;
  });
  
  // ===== LIVRE B : PAIEMENTS =====
  // IMPORTANT : Seuls les transferts ENTRE PARTICIPANTS affectent le solde final
  // Les paiements vers la cagnotte (toId === eventId) sont des contributions au budget
  // et ne doivent PAS affecter le calcul des soldes finaux pour garantir l'équilibre
  
  paiements.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const fromId = transaction.fromId || transaction.from || null;
    const toId = transaction.toId || transaction.to || null;
    const transactionEventId = transaction.eventId || null;
    
    if (!fromId || amount === 0) return;
    
    // Vérifier que le payeur existe dans les participants
    if (!balances[fromId]) {
      console.warn(`[computeBalances] Paiement ignoré : payeur ${fromId} non trouvé dans les participants`);
      return;
    }
    
    // Distinguer les transferts entre participants des paiements vers la cagnotte
    const isTransferBetweenParticipants = toId && toId !== transactionEventId && balances[toId];
    const isPaymentToCagnotte = !toId || toId === transactionEventId;
    
    if (isTransferBetweenParticipants) {
      // Transfert entre participants : affecte le solde final
      // Le payeur a versé
      balances[fromId].verse += amount;
      // Le destinataire a reçu
      balances[toId].recu += amount;
      // Équilibre garanti : verse = recu pour ce transfert
    } else if (isPaymentToCagnotte) {
      // Paiement vers la cagnotte : NE PAS comptabiliser dans les soldes finaux
      // Ces paiements sont des contributions au budget, pas des règlements de solde
      // Ils n'affectent pas le solde final car ils ne créent pas de dette/créance entre participants
      // On les ignore pour garantir l'équilibre : somme(soldeFinal) = 0
      console.log(`[computeBalances] Paiement vers la cagnotte ignoré pour le calcul des soldes : ${amount}€ de ${fromId}`);
    }
  });
  
  // Calculer soldePaiements = Versé - Reçu
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    balance.soldePaiements = balance.verse - balance.recu;
  });
  
  // ===== SOLDE FINAL =====
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    balance.soldeFinal = balance.soldeDepenses + balance.soldePaiements;
  });
  
  // ===== CONTRÔLE D'ÉQUILIBRE =====
  // Vérifier que la somme des soldes finaux ≈ 0 (à 1 centime près)
  const totalSoldeFinal = Object.values(balances).reduce((sum, b) => sum + b.soldeFinal, 0);
  
  // Calculer aussi les totaux par couche pour le diagnostic
  const totalAvance = Object.values(balances).reduce((sum, b) => sum + b.avance, 0);
  const totalConsomme = Object.values(balances).reduce((sum, b) => sum + b.consomme, 0);
  const totalVerse = Object.values(balances).reduce((sum, b) => sum + b.verse, 0);
  const totalRecu = Object.values(balances).reduce((sum, b) => sum + b.recu, 0);
  
  // Le déséquilibre peut venir de :
  // 1. Dépenses avec participants invalides (non comptabilisées)
  // 2. Paiements vers la cagnotte qui créent un solde paiements négatif non compensé
  // 3. Transactions avec montants invalides
  
  const isBalanced = Math.abs(totalSoldeFinal) <= 0.01;
  
  // Ajouter l'information d'équilibre aux balances
  Object.keys(balances).forEach(participantId => {
    balances[participantId]._isBalanced = isBalanced;
    balances[participantId]._totalSoldeFinal = totalSoldeFinal;
    balances[participantId]._diagnostics = {
      totalAvance,
      totalConsomme,
      totalVerse,
      totalRecu,
      soldeDepensesTotal: totalAvance - totalConsomme,
      soldePaiementsTotal: totalVerse - totalRecu
    };
  });
  
  // Log de diagnostic si déséquilibré
  if (!isBalanced) {
    console.warn('[computeBalances] Déséquilibre détecté:', {
      totalSoldeFinal,
      totalAvance,
      totalConsomme,
      totalVerse,
      totalRecu,
      soldeDepensesTotal: totalAvance - totalConsomme,
      soldePaiementsTotal: totalVerse - totalRecu,
      ecart: totalSoldeFinal
    });
  }
  
  return balances;
}

/**
 * Calcule les transferts optimaux "qui verse à qui"
 * Basé UNIQUEMENT sur le solde final (règle Bonkont)
 * 
 * @param {Object} balances - Soldes calculés par computeBalances
 * @returns {Object} - { transfers: [...], isBalanced: boolean, balanceError: number, warning: string }
 */
export function computeTransfers(balances) {
  const transfers = [];
  const balancesArray = Object.values(balances);
  
  // Vérifier l'équilibre global
  const totalSoldeFinal = balancesArray.reduce((sum, b) => sum + b.soldeFinal, 0);
  const isBalanced = Math.abs(totalSoldeFinal) <= 0.01;
  
  // Séparer créanciers (solde > 0) et débiteurs (solde < 0)
  // Utiliser des copies pour ne pas modifier les soldes originaux
  const creanciers = balancesArray
    .filter(b => b.soldeFinal > 0.01)
    .map(b => ({ ...b, soldeFinal: b.soldeFinal }))
    .sort((a, b) => b.soldeFinal - a.soldeFinal);
  
  const debiteurs = balancesArray
    .filter(b => b.soldeFinal < -0.01)
    .map(b => ({ ...b, soldeFinal: b.soldeFinal }))
    .sort((a, b) => a.soldeFinal - b.soldeFinal);
  
  // Vérifier la cohérence : si on a des débiteurs, on doit avoir des créanciers (et vice versa)
  const totalCreditors = creanciers.reduce((sum, c) => sum + c.soldeFinal, 0);
  const totalDebtors = Math.abs(debiteurs.reduce((sum, d) => sum + d.soldeFinal, 0));
  
  let warning = null;
  if (!isBalanced) {
    warning = `Répartition incomplète : la somme des soldes finaux est ${totalSoldeFinal.toFixed(2)}€ au lieu de 0€. Certaines dépenses ou paiements ne sont pas rattachés à un participant (contrepartie manquante).`;
  } else if (debiteurs.length > 0 && creanciers.length === 0) {
    warning = `Incohérence détectée : ${debiteurs.length} participant(s) doivent verser mais aucun créancier identifié.`;
  } else if (creanciers.length > 0 && debiteurs.length === 0) {
    warning = `Incohérence détectée : ${creanciers.length} participant(s) doivent recevoir mais aucun débiteur identifié.`;
  } else if (Math.abs(totalCreditors - totalDebtors) > 0.01) {
    warning = `Déséquilibre détecté : total créanciers (${totalCreditors.toFixed(2)}€) ≠ total débiteurs (${totalDebtors.toFixed(2)}€).`;
  }
  
  // Algorithme de matching "greedy" : minimiser le nombre de transferts
  let creancierIndex = 0;
  let debiteurIndex = 0;
  
  while (creancierIndex < creanciers.length && debiteurIndex < debiteurs.length) {
    const creancier = creanciers[creancierIndex];
    const debiteur = debiteurs[debiteurIndex];
    
    if (creancier.soldeFinal < 0.01) {
      creancierIndex++;
      continue;
    }
    
    if (Math.abs(debiteur.soldeFinal) < 0.01) {
      debiteurIndex++;
      continue;
    }
    
    // Montant du transfert = minimum des deux soldes
    const transferAmount = Math.min(creancier.soldeFinal, Math.abs(debiteur.soldeFinal));
    
    transfers.push({
      from: debiteur.participantId,
      fromName: debiteur.participantName,
      to: creancier.participantId,
      toName: creancier.participantName,
      amount: Math.round(transferAmount * 100) / 100 // Arrondir à 2 décimales
    });
    
    // Mettre à jour les soldes (copies locales)
    creancier.soldeFinal -= transferAmount;
    debiteur.soldeFinal += transferAmount;
    
    // Avancer les indices si nécessaire
    if (creancier.soldeFinal < 0.01) {
      creancierIndex++;
    }
    if (Math.abs(debiteur.soldeFinal) < 0.01) {
      debiteurIndex++;
    }
  }
  
  return {
    transfers,
    isBalanced,
    balanceError: totalSoldeFinal,
    warning,
    totalCreditors,
    totalDebtors
  };
}

/**
 * Formate les soldes pour l'affichage
 */
export function formatBalance(balance) {
  return {
    ...balance,
    soldeFinalFormatted: balance.soldeFinal >= 0 
      ? `+${balance.soldeFinal.toFixed(2)} €` 
      : `${balance.soldeFinal.toFixed(2)} €`,
    status: balance.soldeFinal > 0.01 
      ? 'doit_recevoir' 
      : balance.soldeFinal < -0.01 
        ? 'doit_verser' 
        : 'equilibre'
  };
}

/**
 * Obtient les transferts pour un participant spécifique
 * Retourne "qui verse à qui" pour ce participant
 * 
 * @param {string} participantId - ID du participant
 * @param {Array} transfers - Liste des transferts calculés par computeTransfers
 * @returns {Object} - { toReceive: [...], toPay: [...] }
 */
export function getParticipantTransfers(participantId, transfers) {
  const toReceive = transfers.filter(t => t.to === participantId);
  const toPay = transfers.filter(t => t.from === participantId);
  
  return {
    toReceive,
    toPay,
    hasTransfers: toReceive.length > 0 || toPay.length > 0
  };
}

/**
 * Obtient la traçabilité des paiements pour un participant
 * Retourne la liste des paiements qui expliquent son solde
 * 
 * @param {string} participantId - ID du participant
 * @param {Object} event - L'événement
 * @param {Array} transactions - Toutes les transactions
 * @returns {Object} - { paiementsVerses: [...], paiementsRecus: [...] }
 */
export function getPaymentTraceability(participantId, event, transactions) {
  const paiements = transactions.filter(t => {
    const isPayment = t.source === 'payment' || t.type === 'payment';
    const hasPaymentFields = t.fromId;
    const isExpense = (t.source === 'scanned_ticket' || t.source === 'manual' || !t.source) && !t.fromId;
    return (isPayment || hasPaymentFields) && !isExpense;
  });
  
  const paiementsVerses = [];
  const paiementsRecus = [];
  
  paiements.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const fromId = transaction.fromId || transaction.from || null;
    const toId = transaction.toId || transaction.to || null;
    
    if (!fromId || amount === 0) return;
    
    // Paiement versé par ce participant
    if (fromId === participantId) {
      const recipientName = toId && event.participants?.find(p => p.id === toId)?.name 
        ? event.participants.find(p => p.id === toId).name
        : toId === event.id || !toId 
          ? 'Cagnotte événement'
          : 'Participant inconnu';
      
      // Récupérer les informations de validation collective
      const validatedBy = transaction.validatedBy || [];
      const validators = validatedBy
        .map(validatorId => {
          const validator = event.participants?.find(p => p.id === validatorId);
          return validator ? validator.name : null;
        })
        .filter(name => name !== null);
      
      paiementsVerses.push({
        id: transaction.id,
        amount: amount,
        description: transaction.description || transaction.store || 'Paiement',
        date: transaction.date || transaction.createdAt,
        toId: toId,
        toName: recipientName,
        method: transaction.paymentMethod || 'non spécifié',
        validatedBy: validatedBy,
        validators: validators,
        isCollectivelyValidated: validatedBy.length > 0
      });
    }
    
    // Paiement reçu par ce participant
    if (toId === participantId) {
      const payerName = event.participants?.find(p => p.id === fromId)?.name || 'Participant inconnu';
      
      // Récupérer les informations de validation collective
      const validatedBy = transaction.validatedBy || [];
      const validators = validatedBy
        .map(validatorId => {
          const validator = event.participants?.find(p => p.id === validatorId);
          return validator ? validator.name : null;
        })
        .filter(name => name !== null);
      
      paiementsRecus.push({
        id: transaction.id,
        amount: amount,
        description: transaction.description || transaction.store || 'Paiement',
        date: transaction.date || transaction.createdAt,
        fromId: fromId,
        fromName: payerName,
        method: transaction.paymentMethod || 'non spécifié',
        validatedBy: validatedBy,
        validators: validators,
        isCollectivelyValidated: validatedBy.length > 0
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
 * Retourne la liste des dépenses qui expliquent son solde
 * 
 * @param {string} participantId - ID du participant
 * @param {Object} event - L'événement
 * @param {Array} transactions - Toutes les transactions
 * @returns {Object} - { depensesAvancees: [...], depensesConsommees: [...] }
 */
export function getExpenseTraceability(participantId, event, transactions) {
  const depenses = transactions.filter(t => 
    t.source === 'scanned_ticket' || 
    t.source === 'manual' || 
    !t.source || 
    (t.participants && t.participants.length > 0)
  );
  
  const depensesAvancees = [];
  const depensesConsommees = [];
  
  depenses.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const participantsConcerned = transaction.participants || [];
    
    if (participantsConcerned.length === 0 || amount === 0) return;
    
    const partParPersonne = amount / participantsConcerned.length;
    let payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || null;
    
    if (!payerId && transaction.source === 'scanned_ticket' && participantsConcerned.length > 0) {
      payerId = participantsConcerned[0];
    }
    
    // Dépense avancée par ce participant
    if (payerId === participantId) {
      depensesAvancees.push({
        id: transaction.id,
        amount: amount,
        description: transaction.description || transaction.title || 'Dépense',
        date: transaction.date || transaction.createdAt,
        participantsConcerned: participantsConcerned.length,
        partParPersonne: partParPersonne
      });
    }
    
    // Dépense consommée par ce participant
    if (participantsConcerned.includes(participantId)) {
      depensesConsommees.push({
        id: transaction.id,
        amount: amount,
        description: transaction.description || transaction.title || 'Dépense',
        date: transaction.date || transaction.createdAt,
        payerId: payerId,
        payerName: payerId ? (event.participants?.find(p => p.id === payerId)?.name || 'Inconnu') : null,
        part: partParPersonne
      });
    }
  });
  
  return {
    depensesAvancees,
    depensesConsommees
  };
}

