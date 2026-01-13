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
  
  const paiements = transactions.filter(t => 
    t.source === 'payment' || 
    t.type === 'payment' ||
    (t.fromId && t.toId)
  );
  
  // ===== LIVRE A : DÉPENSES =====
  depenses.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const participantsConcerned = transaction.participants || [];
    
    if (participantsConcerned.length === 0 || amount === 0) return;
    
    // Part de chacun
    const partParPersonne = amount / participantsConcerned.length;
    
    // Identifier le payeur
    // Si la transaction a un payerId explicite, l'utiliser
    // Sinon, si c'est un ticket scanné, le premier participant est le payeur
    // Sinon, on considère que tous ont payé leur part (cas équitable)
    let payerId = transaction.payerId || transaction.payer || transaction.selectedPayerId || null;
    
    if (!payerId && transaction.source === 'scanned_ticket' && participantsConcerned.length > 0) {
      // Pour les tickets scannés, le payeur est celui qui a scanné (premier participant)
      payerId = participantsConcerned[0];
    }
    
    // Si la transaction a été créée via EventTicketScanner, le payeur est le participantId
    // qui a scanné le ticket (stored in participants[0] for scanned tickets)
    if (!payerId && transaction.source === 'scanned_ticket' && participantsConcerned.length === 1) {
      payerId = participantsConcerned[0];
    }
    
    // Si pas de payeur identifié, on considère que c'est une dépense équitable
    // (chacun a payé sa part)
    if (!payerId) {
      // Dépense équitable : chacun consomme sa part, personne n'avance
      participantsConcerned.forEach(participantId => {
        if (balances[participantId]) {
          balances[participantId].consomme += partParPersonne;
        }
      });
    } else {
      // Dépense avec payeur identifié
      if (balances[payerId]) {
        balances[payerId].avance += amount;
      }
      
      // Chaque participant concerné consomme sa part
      participantsConcerned.forEach(participantId => {
        if (balances[participantId]) {
          balances[participantId].consomme += partParPersonne;
        }
      });
    }
  });
  
  // Calculer soldeDepenses = Avancé - Consommé
  Object.keys(balances).forEach(participantId => {
    const balance = balances[participantId];
    balance.soldeDepenses = balance.avance - balance.consomme;
  });
  
  // ===== LIVRE B : PAIEMENTS =====
  paiements.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const fromId = transaction.fromId || transaction.from || null;
    const toId = transaction.toId || transaction.to || transaction.eventId || null;
    
    if (!fromId || amount === 0) return;
    
    // Le payeur a versé
    if (balances[fromId]) {
      balances[fromId].verse += amount;
    }
    
    // Le destinataire a reçu (si c'est un participant, sinon c'est la cagnotte)
    if (toId && balances[toId]) {
      balances[toId].recu += amount;
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
  
  return balances;
}

/**
 * Calcule les transferts optimaux "qui verse à qui"
 * 
 * @param {Object} balances - Soldes calculés par computeBalances
 * @returns {Array} - Liste des transferts [from, to, amount]
 */
export function computeTransfers(balances) {
  const transfers = [];
  const balancesArray = Object.values(balances);
  
  // Séparer créanciers (solde > 0) et débiteurs (solde < 0)
  const creanciers = balancesArray
    .filter(b => b.soldeFinal > 0.01)
    .sort((a, b) => b.soldeFinal - a.soldeFinal);
  
  const debiteurs = balancesArray
    .filter(b => b.soldeFinal < -0.01)
    .sort((a, b) => a.soldeFinal - b.soldeFinal);
  
  // Algorithme de matching : minimiser le nombre de transferts
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
    
    // Mettre à jour les soldes
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
  
  return transfers;
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

