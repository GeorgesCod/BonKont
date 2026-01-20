/**
 * Service API pour communiquer avec le backend BONKONT
 */

// URL de base de l'API backend
// Peut être configurée via la variable d'environnement VITE_API_BASE_URL
// Par défaut, utilise l'URL de production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://bonkont-api.web.app/api';

// Log de l'URL utilisée (en développement seulement)
if (import.meta.env.DEV) {
  console.log('[API] Base URL configured:', API_BASE_URL);
  console.log('[API] Environment variable VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'not set (using default)');
}

/**
 * Cherche un événement par son code
 * @param {string} code - Code de l'événement (8 caractères)
 * @returns {Promise<Object|null>} L'événement trouvé ou null
 */
export async function findEventByCode(code) {
  if (!code || !code.trim()) {
    return null;
  }

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (cleanCode.length < 4) {
    console.warn('[API] Code trop court:', cleanCode);
    return null;
  }

  try {
    console.log('[API] Searching event by code:', cleanCode);
    console.log('[API] Using API URL:', `${API_BASE_URL}/events/code/${cleanCode}`);
    
    const response = await fetch(`${API_BASE_URL}/events/code/${cleanCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[API] Event not found for code:', cleanCode);
        return null;
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[API] HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const event = await response.json();
    console.log('[API] Event found:', { id: event.id, code: event.code, title: event.title });
    return event;
  } catch (error) {
    console.error('[API] Error fetching event by code:', error);
    console.error('[API] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Si c'est une erreur réseau (CORS, connexion refusée, etc.)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
      console.warn('[API] ⚠️ Network error - API backend may not be available or CORS issue');
      console.warn('[API] This is normal if the backend is not yet deployed');
    }
    
    // En cas d'erreur réseau, retourner null plutôt que de planter
    return null;
  }
}

/**
 * Crée une demande de participation pour un événement
 * @param {string} eventId - ID de l'événement
 * @param {Object} participantData - Données du participant
 * @returns {Promise<Object>} La demande créée
 */
export async function createJoinRequest(eventId, participantData) {
  try {
    console.log('[API] Creating join request:', { eventId, participantData });
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(participantData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[API] Join request created:', result);
    return result;
  } catch (error) {
    console.error('[API] Error creating join request:', error);
    throw error;
  }
}

