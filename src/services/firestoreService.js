/**
 * Service Firestore pour Bonkont
 * Remplace les Firebase Functions par des appels Firestore directs
 * Compatible avec le plan Spark gratuit
 */

import { 
  db, 
  convertFirestoreDate, 
  toFirestoreDate 
} from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Cherche un événement par son code
 * @param {string} code - Code de l'événement (8 caractères)
 * @returns {Promise<Object|null>} L'événement trouvé ou null
 */
export async function findEventByCode(code) {
  if (!code || !code.trim()) {
    return null;
  }

  // Nettoyer le code : garder uniquement les lettres majuscules
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '');
  
  if (cleanCode.length < 8) {
    console.warn('[Firestore] Code trop court:', cleanCode);
    return null;
  }

  try {
    console.log('[Firestore] Searching event by code:', cleanCode);
    
    // Rechercher l'événement par code
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('code', '==', cleanCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('[Firestore] Event not found for code:', cleanCode);
      return null;
    }

    // Récupérer le premier résultat
    const eventDoc = querySnapshot.docs[0];
    const eventData = eventDoc.data();

    // Récupérer les participants
    const participantsRef = collection(db, 'events', eventDoc.id, 'participants');
    const participantsSnapshot = await getDocs(participantsRef);
    const participants = participantsSnapshot.docs.map(pDoc => ({
      id: pDoc.id,
      ...pDoc.data(),
      joinedAt: convertFirestoreDate(pDoc.data().joinedAt)
    }));

    // Formater la réponse selon le format attendu par le frontend
    const event = {
      id: eventDoc.id,
      code: eventData.code,
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || null,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      amount: (eventData.targetAmountPerPerson || 0) * (eventData.participantsTarget || 1),
      deadline: eventData.deadline || 30,
      currency: eventData.currency || 'EUR',
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      participants: participants,
      status: eventData.status || 'open',
      createdAt: convertFirestoreDate(eventData.createdAt),
      closedAt: eventData.closedAt ? convertFirestoreDate(eventData.closedAt) : null
    };

    console.log('[Firestore] Event found:', { id: event.id, code: event.code, title: event.title });
    return event;
  } catch (error) {
    console.error('[Firestore] Error fetching event by code:', error);
    return null;
  }
}

/**
 * Crée un nouvel événement dans Firestore
 * @param {Object} eventData - Données de l'événement
 * @returns {Promise<Object>} L'événement créé avec son ID
 */
export async function createEvent(eventData) {
  try {
    console.log('[Firestore] Creating event:', eventData);

    // Vérifier que le code n'existe pas déjà
    const existingEvent = await findEventByCode(eventData.code);
    if (existingEvent) {
      throw new Error('Un événement avec ce code existe déjà');
    }

    // Créer l'événement
    const eventsRef = collection(db, 'events');
    const eventDocRef = await addDoc(eventsRef, {
      code: eventData.code.toUpperCase(),
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || null,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      participantsTarget: eventData.participants?.length || eventData.expectedParticipants || 1,
      targetAmountPerPerson: eventData.amount / (eventData.participants?.length || 1),
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      deadline: eventData.deadline || 30,
      currency: eventData.currency || 'EUR',
      status: 'open',
      createdAt: serverTimestamp(),
      closedAt: null
    });

    console.log('[Firestore] Event created with ID:', eventDocRef.id);

    // Ajouter l'organisateur comme participant
    if (eventData.organizerId) {
      const participantsRef = collection(db, 'events', eventDocRef.id, 'participants');
      await addDoc(participantsRef, {
        userId: eventData.organizerId,
        name: eventData.organizerName || '',
        email: '',
        role: 'organizer',
        joinedAt: serverTimestamp(),
        approved: true
      });
    }

    return {
      success: true,
      eventId: eventDocRef.id,
      message: 'Événement créé avec succès'
    };
  } catch (error) {
    console.error('[Firestore] Error creating event:', error);
    throw error;
  }
}

/**
 * Crée une demande de participation pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {Object} participantData - Données du participant { userId, email, name }
 * @returns {Promise<Object>} La demande créée
 */
export async function createJoinRequest(eventId, participantData) {
  try {
    console.log('[Firestore] Creating join request:', { eventId, participantData });

    // Vérifier que l'événement existe
    const eventDocRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);
    
    if (!eventDoc.exists()) {
      throw new Error("L'événement n'existe pas");
    }

    // Vérifier si l'utilisateur n'a pas déjà une demande en attente
    const joinRequestsRef = collection(db, 'events', eventId, 'joinRequests');
    const existingQuery = query(
      joinRequestsRef,
      where('userId', '==', participantData.userId || participantData.email),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      throw new Error('Vous avez déjà une demande en attente pour cet événement');
    }

    // Créer la demande de participation
    const requestDocRef = await addDoc(joinRequestsRef, {
      userId: participantData.userId || participantData.email,
      email: participantData.email || '',
      name: participantData.name || participantData.pseudo,
      status: 'pending',
      requestedAt: serverTimestamp(),
      approvedAt: null
    });

    console.log('[Firestore] Join request created:', requestDocRef.id);

    return {
      success: true,
      requestId: requestDocRef.id,
      message: 'Demande de participation créée avec succès'
    };
  } catch (error) {
    console.error('[Firestore] Error creating join request:', error);
    throw error;
  }
}

/**
 * Récupère les demandes de participation pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {string} status - Statut optionnel (pending, approved, rejected)
 * @returns {Promise<Array>} Liste des demandes
 */
export async function getJoinRequests(eventId, status = null) {
  try {
    console.log('[Firestore] Fetching join requests:', { eventId, status });
    
    const joinRequestsRef = collection(db, 'events', eventId, 'joinRequests');
    let q = query(joinRequestsRef);
    
    if (status) {
      q = query(joinRequestsRef, where('status', '==', status));
    }
    
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: convertFirestoreDate(doc.data().requestedAt),
      approvedAt: doc.data().approvedAt ? convertFirestoreDate(doc.data().approvedAt) : null
    }));

    console.log('[Firestore] Join requests fetched:', requests.length);
    return requests;
  } catch (error) {
    console.error('[Firestore] Error fetching join requests:', error);
    throw error;
  }
}

/**
 * Approuve ou refuse une demande de participation
 * @param {string} eventId - ID de l'événement
 * @param {string} requestId - ID de la demande
 * @param {string} action - "approve" ou "reject"
 * @param {string} organizerId - ID de l'organisateur
 * @returns {Promise<Object>} Résultat de l'action
 */
export async function updateJoinRequest(eventId, requestId, action, organizerId) {
  try {
    console.log('[Firestore] Updating join request:', { eventId, requestId, action, organizerId });

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const eventDocRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);
    
    if (!eventDoc.exists()) {
      throw new Error("L'événement n'existe pas");
    }

    const eventData = eventDoc.data();
    if (eventData.organizerId !== organizerId) {
      throw new Error("Seul l'organisateur peut approuver ou refuser les demandes");
    }

    // Mettre à jour la demande
    const requestDocRef = doc(db, 'events', eventId, 'joinRequests', requestId);
    const requestDoc = await getDoc(requestDocRef);
    
    if (!requestDoc.exists()) {
      throw new Error("La demande n'existe pas");
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedAt: action === 'approve' ? serverTimestamp() : null
    };

    await updateDoc(requestDocRef, updateData);

    // Si approuvé, ajouter le participant à la collection participants
    if (action === 'approve') {
      const requestData = requestDoc.data();
      const participantsRef = collection(db, 'events', eventId, 'participants');
      await addDoc(participantsRef, {
        userId: requestData.userId,
        name: requestData.name,
        email: requestData.email || '',
        role: 'participant',
        joinedAt: serverTimestamp(),
        approved: true
      });
    }

    return {
      success: true,
      message: `Demande ${action === 'approve' ? 'approuvée' : 'refusée'} avec succès`
    };
  } catch (error) {
    console.error('[Firestore] Error updating join request:', error);
    throw error;
  }
}


 * Remplace les Firebase Functions par des appels Firestore directs
 * Compatible avec le plan Spark gratuit
 */

import { 
  db, 
  convertFirestoreDate, 
  toFirestoreDate 
} from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Cherche un événement par son code
 * @param {string} code - Code de l'événement (8 caractères)
 * @returns {Promise<Object|null>} L'événement trouvé ou null
 */
export async function findEventByCode(code) {
  if (!code || !code.trim()) {
    return null;
  }

  // Nettoyer le code : garder uniquement les lettres majuscules
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '');
  
  if (cleanCode.length < 8) {
    console.warn('[Firestore] Code trop court:', cleanCode);
    return null;
  }

  try {
    console.log('[Firestore] Searching event by code:', cleanCode);
    
    // Rechercher l'événement par code
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('code', '==', cleanCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('[Firestore] Event not found for code:', cleanCode);
      return null;
    }

    // Récupérer le premier résultat
    const eventDoc = querySnapshot.docs[0];
    const eventData = eventDoc.data();

    // Récupérer les participants
    const participantsRef = collection(db, 'events', eventDoc.id, 'participants');
    const participantsSnapshot = await getDocs(participantsRef);
    const participants = participantsSnapshot.docs.map(pDoc => ({
      id: pDoc.id,
      ...pDoc.data(),
      joinedAt: convertFirestoreDate(pDoc.data().joinedAt)
    }));

    // Formater la réponse selon le format attendu par le frontend
    const event = {
      id: eventDoc.id,
      code: eventData.code,
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || null,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      amount: (eventData.targetAmountPerPerson || 0) * (eventData.participantsTarget || 1),
      deadline: eventData.deadline || 30,
      currency: eventData.currency || 'EUR',
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      participants: participants,
      status: eventData.status || 'open',
      createdAt: convertFirestoreDate(eventData.createdAt),
      closedAt: eventData.closedAt ? convertFirestoreDate(eventData.closedAt) : null
    };

    console.log('[Firestore] Event found:', { id: event.id, code: event.code, title: event.title });
    return event;
  } catch (error) {
    console.error('[Firestore] Error fetching event by code:', error);
    return null;
  }
}

/**
 * Crée un nouvel événement dans Firestore
 * @param {Object} eventData - Données de l'événement
 * @returns {Promise<Object>} L'événement créé avec son ID
 */
export async function createEvent(eventData) {
  try {
    console.log('[Firestore] Creating event:', eventData);

    // Vérifier que le code n'existe pas déjà
    const existingEvent = await findEventByCode(eventData.code);
    if (existingEvent) {
      throw new Error('Un événement avec ce code existe déjà');
    }

    // Créer l'événement
    const eventsRef = collection(db, 'events');
    const eventDocRef = await addDoc(eventsRef, {
      code: eventData.code.toUpperCase(),
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || null,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      participantsTarget: eventData.participants?.length || eventData.expectedParticipants || 1,
      targetAmountPerPerson: eventData.amount / (eventData.participants?.length || 1),
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      deadline: eventData.deadline || 30,
      currency: eventData.currency || 'EUR',
      status: 'open',
      createdAt: serverTimestamp(),
      closedAt: null
    });

    console.log('[Firestore] Event created with ID:', eventDocRef.id);

    // Ajouter l'organisateur comme participant
    if (eventData.organizerId) {
      const participantsRef = collection(db, 'events', eventDocRef.id, 'participants');
      await addDoc(participantsRef, {
        userId: eventData.organizerId,
        name: eventData.organizerName || '',
        email: '',
        role: 'organizer',
        joinedAt: serverTimestamp(),
        approved: true
      });
    }

    return {
      success: true,
      eventId: eventDocRef.id,
      message: 'Événement créé avec succès'
    };
  } catch (error) {
    console.error('[Firestore] Error creating event:', error);
    throw error;
  }
}

/**
 * Crée une demande de participation pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {Object} participantData - Données du participant { userId, email, name }
 * @returns {Promise<Object>} La demande créée
 */
export async function createJoinRequest(eventId, participantData) {
  try {
    console.log('[Firestore] Creating join request:', { eventId, participantData });

    // Vérifier que l'événement existe
    const eventDocRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);
    
    if (!eventDoc.exists()) {
      throw new Error("L'événement n'existe pas");
    }

    // Vérifier si l'utilisateur n'a pas déjà une demande en attente
    const joinRequestsRef = collection(db, 'events', eventId, 'joinRequests');
    const existingQuery = query(
      joinRequestsRef,
      where('userId', '==', participantData.userId || participantData.email),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      throw new Error('Vous avez déjà une demande en attente pour cet événement');
    }

    // Créer la demande de participation
    const requestDocRef = await addDoc(joinRequestsRef, {
      userId: participantData.userId || participantData.email,
      email: participantData.email || '',
      name: participantData.name || participantData.pseudo,
      status: 'pending',
      requestedAt: serverTimestamp(),
      approvedAt: null
    });

    console.log('[Firestore] Join request created:', requestDocRef.id);

    return {
      success: true,
      requestId: requestDocRef.id,
      message: 'Demande de participation créée avec succès'
    };
  } catch (error) {
    console.error('[Firestore] Error creating join request:', error);
    throw error;
  }
}

/**
 * Récupère les demandes de participation pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {string} status - Statut optionnel (pending, approved, rejected)
 * @returns {Promise<Array>} Liste des demandes
 */
export async function getJoinRequests(eventId, status = null) {
  try {
    console.log('[Firestore] Fetching join requests:', { eventId, status });
    
    const joinRequestsRef = collection(db, 'events', eventId, 'joinRequests');
    let q = query(joinRequestsRef);
    
    if (status) {
      q = query(joinRequestsRef, where('status', '==', status));
    }
    
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: convertFirestoreDate(doc.data().requestedAt),
      approvedAt: doc.data().approvedAt ? convertFirestoreDate(doc.data().approvedAt) : null
    }));

    console.log('[Firestore] Join requests fetched:', requests.length);
    return requests;
  } catch (error) {
    console.error('[Firestore] Error fetching join requests:', error);
    throw error;
  }
}

/**
 * Approuve ou refuse une demande de participation
 * @param {string} eventId - ID de l'événement
 * @param {string} requestId - ID de la demande
 * @param {string} action - "approve" ou "reject"
 * @param {string} organizerId - ID de l'organisateur
 * @returns {Promise<Object>} Résultat de l'action
 */
export async function updateJoinRequest(eventId, requestId, action, organizerId) {
  try {
    console.log('[Firestore] Updating join request:', { eventId, requestId, action, organizerId });

    // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
    const eventDocRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);
    
    if (!eventDoc.exists()) {
      throw new Error("L'événement n'existe pas");
    }

    const eventData = eventDoc.data();
    if (eventData.organizerId !== organizerId) {
      throw new Error("Seul l'organisateur peut approuver ou refuser les demandes");
    }

    // Mettre à jour la demande
    const requestDocRef = doc(db, 'events', eventId, 'joinRequests', requestId);
    const requestDoc = await getDoc(requestDocRef);
    
    if (!requestDoc.exists()) {
      throw new Error("La demande n'existe pas");
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedAt: action === 'approve' ? serverTimestamp() : null
    };

    await updateDoc(requestDocRef, updateData);

    // Si approuvé, ajouter le participant à la collection participants
    if (action === 'approve') {
      const requestData = requestDoc.data();
      const participantsRef = collection(db, 'events', eventId, 'participants');
      await addDoc(participantsRef, {
        userId: requestData.userId,
        name: requestData.name,
        email: requestData.email || '',
        role: 'participant',
        joinedAt: serverTimestamp(),
        approved: true
      });
    }

    return {
      success: true,
      message: `Demande ${action === 'approve' ? 'approuvée' : 'refusée'} avec succès`
    };
  } catch (error) {
    console.error('[Firestore] Error updating join request:', error);
    throw error;
  }
}

