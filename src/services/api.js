/**
 * Service API pour communiquer avec Firestore BONKONT
 * Utilise Firestore directement depuis le frontend (plan Spark gratuit)
 * 
 * NOTE: Ce service utilise maintenant firestoreService.js qui fait des appels
 * directs à Firestore au lieu de passer par Firebase Functions.
 * Cela permet de rester sur le plan Spark gratuit.
 */

// Réexporter les fonctions depuis firestoreService pour compatibilité
export {
  findEventByCode,
  createEvent,
  createJoinRequest,
  getJoinRequests,
  updateJoinRequest
} from './firestoreService';
