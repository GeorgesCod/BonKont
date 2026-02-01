/**
 * Service Firestore pour Bonkont
 * Remplace les Firebase Functions par des appels Firestore directs
 * Compatible avec le plan Spark gratuit
 *
 * CONTRACT FIRESTORE – ORGANISATEUR (cohérence de bout en bout)
 * - Chaque document events/{eventId} DOIT contenir organizerId et organizerName.
 * - organizerId : identifiant de l'initiateur (souvent l'email). Utilisé pour getEventsByOrganizer, notifications, join requests.
 * - organizerName : nom affiché de l'organisateur (initiateur, leader, modérateur, clôture).
 * - createEvent : exige organizerId, persiste organizerId + organizerName, ajoute l'organisateur en participant avec role='organizer'.
 * - findEventByCode / getEventsByOrganizer : retournent toujours organizerId et organizerName (organizerName || '' si absent).
 * - Aucune mise à jour du document événement après création ne doit écraser organizerId/organizerName.
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
  Timestamp,
  setDoc,
  writeBatch,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';

/**
 * Cherche un événement par son code
 * @param {string} code - Code de l'événement (8 caractères)
 * @returns {Promise<Object|null>} L'événement trouvé ou null
 */
/**
 * Trouve un événement par son code
 * Le code événement est lié à l'organisateur via organizerId dans le document événement
 * Retourne l'événement avec organizerId, organizerName et la liste des participants (incluant l'organisateur)
 */
export async function findEventByCode(code) {
  console.log('[Firestore] 🔍 findEventByCode called with:', { code, type: typeof code });
  
  if (!code || !code.trim()) {
    console.warn('[Firestore] ⚠️ Empty or invalid code provided');
    return null;
  }

  // Nettoyer le code : garder uniquement les lettres majuscules
  const originalCode = code;
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '');
  
  console.log('[Firestore] 🔍 Code processing:', {
    original: originalCode,
    cleaned: cleanCode,
    length: cleanCode.length
  });
  
  if (cleanCode.length < 8) {
    console.warn('[Firestore] ⚠️ Code trop court:', { original: originalCode, cleaned: cleanCode, length: cleanCode.length });
    return null;
  }

  try {
    console.log('[Firestore] 🔍 Searching event by code in Firestore:', cleanCode);
    
    // Rechercher l'événement par code
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('code', '==', cleanCode));
    
    console.log('[Firestore] 📡 Executing Firestore query...');
    const querySnapshot = await getDocs(q);

    console.log('[Firestore] 📊 Query result:', {
      empty: querySnapshot.empty,
      size: querySnapshot.size,
      codeSearched: cleanCode
    });

    if (querySnapshot.empty) {
      console.log('[Firestore] ❌ Event not found for code:', cleanCode);
      console.log('[Firestore] 💡 Debug info: Check if code exists in Firestore with exact value:', cleanCode);
      console.log('[Firestore] 🔍 Suggestion: Verify the code was saved correctly during event creation');
      console.log('[Firestore] 🔍 Try querying all events to see what codes exist');
      
      // Log supplémentaire pour débogage : lister quelques événements pour voir les codes existants
      try {
        const allEventsSnapshot = await getDocs(collection(db, 'events'));
        const allCodes = allEventsSnapshot.docs.map(doc => ({
          id: doc.id,
          code: doc.data().code,
          title: doc.data().title
        }));
        console.log('[Firestore] 📋 All events in database (first 10):', allCodes.slice(0, 10));
      } catch (debugError) {
        console.warn('[Firestore] ⚠️ Could not fetch all events for debug:', debugError);
      }
      
      return null;
    }

    // Récupérer le premier résultat
    const eventDoc = querySnapshot.docs[0];
    const eventData = eventDoc.data();

    console.log('[Firestore] ✅ Event document found:', {
      eventId: eventDoc.id,
      code: eventData.code,
      title: eventData.title,
      organizerId: eventData.organizerId
    });

    // Récupérer les participants
    console.log('[Firestore] 👥 Fetching participants for event:', eventDoc.id);
    const participantsRef = collection(db, 'events', eventDoc.id, 'participants');
    const participantsSnapshot = await getDocs(participantsRef);
    let participants = participantsSnapshot.docs.map(pDoc => ({
      id: pDoc.id,
      ...pDoc.data(),
      joinedAt: convertFirestoreDate(pDoc.data().joinedAt)
    }));

    // ✅ DÉDUPLICATION AMÉLIORÉE : Supprimer les doublons par email ET userId
    console.log('[Firestore] 👥 Participants BEFORE deduplication:', participants.length);
    console.log('[Firestore] 👥 Participants details BEFORE:', JSON.stringify(participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      userId: p.userId,
      role: p.role,
      isOrganizer: p.isOrganizer
    })), null, 2));

    const seenByEmail = new Map();
    const seenByUserId = new Map();
    const seenById = new Map(); // Par ID de document Firestore
    const duplicatesRemoved = [];

    participants = participants.filter(p => {
      // Normaliser les emails et userIds
      const emailKey = (p.email || '').toLowerCase().trim();
      const userIdKey = (p.userId || '').toLowerCase().trim();
      const docId = (p.id || '').toLowerCase().trim();
      
      // ✅ Vérifier d'abord par ID de document (le plus fiable)
      if (docId && seenById.has(docId)) {
        duplicatesRemoved.push({ type: 'docId', key: docId, participant: p });
        console.warn('[Firestore] ⚠️⚠️⚠️ DUPLICATE BY DOC ID:', {
          docId,
          name: p.name,
          email: p.email,
          userId: p.userId,
          existing: seenById.get(docId)
        });
        return false;
      }
      
      // Vérifier les doublons par email
      if (emailKey && seenByEmail.has(emailKey)) {
        const existing = seenByEmail.get(emailKey);
        duplicatesRemoved.push({ type: 'email', key: emailKey, participant: p, existing });
        console.warn('[Firestore] ⚠️⚠️⚠️ DUPLICATE BY EMAIL:', {
          email: emailKey,
          name: p.name,
          userId: p.userId,
          id: p.id,
          existingName: existing.name,
          existingId: existing.id,
          existingEmail: existing.email
        });
        return false;
      }
      
      // Vérifier les doublons par userId
      if (userIdKey && seenByUserId.has(userIdKey)) {
        const existing = seenByUserId.get(userIdKey);
        duplicatesRemoved.push({ type: 'userId', key: userIdKey, participant: p, existing });
        console.warn('[Firestore] ⚠️⚠️⚠️ DUPLICATE BY USERID:', {
          userId: userIdKey,
          name: p.name,
          email: p.email,
          id: p.id,
          existingName: existing.name,
          existingId: existing.id,
          existingUserId: existing.userId
        });
        return false;
      }
      
      // ✅ Cas spécial : si email === userId (comme "rsi.info9@gmail.com")
      // Vérifier si on a déjà vu quelqu'un avec le même email OU userId
      if (emailKey && userIdKey && emailKey === userIdKey) {
        // Si on a déjà vu cet email/userId, c'est un doublon
        if (seenByEmail.has(emailKey) || seenByUserId.has(userIdKey)) {
          duplicatesRemoved.push({ type: 'emailEqualsUserId', key: emailKey, participant: p });
          console.warn('[Firestore] ⚠️⚠️⚠️ DUPLICATE BY EMAIL=USERID:', {
            key: emailKey,
            name: p.name,
            id: p.id
          });
          return false;
        }
      }
      
      // Ajouter aux maps si pas de doublon
      if (docId) seenById.set(docId, p);
      if (emailKey) seenByEmail.set(emailKey, p);
      if (userIdKey) seenByUserId.set(userIdKey, p);
      
      return true;
    });

    console.log('[Firestore] 📊 Deduplication results:', {
      before: participants.length + duplicatesRemoved.length,
      after: participants.length,
      duplicatesRemoved: duplicatesRemoved.length,
      duplicates: duplicatesRemoved
    });
    console.log('[Firestore] 👥 Participants AFTER deduplication:', participants.length);
    console.log('[Firestore] 👥 Participants details AFTER:', participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      userId: p.userId,
      role: p.role,
      isOrganizer: p.isOrganizer
    })));

    // Calculer totalPaid à partir des participants
    const totalPaid = participants.reduce((sum, p) => {
      return sum + (parseFloat(p.paidAmount) || 0);
    }, 0);

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
      totalPaid: totalPaid,
      deadline: eventData.deadline || 30,
      currency: eventData.currency || 'EUR',
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName || '',
      participants: participants,
      status: eventData.status || 'open',
      createdAt: convertFirestoreDate(eventData.createdAt),
      closedAt: eventData.closedAt ? convertFirestoreDate(eventData.closedAt) : null
    };

    console.log('[Firestore] ✅✅✅ Event found and formatted:', { 
      id: event.id, 
      code: event.code, 
      title: event.title,
      participantsCount: event.participants.length
    });
    return event;
  } catch (error) {
    console.error('[Firestore] ❌ Error fetching event by code:', error);
    console.error('[Firestore] Error details:', {
      message: error.message,
      name: error.name,
      code: cleanCode
    });
    return null;
  }
}

/**
 * Crée un événement dans Firestore
 * IMPORTANT: Le code événement est lié à l'organisateur via le champ organizerId dans le document événement
 * 
 * Structure Firestore:
 * - events/{eventId} contient: code, organizerId, organizerName, ...
 * - events/{eventId}/participants/{participantId} contient l'organisateur avec role='organizer'
 * 
 * Pour retrouver l'organisateur d'un événement:
 * 1. Via le code: findEventByCode(code) -> retourne organizerId
 * 2. Via l'organisateur: getEventsByOrganizer(organizerId) -> retourne tous les événements
 * 
 * @param {Object} eventData - Données de l'événement { code, title, organizerId, organizerName, organizerEmail, ... }
 * @returns {Promise<Object>} { success: true, eventId: string, message: string }
 */
export async function createEvent(eventData) {
  try {
    console.log('[Firestore] 📝 Creating event:', {
      title: eventData.title,
      code: eventData.code,
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName,
      organizerEmail: eventData.organizerEmail
    });

    // Nettoyer le code de la même manière que dans findEventByCode
    // Garder uniquement les lettres majuscules
    const originalCode = eventData.code || '';
    const cleanCode = originalCode.trim().toUpperCase().replace(/[^A-Z]/g, '');
    
    console.log('[Firestore] 🔍 Code processing:', {
      original: originalCode,
      cleaned: cleanCode,
      length: cleanCode.length
    });

    if (!cleanCode || cleanCode.length < 8) {
      console.error('[Firestore] ❌ Invalid code:', { original: originalCode, cleaned: cleanCode });
      throw new Error('Le code événement doit contenir au moins 8 caractères alphabétiques');
    }

    // CONTRACT : organizerId obligatoire pour cohérence Firestore de bout en bout
    if (!eventData.organizerId || String(eventData.organizerId).trim() === '') {
      console.error('[Firestore] ❌ organizerId manquant');
      throw new Error('L\'organisateur (organizerId) est requis pour créer un événement.');
    }

    // Vérifier que le code n'existe pas déjà
    console.log('[Firestore] 🔍 Checking if code already exists:', cleanCode);
    const existingEvent = await findEventByCode(cleanCode);
    if (existingEvent) {
      console.warn('[Firestore] ⚠️ Code already exists:', cleanCode);
      throw new Error('Un événement avec ce code existe déjà');
    }
    console.log('[Firestore] ✅ Code is available:', cleanCode);

    // Créer l'événement avec le code nettoyé
    const eventsRef = collection(db, 'events');
    const eventDataToSave = {
      code: cleanCode, // Utiliser le code nettoyé
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
    };

    console.log('[Firestore] 💾 Saving event to Firestore:', {
      code: eventDataToSave.code,
      title: eventDataToSave.title,
      organizerId: eventDataToSave.organizerId
    });

    const eventDocRef = await addDoc(eventsRef, eventDataToSave);

    console.log('[Firestore] ✅ Event created with ID:', eventDocRef.id, {
      eventId: eventDocRef.id,
      code: cleanCode,
      title: eventData.title
    });

    // Ajouter l'organisateur comme participant
    // IMPORTANT: L'organisateur doit toujours être présent dans Firestore
    // Le code événement est lié à l'organisateur via organizerId dans le document événement
    if (eventData.organizerId) {
      const participantsRef = collection(db, 'events', eventDocRef.id, 'participants');
      // Utiliser l'email de l'organisateur si disponible (organizerId est généralement l'email)
      const organizerEmail = eventData.organizerId.includes('@') ? eventData.organizerId : (eventData.organizerEmail || eventData.organizerId);
      
      console.log('[Firestore] 👤 Adding organizer as participant:', {
        eventId: eventDocRef.id,
        code: cleanCode,
        organizerId: eventData.organizerId,
        organizerName: eventData.organizerName,
        organizerEmail: organizerEmail
      });
      
      await addDoc(participantsRef, {
        userId: eventData.organizerId,
        name: eventData.organizerName || 'Organisateur',
        email: organizerEmail, // Utiliser l'email de l'organisateur
        role: 'organizer',
        isOrganizer: true, // Marquer explicitement comme organisateur
        joinedAt: serverTimestamp(),
        approved: true,
        status: 'confirmed' // L'organisateur est automatiquement confirmé
      });
      
      console.log('[Firestore] ✅ Organizer added as participant in Firestore:', {
        eventId: eventDocRef.id,
        code: cleanCode,
        organizerId: eventData.organizerId,
        path: `events/${eventDocRef.id}/participants`
      });
    } else {
      console.warn('[Firestore] ⚠️ No organizerId provided, organizer will not be added as participant');
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
 * Crée une notification pour un utilisateur
 * @param {string} userId - ID de l'utilisateur destinataire
 * @param {Object} notificationData - Données de la notification { type, title, message, eventId, relatedId }
 * @returns {Promise<string>} ID de la notification créée
 */
export async function createNotification(userId, notificationData) {
  try {
    console.log('[Firestore] Creating notification:', { userId, notificationData });

    if (!userId) {
      console.warn('[Firestore] ⚠️ Cannot create notification: userId is missing');
      return null;
    }

    const notificationsRef = collection(db, 'notifications');
    const notificationDocRef = await addDoc(notificationsRef, {
      userId,
      type: notificationData.type || 'info',
      title: notificationData.title || '',
      message: notificationData.message || '',
      eventId: notificationData.eventId || null,
      relatedId: notificationData.relatedId || null,
      read: false,
      createdAt: serverTimestamp()
    });

    console.log('[Firestore] ✅ Notification created:', notificationDocRef.id, {
      userId,
      type: notificationData.type,
      title: notificationData.title
    });

    return notificationDocRef.id;
  } catch (error) {
    console.error('[Firestore] ❌ Error creating notification:', error);
    // Ne pas faire échouer la création de la demande si la notification échoue
    return null;
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
    console.log('[Firestore] 📝 Creating join request:', { eventId, participantData });

    // Vérifier que l'événement existe
    console.log('[Firestore] 🔍 Verifying event exists:', eventId);
    const eventDocRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventDocRef);
    
    if (!eventDoc.exists()) {
      console.error('[Firestore] ❌ Event not found in Firestore:', eventId);
      console.error('[Firestore] 💡 This might happen if:');
      console.error('[Firestore] 💡 1. The event was created locally but not synced to Firestore');
      console.error('[Firestore] 💡 2. The eventId is incorrect (e.g., temp-XXX instead of real Firestore ID)');
      console.error('[Firestore] 💡 3. The event was deleted');
      
      // Si l'ID commence par "temp-", essayer de trouver l'événement par code
      if (eventId.startsWith('temp-')) {
        const code = eventId.replace('temp-', '');
        console.log('[Firestore] 🔍 Trying to find event by code:', code);
        const foundEvent = await findEventByCode(code);
        if (foundEvent) {
          console.log('[Firestore] ✅ Event found by code, using real eventId:', foundEvent.id);
          // Utiliser le vrai ID Firestore
          return createJoinRequest(foundEvent.id, participantData);
        }
      }
      
      throw new Error(`L'événement n'existe pas dans Firestore (ID: ${eventId}). Vérifiez le code ou contactez l'organisateur.`);
    }

    const eventData = eventDoc.data();
    console.log('[Firestore] 📋 Event data retrieved:', {
      eventId,
      title: eventData.title,
      organizerId: eventData.organizerId,
      organizerName: eventData.organizerName
    });

    // ✅ Normaliser userId et email en lowercase pour éviter les problèmes de casse
    // (fait une seule fois au début pour éviter les redéclarations)
    const normalizedUserId = (participantData.userId || participantData.email || '').trim().toLowerCase();
    const normalizedEmail = (participantData.email || '').trim().toLowerCase();
    
    if (!normalizedUserId) {
      throw new Error("Impossible de créer la demande : userId ou email manquant.");
    }
    
    // Vérifier si l'utilisateur n'a pas déjà une demande en attente
    const joinRequestsRef = collection(db, 'events', eventId, 'joinRequests');
    const existingQuery = query(
      joinRequestsRef,
      where('userId', '==', normalizedUserId),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      console.warn('[Firestore] ⚠️ Duplicate join request detected');
      throw new Error('Vous avez déjà une demande en attente pour cet événement');
    }

    // Créer la demande de participation
    const requestData = {
      userId: normalizedUserId,
      email: normalizedEmail,
      name: (participantData.name || participantData.pseudo || '').trim(),
      status: 'pending',
      requestedAt: serverTimestamp(),
      approvedAt: null
    };
    
    console.log('[Firestore] 📝 Creating join request with data:', {
      eventId,
      requestData,
      collectionPath: `events/${eventId}/joinRequests`
    });
    
    const requestDocRef = await addDoc(joinRequestsRef, requestData);

    console.log('[Firestore] ✅ Join request created successfully:', {
      requestId: requestDocRef.id,
      eventId,
      participantName: requestData.name,
      participantEmail: requestData.email,
      status: requestData.status,
      fullPath: `events/${eventId}/joinRequests/${requestDocRef.id}`
    });
    
    // Vérifier immédiatement que la demande existe
    const verifyDoc = await getDoc(requestDocRef);
    if (verifyDoc.exists()) {
      console.log('[Firestore] ✅ Verification: Request exists in Firestore:', {
        requestId: requestDocRef.id,
        data: verifyDoc.data()
      });
    } else {
      console.error('[Firestore] ❌ Verification failed: Request does not exist in Firestore!');
    }

    // Créer une notification pour l'organisateur
    const organizerId = eventData.organizerId;
    if (organizerId) {
      console.log('[Firestore] 🔔 Creating notification for organizer:', organizerId);
      
      const notificationId = await createNotification(organizerId, {
        type: 'join_request',
        title: 'Nouvelle demande de participation',
        message: `${participantData.name || participantData.pseudo} souhaite rejoindre "${eventData.title}"`,
        eventId: eventId,
        relatedId: requestDocRef.id
      });

      if (notificationId) {
        console.log('[Firestore] ✅ Notification sent to organizer:', {
          organizerId,
          notificationId,
          eventTitle: eventData.title,
          participantName: participantData.name || participantData.pseudo
        });
      } else {
        console.warn('[Firestore] ⚠️ Failed to create notification for organizer:', organizerId);
      }
    } else {
      console.warn('[Firestore] ⚠️ No organizerId found in event data, cannot send notification');
    }

    // ✅ Inscrire immédiatement le participant sur la liste de l'événement (status pending)
    // pour qu'il apparaisse dans la liste dès l'inscription nom/email, avant acceptation organisateur
    const participantId = normalizedEmail;
    const participantRef = doc(db, 'events', eventId, 'participants', participantId);
    const participantPayload = {
      userId: normalizedUserId,
      email: normalizedEmail,
      name: (participantData.name || participantData.pseudo || '').trim() || 'Participant',
      role: 'participant',
      status: 'pending',
      joinedAt: serverTimestamp(),
      approved: false,
      fromRequestId: requestDocRef.id
    };
    await setDoc(participantRef, participantPayload, { merge: true });
    console.log('[Firestore] ✅ Participant added to event list (pending):', {
      eventId,
      participantId,
      path: `events/${eventId}/participants/${participantId}`
    });

    return {
      success: true,
      requestId: requestDocRef.id,
      message: 'Demande de participation créée avec succès'
    };
  } catch (error) {
    console.error('[Firestore] ❌ Error creating join request:', error);
    throw error;
  }
}

/**
 * Écoute en temps réel la demande de participation de l'utilisateur pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {string} userKey - Email ou userId de l'utilisateur
 * @param {Function} onChange - Callback appelé avec la demande (ou null si aucune)
 * @returns {Function} Fonction pour désabonner le listener
 */
export function listenMyJoinRequest(eventId, userKey, onChange) {
  if (!eventId || !userKey) {
    console.warn('[Firestore] ⚠️ listenMyJoinRequest: eventId or userKey missing');
    return () => {};
  }

  console.log('[Firestore] 👂 Listening to join request:', { eventId, userKey });

  const joinRequestsRef = collection(db, 'events', eventId, 'joinRequests');
  const q = query(joinRequestsRef, where('userId', '==', userKey));

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        console.log('[Firestore] 👂 No join request found for user:', userKey);
        onChange(null);
        return;
      }

      // S'il y en a plusieurs, prends la plus récente
      const docs = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          requestedAt: convertFirestoreDate(d.data().requestedAt),
          approvedAt: d.data().approvedAt ? convertFirestoreDate(d.data().approvedAt) : null
        }))
        .sort((a, b) => {
          const aTime = a.requestedAt?.getTime?.() || 0;
          const bTime = b.requestedAt?.getTime?.() || 0;
          return bTime - aTime;
        });

      const latestRequest = docs[0];
      console.log('[Firestore] 👂 Join request updated:', {
        requestId: latestRequest.id,
        status: latestRequest.status,
        userId: latestRequest.userId
      });

      onChange(latestRequest);
    },
    (error) => {
      console.error('[Firestore] ❌ Error listening to join request:', error);
      onChange(null);
    }
  );

  return unsubscribe;
}

/**
 * Récupère les notifications pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {boolean} unreadOnly - Si true, retourne uniquement les notifications non lues
 * @returns {Promise<Array>} Liste des notifications
 */
export async function getNotifications(userId, unreadOnly = false) {
  try {
    console.log('[Firestore] 🔔 Fetching notifications for user:', { userId, unreadOnly });
    
    if (!userId) {
      console.warn('[Firestore] ⚠️ Cannot fetch notifications: userId is missing');
      return [];
    }

    const notificationsRef = collection(db, 'notifications');
    let q = query(notificationsRef, where('userId', '==', userId));
    
    if (unreadOnly) {
      q = query(notificationsRef, where('userId', '==', userId), where('read', '==', false));
    }
    
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertFirestoreDate(doc.data().createdAt)
    }));

    // Trier par date de création (plus récentes en premier)
    notifications.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0;
      const dateB = b.createdAt?.getTime() || 0;
      return dateB - dateA;
    });

    console.log('[Firestore] ✅ Notifications fetched:', {
      userId,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });

    return notifications;
  } catch (error) {
    console.error('[Firestore] ❌ Error fetching notifications:', error);
    return [];
  }
}

/**
 * Marque une notification comme lue
 * @param {string} notificationId - ID de la notification
 * @returns {Promise<void>}
 */
export async function markNotificationAsRead(notificationId) {
  try {
    console.log('[Firestore] 📖 Marking notification as read:', notificationId);
    
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });

    console.log('[Firestore] ✅ Notification marked as read:', notificationId);
  } catch (error) {
    console.error('[Firestore] ❌ Error marking notification as read:', error);
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
    console.log('[Firestore] 🔍 ===== FETCHING JOIN REQUESTS =====');
    console.log('[Firestore] 🔍 Parameters:', { eventId, status });
    console.log('[Firestore] 🔍 Collection path: events/' + eventId + '/joinRequests');
    
    if (!eventId) {
      console.error('[Firestore] ❌ eventId is missing!');
      return [];
    }
    
    const joinRequestsRef = collection(db, 'events', eventId, 'joinRequests');
    let q = query(joinRequestsRef);
    
    if (status) {
      q = query(joinRequestsRef, where('status', '==', status));
      console.log('[Firestore] 🔍 Filtering by status:', status);
    } else {
      console.log('[Firestore] 🔍 No status filter, fetching all requests');
    }
    
    console.log('[Firestore] 📡 Executing Firestore query...');
    const snapshot = await getDocs(q);
    
    console.log('[Firestore] 📊 Query result:', {
      empty: snapshot.empty,
      size: snapshot.size,
      eventId,
      status,
      collectionPath: `events/${eventId}/joinRequests`
    });
    
    if (!snapshot.empty) {
      console.log('[Firestore] 📋 Raw documents:', snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));
    }
    
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: convertFirestoreDate(doc.data().requestedAt),
      approvedAt: doc.data().approvedAt ? convertFirestoreDate(doc.data().approvedAt) : null
    }));

    console.log('[Firestore] ✅ ===== JOIN REQUESTS FETCHED =====');
    console.log('[Firestore] ✅ Count:', requests.length);
    console.log('[Firestore] ✅ Requests details:', requests.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      status: r.status,
      userId: r.userId,
      requestedAt: r.requestedAt
    })));
    
    if (requests.length === 0) {
      console.log('[Firestore] ⚠️ No requests found. Possible reasons:');
      console.log('[Firestore] ⚠️ 1. No requests have been created yet');
      console.log('[Firestore] ⚠️ 2. All requests have been processed');
      console.log('[Firestore] ⚠️ 3. Requests exist but with different status');
      console.log('[Firestore] ⚠️ 4. Wrong eventId used');
      console.log('[Firestore] ⚠️ 5. Firestore rules blocking access');
    }
    
    return requests;
  } catch (error) {
    console.error('[Firestore] ❌ ===== ERROR FETCHING JOIN REQUESTS =====');
    console.error('[Firestore] ❌ Error details:', {
      message: error.message,
      code: error.code,
      eventId,
      status
    });
    throw error;
  }
}

/**
 * Vérifie si un participant a accès à un événement
 * Un accès est accordé si un document existe dans:
 *   events/{eventId}/participants/{emailLowerCase}
 */
export async function checkParticipantAccess(eventId, email) {
  try {
    if (!eventId || !email) {
      return false;
    }

    const participantId = email.trim().toLowerCase();
    const participantRef = doc(db, 'events', eventId, 'participants', participantId);

    const snap = await getDoc(participantRef);
    return snap.exists();
  } catch (error) {
    console.error('[Firestore] ❌ Error checking participant access:', error);
    return false;
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
    // Comparaison insensible à la casse pour l'organizerId
    const eventOrganizerId = eventData.organizerId?.toLowerCase() || '';
    const providedOrganizerId = organizerId?.toLowerCase() || '';
    
    if (eventOrganizerId !== providedOrganizerId) {
      console.error('[Firestore] Organizer ID mismatch:', {
        eventOrganizerId,
        providedOrganizerId,
        eventData: eventData.organizerId,
        provided: organizerId
      });
      throw new Error("Seul l'organisateur peut approuver ou refuser les demandes");
    }
    
    console.log('[Firestore] ✅ Organizer verified:', {
      eventOrganizerId,
      providedOrganizerId
    });

    // Mettre à jour la demande
    const requestDocRef = doc(db, 'events', eventId, 'joinRequests', requestId);
    console.log('[Firestore] 🔍 Checking join request:', {
      eventId,
      requestId,
      path: `events/${eventId}/joinRequests/${requestId}`
    });
    
    const requestDoc = await getDoc(requestDocRef);
    
    if (!requestDoc.exists()) {
      console.error('[Firestore] ❌ Join request not found:', {
        eventId,
        requestId,
        path: `events/${eventId}/joinRequests/${requestId}`
      });
      throw new Error(`La demande n'existe pas (ID: ${requestId})`);
    }

    const requestData = requestDoc.data();
    console.log('[Firestore] 📋 Join request data:', {
      id: requestDoc.id,
      userId: requestData.userId,
      name: requestData.name,
      email: requestData.email,
      status: requestData.status
    });

    // ✅ Cas APPROVE : batch atomique (joinRequest + participant)
    if (action === 'approve') {
      console.log('[Firestore] 📋 Request data for approval:', {
        email: requestData.email,
        userId: requestData.userId,
        name: requestData.name,
        status: requestData.status
      });
      
      const participantEmail = (requestData.email || requestData.userId || '').trim().toLowerCase();

      if (!participantEmail) {
        console.error('[Firestore] ❌ Missing email/userId in request:', requestData);
        throw new Error("Impossible d'approuver : email/userId participant manquant dans la demande.");
      }

      // ✅ Vérifier que le participant n'est pas l'organisateur
      if (participantEmail === eventOrganizerId) {
        console.error('[Firestore] ❌ Cannot approve: participant is the organizer');
        throw new Error("L'organisateur ne peut pas être ajouté comme participant.");
      }

      console.log('[Firestore] ✅ Participant email determined:', participantEmail);

      // Doc participant stable : events/{eventId}/participants/{emailLower}
      const participantDocRef = doc(db, 'events', eventId, 'participants', participantEmail);
      console.log('[Firestore] 📍 Participant doc path:', `events/${eventId}/participants/${participantEmail}`);
      
      // ✅ Vérifier si le participant existe déjà (évite les doublons)
      const existingParticipantDoc = await getDoc(participantDocRef);
      if (existingParticipantDoc.exists()) {
        const existingData = existingParticipantDoc.data();
        console.log('[Firestore] ⚠️ Participant already exists, updating instead of creating:', {
          participantEmail,
          existingStatus: existingData.status
        });
        // Le participant existe déjà, on met juste à jour la demande
        // Le participant reste dans la liste (pas de doublon créé)
      }

      const batch = writeBatch(db);

      // 1) Mettre à jour la demande
      batch.update(requestDocRef, {
        status: 'confirmed',
        approvedAt: serverTimestamp()
      });
      console.log('[Firestore] ✅ Batch: joinRequest update queued (status: confirmed)');

      // 2) Créer / fusionner le participant
      const participantData = {
        userId: participantEmail,
        email: participantEmail,
        name: requestData.name || 'Participant',
        role: 'participant',
        joinedAt: serverTimestamp(),
        approved: true,
        status: 'confirmed',
        fromRequestId: requestId
      };
      
      batch.set(participantDocRef, participantData, { merge: true });
      console.log('[Firestore] ✅ Batch: participant set queued with data:', participantData);

      console.log('[Firestore] 🚀 Committing batch...');
      await batch.commit();
      console.log('[Firestore] ✅✅✅ Batch committed successfully ✅✅✅');

      // Vérifier que le participant existe bien
      const verifyDoc = await getDoc(participantDocRef);
      if (verifyDoc.exists()) {
        console.log('[Firestore] ✅✅✅ Verification: Participant exists in Firestore:', {
          id: verifyDoc.id,
          data: verifyDoc.data()
        });
      } else {
        console.error('[Firestore] ❌❌❌ Verification FAILED: Participant does NOT exist after commit!');
      }

      return {
        success: true,
        message: 'Demande approuvée + participant ajouté'
      };
    }

    // ❌ Cas REJECT : mettre à jour la demande et retirer le participant de la liste s'il y a été ajouté (status pending)
    const participantEmail = (requestData.email || requestData.userId || '').trim().toLowerCase();
    if (participantEmail) {
      const participantDocRef = doc(db, 'events', eventId, 'participants', participantEmail);
      const participantSnap = await getDoc(participantDocRef);
      if (participantSnap.exists() && participantSnap.data().status === 'pending') {
        await deleteDoc(participantDocRef);
        console.log('[Firestore] Participant removed from list after reject:', participantEmail);
      }
    }
    await updateDoc(requestDocRef, {
      status: 'rejected',
      approvedAt: null
    });

    return {
      success: true,
      message: 'Demande refusée'
    };
  } catch (error) {
    console.error('[Firestore] Error updating join request:', error);
    throw error;
  }
}

/**
 * Récupère tous les événements d'un organisateur depuis Firestore
 * @param {string} organizerId - ID de l'organisateur
 * @returns {Promise<Array>} Liste des événements
 */
export async function getEventsByOrganizer(organizerId) {
  try {
    console.log('[Firestore] 🔍 Getting events for organizer:', organizerId);
    
    if (!organizerId) {
      console.warn('[Firestore] ⚠️ No organizerId provided');
      return [];
    }
    
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('organizerId', '==', organizerId));
    const querySnapshot = await getDocs(q);
    
    console.log('[Firestore] 📊 Found', querySnapshot.size, 'events for organizer');
    
    const events = [];
    for (const docSnap of querySnapshot.docs) {
      const eventData = docSnap.data();
      
      // Récupérer les participants depuis Firestore
      const participantsRef = collection(db, 'events', docSnap.id, 'participants');
      const participantsSnapshot = await getDocs(participantsRef);
      let participants = participantsSnapshot.docs.map(pDoc => ({
        id: pDoc.id,
        ...pDoc.data(),
        joinedAt: convertFirestoreDate(pDoc.data().joinedAt)
      }));
      
      // ✅ DÉDUPLICATION : Supprimer les doublons de participants
      const seenParticipants = new Map();
      participants = participants.filter(p => {
        const key = (p.email || p.userId || p.id || '').toLowerCase().trim();
        if (!key) return true;
        
        if (seenParticipants.has(key)) {
          console.warn('[Firestore] ⚠️ Duplicate participant detected and removed:', {
            key,
            name: p.name,
            email: p.email,
            userId: p.userId
          });
          return false;
        }
        seenParticipants.set(key, p);
        return true;
      });
      
      // ✅ Vérifier si l'organisateur est dans la liste (sans créer de doublon)
      const organizerExists = participants.some(p => {
        const pKey = (p.email || p.userId || '').toLowerCase().trim();
        const orgKey = (eventData.organizerId || '').toLowerCase().trim();
        return pKey === orgKey || p.role === 'organizer' || p.isOrganizer === true;
      });
      
      // ✅ NE PAS ajouter l'organisateur s'il existe déjà (évite les doublons)
      // L'organisateur doit être créé lors de la création de l'événement, pas après
      if (!organizerExists && eventData.organizerId && eventData.organizerName) {
        console.warn('[Firestore] ⚠️ Organizer not found in participants (should have been created during event creation):', {
          eventId: docSnap.id,
          organizerId: eventData.organizerId
        });
        // Ne pas ajouter automatiquement pour éviter les doublons
        // L'organisateur doit être créé lors de createEvent
      }
      
      // Calculer totalPaid à partir des participants
      const totalPaid = participants.reduce((sum, p) => {
        return sum + (parseFloat(p.paidAmount) || 0);
      }, 0);

      events.push({
        id: docSnap.id,
        firestoreId: docSnap.id,
        code: eventData.code,
        title: eventData.title,
        description: eventData.description || '',
        location: eventData.location || null,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        amount: (eventData.targetAmountPerPerson || 0) * (eventData.participantsTarget || 1),
        totalPaid: totalPaid,
        deadline: eventData.deadline || 30,
        currency: eventData.currency || 'EUR',
        organizerId: eventData.organizerId,
        organizerName: eventData.organizerName || '',
        status: eventData.status === 'open' ? 'active' : (eventData.status || 'active'),
        createdAt: eventData.createdAt?.toDate() || new Date(),
        participants: participants
      });
    }
    
    console.log('[Firestore] ✅ Events loaded:', events.map(e => ({ id: e.id, code: e.code, title: e.title })));
    return events;
  } catch (error) {
    console.error('[Firestore] ❌ Error getting events by organizer:', error);
    return [];
  }
}

/**
 * Supprime les doublons de participants dans Firestore pour un événement
 * @param {string} eventCode - Code de l'événement
 * @returns {Promise<Object>} Résultat avec le nombre de doublons supprimés
 */
export async function removeDuplicateParticipants(eventCode) {
  try {
    console.log('[Firestore] 🧹 Removing duplicate participants for event:', eventCode);
    
    // Trouver l'événement par code
    const event = await findEventByCode(eventCode);
    if (!event || !event.id) {
      throw new Error(`Événement non trouvé avec le code: ${eventCode}`);
    }
    
    const eventId = event.id;
    console.log('[Firestore] 📋 Event found:', { eventId, title: event.title });
    
    // Récupérer tous les participants depuis Firestore
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const participantsSnapshot = await getDocs(participantsRef);
    const allParticipants = participantsSnapshot.docs.map(pDoc => ({
      id: pDoc.id,
      docRef: pDoc.ref,
      ...pDoc.data()
    }));
    
    console.log('[Firestore] 👥 Total participants found:', allParticipants.length);
    console.log('[Firestore] 👥 Participants details:', JSON.stringify(allParticipants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      userId: p.userId,
      role: p.role,
      isOrganizer: p.isOrganizer
    })), null, 2));
    
    // Identifier les doublons avec la même logique améliorée
    const seenByEmail = new Map();
    const seenByUserId = new Map();
    const seenById = new Map(); // Par ID de document Firestore
    const duplicatesToDelete = [];
    const participantsToKeep = [];
    
    allParticipants.forEach(p => {
      const emailKey = (p.email || '').toLowerCase().trim();
      const userIdKey = (p.userId || '').toLowerCase().trim();
      const docId = (p.id || '').toLowerCase().trim();
      
      let isDuplicate = false;
      let reason = '';
      
      // ✅ Vérifier d'abord par ID de document
      if (docId && seenById.has(docId)) {
        isDuplicate = true;
        reason = `docId: ${docId}`;
      }
      
      // Vérifier par email
      if (!isDuplicate && emailKey && seenByEmail.has(emailKey)) {
        isDuplicate = true;
        reason = `email: ${emailKey}`;
      }
      
      // Vérifier par userId
      if (!isDuplicate && userIdKey && seenByUserId.has(userIdKey)) {
        isDuplicate = true;
        reason = `userId: ${userIdKey}`;
      }
      
      // ✅ Cas spécial : si email === userId
      if (!isDuplicate && emailKey && userIdKey && emailKey === userIdKey) {
        if (seenByEmail.has(emailKey) || seenByUserId.has(userIdKey)) {
          isDuplicate = true;
          reason = `email=userId: ${emailKey}`;
        }
      }
      
      if (isDuplicate) {
        duplicatesToDelete.push({ participant: p, reason });
        console.warn('[Firestore] ⚠️⚠️⚠️ DUPLICATE TO DELETE:', {
          id: p.id,
          name: p.name,
          email: p.email,
          userId: p.userId,
          reason,
          existing: seenByEmail.get(emailKey) || seenByUserId.get(userIdKey) || seenById.get(docId)
        });
      } else {
        // Garder le premier (celui qu'on garde)
        participantsToKeep.push(p);
        if (docId) seenById.set(docId, p);
        if (emailKey) seenByEmail.set(emailKey, p);
        if (userIdKey) seenByUserId.set(userIdKey, p);
      }
    });
    
    console.log('[Firestore] 📊 Deduplication analysis:', {
      total: allParticipants.length,
      toKeep: participantsToKeep.length,
      toDelete: duplicatesToDelete.length
    });
    
    console.log('[Firestore] 📊 Duplicates to delete:', duplicatesToDelete.length);
    
    if (duplicatesToDelete.length === 0) {
      return {
        success: true,
        message: 'Aucun doublon trouvé',
        deleted: 0
      };
    }
    
    // Supprimer les doublons dans Firestore
    const batch = writeBatch(db);
    duplicatesToDelete.forEach(({ participant }) => {
      batch.delete(participant.docRef);
      console.log('[Firestore] 🗑️ Queued deletion:', participant.id);
    });
    
    await batch.commit();
    console.log('[Firestore] ✅✅✅ Duplicates deleted successfully ✅✅✅');
    console.log('[Firestore] Deleted', duplicatesToDelete.length, 'duplicate participants');
    
    return {
      success: true,
      message: `${duplicatesToDelete.length} doublon(s) supprimé(s)`,
      deleted: duplicatesToDelete.length,
      details: duplicatesToDelete.map(d => ({
        id: d.participant.id,
        name: d.participant.name,
        email: d.participant.email,
        reason: d.reason
      }))
    };
  } catch (error) {
    console.error('[Firestore] ❌ Error removing duplicates:', error);
    throw error;
  }
}

