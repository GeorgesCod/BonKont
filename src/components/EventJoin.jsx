import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Users, Calendar, Euro, AlertCircle, CheckCircle, Loader2, Clock, ArrowRight, QrCode, X, Home } from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import { useJoinRequestsStore } from '@/store/joinRequestsStore';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { findEventByCode, createJoinRequest, checkParticipantAccess, listenMyJoinRequest } from '@/services/api';

export function EventJoin({ onAuthRequired }) {
  console.log('[EventJoin] ===== COMPONENT MOUNTED =====');
  console.log('[EventJoin] onAuthRequired prop received:', {
    exists: !!onAuthRequired,
    type: typeof onAuthRequired,
    isFunction: typeof onAuthRequired === 'function'
  });
  const { toast } = useToast();
  const events = useEventStore((state) => state.events);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const addJoinRequest = useJoinRequestsStore((state) => state.addRequest);
  const [eventCode, setEventCode] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [pendingParticipantId, setPendingParticipantId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const hasSentJoinRequestRef = useRef(false);
  const [pendingRequestId, setPendingRequestId] = useState(null);

  // Log initial des événements
  useEffect(() => {
    console.log('[EventJoin] ===== INITIAL STATE =====');
    console.log('[EventJoin] Events in store:', events.length);
    console.log('[EventJoin] Events details:', events.map(e => ({ 
      id: e.id, 
      code: e.code, 
      title: e.title 
    })));
    console.log('[EventJoin] Event codes:', events.map(e => e.code).filter(Boolean));
  }, []);

  // Vérifier l'authentification
  const [hasInitializedFields, setHasInitializedFields] = useState(false);
  const prevAuthRef = useRef(false);
  
  useEffect(() => {
    const readAuth = () => {
      const userData = localStorage.getItem('bonkont-user');
      const authenticated = !!userData;
      const wasAuthenticated = prevAuthRef.current;
      prevAuthRef.current = authenticated;
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        setCurrentUserId(null);
        if (!hasInitializedFields) {
          setPseudo('');
          setEmail('');
          setHasInitializedFields(true);
        }
        return;
      }

      try {
        const user = JSON.parse(userData);
        const userId = (user.email || user.id || '').trim() || null;
        setCurrentUserId(userId);

        // ✅ IMPORTANT : Toujours mettre à jour les champs après authentification
        // pour permettre la création automatique de la demande
        const userPseudo = user.name || user.email?.split('@')[0] || '';
        const userEmail = user.email || '';
        
        // Si les champs sont vides OU si l'utilisateur vient de s'authentifier (passage de false à true)
        const justAuthenticated = !wasAuthenticated && authenticated;
        if (!pseudo.trim() || !email.trim() || !hasInitializedFields || justAuthenticated) {
          setPseudo(userPseudo);
          setEmail(userEmail);
          setHasInitializedFields(true);
          console.log('[EventJoin] User data loaded/updated:', { 
            name: user.name, 
            email: user.email, 
            userId,
            wasInitialized: hasInitializedFields,
            justAuthenticated,
            action: justAuthenticated ? 'updated after auth' : (hasInitializedFields ? 'updated' : 'initialized')
          });
        }
      } catch (e) {
        console.error('[EventJoin] Erreur lors de la récupération de l\'utilisateur:', e);
        setIsAuthenticated(false);
        setCurrentUserId(null);
      }
    };

    readAuth();

    // Écouter les changements de localStorage (quand l'auth change dans un autre onglet)
    const onStorage = (e) => {
      if (e.key === 'bonkont-user') {
        readAuth();
      }
    };
    window.addEventListener('storage', onStorage);
    
    // ✅ Écouter aussi les changements dans le même onglet (après login dans AuthDialog)
    // Vérifier périodiquement si l'auth a changé (pour détecter le login dans le même onglet)
    const checkAuthInterval = setInterval(() => {
      const currentAuth = !!localStorage.getItem('bonkont-user');
      if (currentAuth !== prevAuthRef.current) {
        console.log('[EventJoin] 🔐 Auth state changed, reading auth and checking URL code');
        readAuth();
        
        // ✅ Si l'utilisateur vient de s'authentifier et qu'un code est dans l'URL, vérifier le code
        if (currentAuth && !prevAuthRef.current) {
          const hash = window.location.hash;
          const match = hash.match(/\/join\/([A-Z]+)/i);
          if (match) {
            const code = match[1].toUpperCase().replace(/[^A-Z]/g, '');
            console.log('[EventJoin] ✅ User just authenticated, checking code from URL:', code);
            setTimeout(() => {
              handleCodeCheck(code).catch(err => console.error('[EventJoin] Error checking code after auth:', err));
            }, 500);
          }
        }
      }
    }, 500); // Vérifier toutes les 500ms

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(checkAuthInterval);
    };
  }, [hasInitializedFields]);

  // Fonction helper pour gérer un participant confirmé
  const handleConfirmedParticipant = (foundEvent, existingParticipant, userEmail) => {
    console.log('[EventJoin] ✅ Handling confirmed participant, adding event to store and redirecting');
    
    // Ajouter l'événement au store local pour que le participant puisse y accéder
    const addEvent = useEventStore.getState().addEvent;
    const existingEvent = useEventStore.getState().events.find(e => 
      String(e.id) === String(foundEvent.id) || 
      String(e.firestoreId) === String(foundEvent.id) ||
      (e.code && foundEvent.code && e.code.toUpperCase().replace(/[^A-Z]/g, '') === foundEvent.code.toUpperCase().replace(/[^A-Z]/g, ''))
    );
    
    if (!existingEvent) {
      console.log('[EventJoin] ➕ Adding event to local store for confirmed participant');
      addEvent({
        ...foundEvent,
        firestoreId: foundEvent.id
      });
    }
    
    // Rediriger directement vers l'événement
    console.log('[EventJoin] 🔄 Redirecting to event:', foundEvent.id);
    window.location.hash = `#event/${foundEvent.id}`;
    setTimeout(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 100);
  };

  // ✅ Réinitialiser le flag de demande envoyée quand l'événement change
  useEffect(() => {
    hasSentJoinRequestRef.current = false;
  }, [event?.id]);

  // ✅ SÉCURITÉ : Vérifier si l'utilisateur est l'organisateur de l'événement
  // IMPORTANT: Ne JAMAIS utiliser l'email saisi pour déterminer un rôle
  // isOrganizer doit refléter uniquement l'utilisateur authentifié (currentUserId)
  // ✅ Ne vérifier QUE si l'utilisateur est authentifié
  useEffect(() => {
    // ✅ Ne vérifier l'organisateur QUE si l'utilisateur est authentifié
    if (!event || !currentUserId || !isAuthenticated) {
      setIsOrganizer(false);
      console.log('[EventJoin] ⏸️ Skipping organizer check:', {
        hasEvent: !!event,
        hasCurrentUserId: !!currentUserId,
        isAuthenticated,
        reason: !event ? 'No event' : !currentUserId ? 'No userId' : 'Not authenticated'
      });
      return;
    }

    const uid = currentUserId.trim().toLowerCase();

    const organizerMatch =
      (event.organizerId && event.organizerId.toLowerCase() === uid) ||
      (event.organizerEmail && event.organizerEmail.toLowerCase() === uid);

    const participantMatch = event.participants?.some((p) => {
      const pEmail = (p.email || '').toLowerCase();
      const pUserId = (p.userId || '').toLowerCase();
      const isOrgFlag = p.isOrganizer === true || p.role === 'organizer';
      return isOrgFlag && (pEmail === uid || pUserId === uid);
    });

    const isOrg = !!(organizerMatch || participantMatch);
    setIsOrganizer(isOrg);

    console.log('[EventJoin] ✅ Organizer check (AUTH ONLY):', {
      eventId: event.id,
      currentUserId,
      organizerId: event.organizerId,
      organizerMatch,
      participantMatch,
      isOrganizer: isOrg,
      note: 'isOrganizer is true ONLY if user is authenticated AND matches organizer'
    });
  }, [event, currentUserId, isAuthenticated]);

  // Vérifier si un code est dans l'URL (depuis QR code ou lien direct)
  useEffect(() => {
    console.log('[EventJoin] ===== CHECKING URL FOR CODE =====');
    const hash = window.location.hash;
    console.log('[EventJoin] Current hash:', hash);
    console.log('[EventJoin] Events available:', events.length);
    
    // Pattern 1: #/join/CODE
    let match = hash.match(/\/join\/([A-Z]+)/i);
    if (match) {
      const code = match[1].toUpperCase().replace(/[^A-Z]/g, '');
      console.log('[EventJoin] ✅ Code found in URL (pattern 1):', code);
      setEventCode(code);
      
      // ✅ Ouvrir automatiquement la boîte de dialogue d'authentification si l'utilisateur n'est pas connecté
      const userData = localStorage.getItem('bonkont-user');
      const isAuthenticated = !!userData;
      
      console.log('[EventJoin] Auth check on URL code detection:', {
        hasUserData: !!userData,
        isAuthenticated,
        onAuthRequiredExists: typeof onAuthRequired === 'function'
      });
      
      if (!isAuthenticated) {
        console.log('[EventJoin] 🔐 User not authenticated, opening auth dialog from URL');
        // Attendre un peu pour que le composant soit complètement monté
        setTimeout(() => {
          if (onAuthRequired && typeof onAuthRequired === 'function') {
            console.log('[EventJoin] ✅ Calling onAuthRequired() from URL detection');
            try {
              onAuthRequired();
              console.log('[EventJoin] ✅ Auth dialog opened successfully');
            } catch (error) {
              console.error('[EventJoin] ❌ Error opening auth dialog:', error);
            }
          } else {
            console.error('[EventJoin] ❌ onAuthRequired is not available!', {
              type: typeof onAuthRequired,
              value: onAuthRequired
            });
          }
        }, 300);
      }
      
      // Vérifier immédiatement si les événements sont déjà chargés
      if (events.length > 0) {
        console.log('[EventJoin] Events already loaded, checking code immediately');
        handleCodeCheck(code).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
      } else {
        console.log('[EventJoin] ⏳ Events not loaded yet, starting polling...');
        // Polling pour attendre que les événements soient chargés depuis localStorage
        let attempts = 0;
        const maxAttempts = 30; // Max 3 secondes (30 * 100ms)
        const pollInterval = setInterval(() => {
          attempts++;
          const currentEvents = useEventStore.getState().events;
          console.log(`[EventJoin] Polling attempt ${attempts}/${maxAttempts}, events found:`, currentEvents.length);
          
          if (currentEvents.length > 0 || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            if (currentEvents.length > 0) {
              console.log('[EventJoin] ✅ Events loaded after polling, checking code now:', code);
              console.log('[EventJoin] Available codes:', currentEvents.map(e => e.code).filter(Boolean));
              handleCodeCheck(code).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
            } else {
              console.warn('[EventJoin] ⚠️ Events still not loaded after', attempts * 100, 'ms. Searching on backend API...');
              // Si les événements ne sont pas chargés localement, chercher directement sur le backend
              handleCodeCheck(code).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
            }
          }
        }, 100);
        
        return () => clearInterval(pollInterval);
      }
      return;
    }
    
    // Pattern 2: /event/CODE (redirigé depuis App.jsx)
    match = hash.match(/\/event\/([A-Z]+)/i);
    if (match) {
      const code = match[1].toUpperCase().replace(/[^A-Z]/g, '');
      console.log('[EventJoin] ✅ Code found in URL (pattern 2), redirecting:', code);
      window.location.hash = `#/join/${code}`;
      setEventCode(code);
      if (events.length > 0) {
        handleCodeCheck(code).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
      } else {
        // Même logique de polling pour le pattern 2
        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = setInterval(() => {
          attempts++;
          const currentEvents = useEventStore.getState().events;
          if (currentEvents.length > 0 || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            if (currentEvents.length > 0) {
              handleCodeCheck(code).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
            }
          }
        }, 100);
        return () => clearInterval(pollInterval);
      }
      return;
    }
    
    console.log('[EventJoin] ❌ No code found in URL');
  }, [events.length, events]);

  // ✅ Écouter les changements de hash pour détecter les codes dans l'URL (pour les liens directs et QR codes)
  useEffect(() => {
    const checkHashForCode = () => {
      const hash = window.location.hash;
      const match = hash.match(/\/join\/([A-Z]+)/i);
      
      if (match) {
        const code = match[1].toUpperCase().replace(/[^A-Z]/g, '');
        console.log('[EventJoin] 🔄 Hash change detected, code found:', code);
        
        // Vérifier l'authentification et ouvrir la boîte de dialogue si nécessaire
        const userData = localStorage.getItem('bonkont-user');
        const isAuthenticated = !!userData;
        
        if (!isAuthenticated) {
          console.log('[EventJoin] 🔐 User not authenticated on hash change, opening auth dialog');
          setTimeout(() => {
            if (onAuthRequired && typeof onAuthRequired === 'function') {
              console.log('[EventJoin] ✅ Opening auth dialog from hash change');
              onAuthRequired();
            }
          }, 300);
        }
        
        // Vérifier le code après un délai pour permettre l'authentification
        setTimeout(() => {
          setEventCode(code);
          handleCodeCheck(code).catch(err => console.error('[EventJoin] Error checking code on hash change:', err));
        }, isAuthenticated ? 100 : 800); // Plus de temps si l'utilisateur doit s'authentifier
      }
    };
    
    // Vérifier immédiatement
    checkHashForCode();
    
    // Écouter les changements de hash
    window.addEventListener('hashchange', checkHashForCode);
    
    return () => {
      window.removeEventListener('hashchange', checkHashForCode);
    };
  }, [onAuthRequired]);

  const handleCodeCheck = async (code) => {
    console.log('[EventJoin] ===== handleCodeCheck CALLED =====');
    console.log('[EventJoin] Input code:', code);
    console.log('[EventJoin] Events in store:', events.length);
    
    if (!code || code.trim() === '') {
      console.log('[EventJoin] Empty code, clearing event');
      setEvent(null);
      return;
    }

    // Nettoyer le code : garder uniquement les lettres majuscules
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '');
    console.log('[EventJoin] Checking code:', { original: code, cleaned: cleanCode, length: cleanCode.length });
    
    // Vérifier d'abord dans les événements locaux (pour les organisateurs)
    if (events.length > 0) {
      console.log('[EventJoin] Checking local events first...');
      const foundEvent = events.find(e => {
        const eventCode = e.code?.toUpperCase()?.replace(/[^A-Z]/g, '') || '';
        const match = eventCode === cleanCode;
        return match;
      });
      
      if (foundEvent) {
        console.log('[EventJoin] ✅✅✅ EVENT FOUND in local store!', { 
          id: foundEvent.id, 
          firestoreId: foundEvent.firestoreId,
          title: foundEvent.title, 
          code: foundEvent.code,
          note: 'Will use firestoreId || id for join requests'
        });
        setEvent(foundEvent);
        
        // ✅ IMPORTANT : Réinitialiser l'état pour afficher le formulaire
        setIsLoading(false);
        setIsJoined(false);
        setPendingParticipantId(null);
        setPendingRequestId(null);
        
        // Vérifier immédiatement si l'utilisateur est déjà participant validé (SEULEMENT si authentifié)
        const userData = localStorage.getItem('bonkont-user');
        let userEmail = null;
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userEmail = user.email || null;
          } catch (e) {
            // Ignorer
          }
        }
        
        // ✅ Ne vérifier les participants que si l'utilisateur est authentifié
        if (userEmail && isAuthenticated) {
          const existingParticipant = foundEvent.participants?.find(
            p => (p.email && p.email.toLowerCase() === userEmail.toLowerCase()) ||
                 (p.userId && p.userId === userEmail)
          );
          
          if (existingParticipant) {
            console.log('[EventJoin] ✅ User is already a participant:', {
              status: existingParticipant.status,
              name: existingParticipant.name
            });
            
            if (existingParticipant.status === 'confirmed') {
              // Participant déjà validé, rediriger directement vers l'événement
              handleConfirmedParticipant(foundEvent, existingParticipant, userEmail);
              return;
            }
            // Note: Le statut "pending" sera géré par le listener joinRequests
          }
        }
        
        // Si l'utilisateur n'est pas encore participant, afficher le formulaire
        console.log('[EventJoin] ✅ Event found locally, showing form. isAuthenticated:', isAuthenticated);
        
        return;
      }
    }
    
    // Si pas trouvé localement, chercher sur le backend (API)
    console.log('[EventJoin] Event not found locally, searching on backend API...');
    setIsLoading(true);
    
    try {
      console.log('[EventJoin] 🔍 Calling findEventByCode with cleaned code:', cleanCode);
      const foundEvent = await findEventByCode(cleanCode);
      
      console.log('[EventJoin] 📊 findEventByCode result:', {
        found: !!foundEvent,
        eventId: foundEvent?.id,
        eventCode: foundEvent?.code,
        eventTitle: foundEvent?.title
      });
      
      if (foundEvent) {
        console.log('[EventJoin] ✅✅✅ EVENT FOUND on backend!', { 
          id: foundEvent.id, 
          firestoreId: foundEvent.firestoreId,
          title: foundEvent.title, 
          code: foundEvent.code,
          note: 'This id IS the Firestore ID'
        });
        // S'assurer que firestoreId est défini (id vient de Firestore)
        setEvent({
          ...foundEvent,
          firestoreId: foundEvent.firestoreId || foundEvent.id
        });
        
        // ✅ IMPORTANT : Réinitialiser l'état pour afficher le formulaire
        setIsLoading(false);
        setIsJoined(false);
        setPendingParticipantId(null);
        setPendingRequestId(null);
        
        // Vérifier immédiatement si l'utilisateur est déjà participant validé (SEULEMENT si authentifié)
        const userData = localStorage.getItem('bonkont-user');
        let userEmail = null;
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userEmail = user.email || null;
          } catch (e) {
            // Ignorer
          }
        }
        
        // ✅ Ne vérifier les participants que si l'utilisateur est authentifié
        if (userEmail && isAuthenticated) {
          const existingParticipant = foundEvent.participants?.find(
            p => (p.email && p.email.toLowerCase() === userEmail.toLowerCase()) ||
                 (p.userId && p.userId === userEmail)
          );
          
          if (existingParticipant) {
            console.log('[EventJoin] ✅ User is already a participant:', {
              status: existingParticipant.status,
              name: existingParticipant.name
            });
            
            if (existingParticipant.status === 'confirmed') {
              // Participant déjà validé, rediriger directement vers l'événement
              handleConfirmedParticipant(foundEvent, existingParticipant, userEmail);
              return;
            }
            // Note: Le statut "pending" sera géré par le listener joinRequests
          }
        }
        
        // Si l'utilisateur n'est pas encore participant, afficher le formulaire
        console.log('[EventJoin] ✅ Event found on backend, showing form. isAuthenticated:', isAuthenticated);
      } else {
        // Événement non trouvé - réessayer avec différentes variations du code
        console.log('[EventJoin] ⚠️ Event not found with code:', cleanCode);
        console.log('[EventJoin] 🔍 Trying alternative code formats...');
        
        // Essayer avec le code original (sans nettoyage)
        let alternativeCode = code.trim().toUpperCase();
        let foundEvent = null;
        
        // Essayer différentes variations
        const codeVariations = [
          alternativeCode,
          alternativeCode.replace(/[^A-Z0-9]/g, ''),
          code.trim().toUpperCase()
        ];
        
        for (const variation of codeVariations) {
          if (variation && variation.length >= 8) {
            console.log('[EventJoin] 🔍 Trying code variation:', variation);
            try {
              foundEvent = await findEventByCode(variation);
              if (foundEvent) {
                console.log('[EventJoin] ✅ Event found with variation:', variation);
                break;
              }
            } catch (err) {
              console.warn('[EventJoin] Variation failed:', variation, err);
            }
          }
        }
        
        if (foundEvent) {
          console.log('[EventJoin] ✅✅✅ EVENT FOUND with alternative code!', { 
            id: foundEvent.id, 
            title: foundEvent.title, 
            code: foundEvent.code 
          });
          setEvent(foundEvent);
          return;
        }
        
        // Si toujours pas trouvé, permettre quand même de créer une demande avec le code
        console.log('[EventJoin] ⚠️ Event still not found, allowing join request creation with code');
        console.log('[EventJoin] Code:', cleanCode);
        
        // Créer un événement "temporaire" pour permettre la création de la demande
        // Mais d'abord, essayer de trouver l'événement par code dans tous les événements
        toast({
          title: "Code non trouvé",
          description: "L'événement n'a pas été trouvé. Vérifiez le code ou contactez l'organisateur.",
          variant: "destructive",
          duration: 5000
        });
        
        // Ne pas créer d'événement temporaire, laisser l'utilisateur réessayer
        setEvent(null);
      }
    } catch (error) {
      console.error('[EventJoin] ❌ Error searching event on backend:', error);
      console.error('[EventJoin] Error details:', {
        message: error.message,
        name: error.name
      });
      
      // Même en cas d'erreur, permettre de créer une demande
      console.log('[EventJoin] ⚠️ API error, but allowing join request creation');
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '');
      const tempEvent = {
        id: `temp-${cleanCode}`,
        code: cleanCode,
        title: `Événement ${cleanCode}`,
        description: 'Événement en attente de synchronisation',
        participants: [],
        status: 'pending_sync',
        _isTemporary: true,
        _eventCode: cleanCode
      };
      setEvent(tempEvent);
      
      toast({
        title: "Code reconnu",
        description: "Vous pouvez créer une demande de participation. L'organisateur validera votre demande.",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier automatiquement le code quand il change (avec debounce)
  useEffect(() => {
    console.log('[EventJoin] eventCode changed:', eventCode, 'events.length:', events.length);
    if (eventCode && eventCode.trim() !== '' && events.length > 0) {
      console.log('[EventJoin] Setting up auto-check timer for code:', eventCode);
      const timer = setTimeout(() => {
        console.log('[EventJoin] ⏰ Auto-checking code after change (debounced):', eventCode);
        handleCodeCheck(eventCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
      }, 500); // Debounce de 500ms
      return () => {
        console.log('[EventJoin] Clearing auto-check timer');
        clearTimeout(timer);
      };
    } else if (eventCode && eventCode.trim() !== '' && events.length === 0) {
      console.warn('[EventJoin] ⚠️ Code entered but no events loaded yet:', eventCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, events.length]);

  // Réagir aux changements dans le store d'événements
  useEffect(() => {
    console.log('[EventJoin] Events in store:', events.length, 'events');
    if (events.length > 0) {
      console.log('[EventJoin] Event codes available:', events.map(e => e.code).filter(Boolean));
      console.log('[EventJoin] Event details:', events.map(e => ({ 
        id: e.id, 
        code: e.code, 
        codeUpper: e.code?.toUpperCase(), 
        title: e.title 
      })));
    }
    if (eventCode && eventCode.trim() !== '') {
      console.log('[EventJoin] Events changed, rechecking code:', eventCode);
      // Attendre un peu pour s'assurer que les événements sont bien chargés
      setTimeout(() => {
        handleCodeCheck(eventCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, events]); // Réagir aussi aux événements eux-mêmes pour détecter les changements

  // Vérifier le code au chargement si présent dans l'URL ou dans le state
  useEffect(() => {
    if (eventCode && eventCode.trim() !== '') {
      if (events.length > 0) {
        console.log('[EventJoin] Initial check for code:', eventCode, 'with', events.length, 'events available');
        handleCodeCheck(eventCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
      } else {
        console.log('[EventJoin] Waiting for events to load before checking code:', eventCode);
        // Attendre que les événements soient chargés (max 2 secondes)
        let attempts = 0;
        const maxAttempts = 20;
        const checkInterval = setInterval(() => {
          attempts++;
          const currentEvents = useEventStore.getState().events;
          console.log('[EventJoin] Polling for events, attempt', attempts, 'events found:', currentEvents.length);
          if (currentEvents.length > 0 || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (currentEvents.length > 0) {
              console.log('[EventJoin] Events loaded, checking code now:', eventCode);
              console.log('[EventJoin] Available codes:', currentEvents.map(e => e.code).filter(Boolean));
              handleCodeCheck(eventCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
            } else {
              console.warn('[EventJoin] Events still not loaded after', attempts * 100, 'ms');
              console.warn('[EventJoin] This might be a new user with no events yet');
            }
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, events.length]); // Vérifier quand le code ou les événements changent

  const handleJoin = async () => {
    console.log('[EventJoin] handleJoin called', { 
      event: event?.id, 
      isAuthenticated, 
      pseudo: pseudo.trim(),
      email 
    });

    // 🔐 SÉCURITÉ : Vérifier l'authentification OBLIGATOIRE pour tous les événements
    // L'authentification est requise pour créer une demande de participation
    if (!isAuthenticated || !currentUserId) {
      console.log('[EventJoin] ❌ User not authenticated or no currentUserId, requiring auth');
      toast({
        variant: "destructive",
        title: "Authentification requise",
        description: "Pour rejoindre cet événement, vous devez vous inscrire ou vous connecter avec votre email."
      });
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }
    
    // Vérifier que l'email saisi correspond à l'email de l'utilisateur authentifié
    const userData = localStorage.getItem('bonkont-user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userEmail = user.email || null;
        if (userEmail && email.trim().toLowerCase() !== userEmail.toLowerCase()) {
          console.log('[EventJoin] ⚠️ Email mismatch:', { entered: email, authenticated: userEmail });
          toast({
            variant: "destructive",
            title: "Email incorrect",
            description: `Vous êtes connecté avec ${userEmail}. Veuillez utiliser cet email pour rejoindre l'événement.`
          });
          setEmail(userEmail);
          return;
        }
      } catch (e) {
        console.error('[EventJoin] Error parsing user data:', e);
      }
    }

    if (!event) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: "Aucun événement trouvé avec ce code."
      });
      return;
    }

    if (!pseudo.trim()) {
      toast({
        variant: "destructive",
        title: "Pseudo requis",
        description: "Veuillez entrer un pseudo."
      });
      return;
    }

    setIsLoading(true);

    try {
      // Vérifier si l'utilisateur est déjà participant
      const existingParticipant = event.participants?.find(
        p => (p.email && email && p.email.toLowerCase() === email.toLowerCase()) ||
             (p.name && pseudo && p.name.toLowerCase() === pseudo.toLowerCase())
      );

      if (existingParticipant) {
        console.log('[EventJoin] ⚠️ User already participant:', existingParticipant);
        
        // Si le participant est déjà confirmé, rediriger directement vers l'événement
        if (existingParticipant.status === 'confirmed') {
          console.log('[EventJoin] ✅ Participant already confirmed, redirecting to event');
          handleConfirmedParticipant(event, existingParticipant, email);
          setIsLoading(false);
          return;
        }
        
        // Si en attente, afficher le message d'attente
        if (existingParticipant.status === 'pending') {
          console.log('[EventJoin] ⚠️ Participant already has pending request');
          setPendingParticipantId(existingParticipant.id);
          setIsJoined(true);
          toast({
            title: "Demande en attente",
            description: "Votre demande de participation est en attente de validation.",
            duration: 5000
          });
          setIsLoading(false);
          return;
        }
        
        toast({
          variant: "destructive",
          title: "Déjà participant",
          description: "Vous êtes déjà dans la liste des participants."
        });
        setIsLoading(false);
        return;
      }

      // Créer un nouveau participant en attente
      const newParticipantId = event.participants?.length 
        ? Math.max(...event.participants.map(p => p.id)) + 1
        : 2; // L'organisateur est #1

      // Récupérer userId depuis localStorage (peut être null si non authentifié)
      let userId = null;
      try {
        const userData = localStorage.getItem('bonkont-user');
        if (userData) {
          const parsed = JSON.parse(userData);
          userId = parsed?.email || parsed?.id || null;
        }
      } catch (e) {
        console.warn('[EventJoin] Could not parse user data:', e);
      }

      const newParticipant = {
        id: newParticipantId,
        userId: userId, // 🔐 Associer à l'utilisateur authentifié
        name: pseudo.trim(),
        email: email.trim() || '',
        hasConfirmed: false,
        hasValidatedAmount: false,
        hasValidatedDeadline: false,
        hasAcceptedCharter: false,
        status: 'pending', // ⚠️ TOUJOURS pending au départ - pas d'accès direct
        hasPaid: false,
        paidAmount: 0
      };

      console.log('[EventJoin] ✅ Creating pending participant request:', {
        eventId: event.id,
        participantId: newParticipantId,
        userId,
        name: newParticipant.name,
        email: newParticipant.email,
        status: 'pending',
        isTemporary: event._isTemporary
      });

      // Créer une demande de participation via l'API Firestore
      try {
        console.log('[EventJoin] 📝 Creating join request via API...', {
          eventId: event.id,
          eventTitle: event.title,
          organizerId: event.organizerId,
          userId: userId || email || `guest-${nanoid(8)}`,
          email: email.trim() || '',
          name: pseudo.trim()
        });
        
        console.log('[EventJoin] 🔍 ===== BEFORE CREATING JOIN REQUEST =====');
        console.log('[EventJoin] 🔍 Event details:', {
          eventId: event.id,
          eventCode: event.code,
          eventTitle: event.title,
          organizerId: event.organizerId
        });
        console.log('[EventJoin] 🔍 Participant details:', {
          userId: userId || email || `guest-${nanoid(8)}`,
          email: email.trim() || '',
          name: pseudo.trim()
        });
        
        // Vérifier que l'événement n'est pas temporaire avant de créer la join request
        if (event._isTemporary || event.id?.startsWith('temp-')) {
          console.error('[EventJoin] ❌ Cannot create join request for temporary event');
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "L'événement n'a pas été trouvé dans la base de données. Vérifiez le code ou contactez l'organisateur."
          });
          setIsLoading(false);
          return;
        }
        
        // Vérifier que l'événement a un organizerId
        if (!event.organizerId) {
          console.error('[EventJoin] ❌ Event has no organizerId');
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Les informations de l'événement sont incomplètes. Veuillez réessayer."
          });
          setIsLoading(false);
          return;
        }
        
        console.log('[EventJoin] ✅ Creating join request with valid event:', {
          eventId: event.id,
          eventCode: event.code,
          eventTitle: event.title,
          organizerId: event.organizerId
        });
        
        // LOGIQUE SELON LE GUIDE : Pour événements "open", userId = email saisi
        // Pour autres événements, userId = email authentifié (doit correspondre)
        const eventStatus = event.status || 'active';
        const isOpenEvent = eventStatus === 'open';
        
        const userData = localStorage.getItem('bonkont-user');
        let authenticatedUserEmail = null;
        
        if (userData) {
          try {
            const user = JSON.parse(userData);
            authenticatedUserEmail = user.email || null;
          } catch (e) {
            console.error('[EventJoin] Error parsing user data:', e);
          }
        }
        
        // Déterminer userId et email selon le type d'événement
        let finalUserId = null;
        let finalEmail = null;
        
        if (isOpenEvent) {
          // Pour événements "open" : userId = email saisi (peut être différent de l'email authentifié)
          finalUserId = email.trim() || null;
          finalEmail = email.trim() || null;
          console.log('[EventJoin] ✅ Open event: using entered email as userId:', finalUserId);
        } else {
          // Pour autres événements : userId = email authentifié (doit correspondre)
          if (authenticatedUserEmail) {
            finalUserId = authenticatedUserEmail;
            finalEmail = authenticatedUserEmail;
            console.log('[EventJoin] ✅ Non-open event: using authenticated email as userId:', finalUserId);
            
            // Vérifier que l'email saisi correspond à l'email authentifié
            if (email.trim().toLowerCase() !== authenticatedUserEmail.toLowerCase()) {
              console.warn('[EventJoin] ⚠️ Email mismatch, using authenticated email');
              setEmail(authenticatedUserEmail);
            }
          } else {
            // Fallback : utiliser l'email saisi
            finalUserId = email.trim() || null;
            finalEmail = email.trim() || null;
            console.log('[EventJoin] ⚠️ No authenticated user, using entered email:', finalUserId);
          }
        }
        
        if (!finalUserId || !finalEmail) {
          console.error('[EventJoin] ❌ No userId or email available');
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de créer la demande. Veuillez entrer un email valide."
          });
          setIsLoading(false);
          return;
        }
        
        // ✅ Utiliser firestoreId si disponible, sinon id (pour garantir l'ID Firestore)
        const firestoreEventId = event.firestoreId || event.id;
        
        console.log('[EventJoin] 📝 Creating join request with:', {
          eventId: firestoreEventId,
          eventIdLocal: event.id,
          firestoreId: event.firestoreId,
          userId: finalUserId,
          email: finalEmail,
          name: pseudo.trim(),
          isOpenEvent,
          eventStatus
        });
        
        // ✅ S'assurer que userId et email sont toujours en lowercase et cohérents
        const requestResult = await createJoinRequest(firestoreEventId, {
          userId: (finalUserId || '').trim().toLowerCase(), // Toujours en lowercase
          email: (finalEmail || '').trim().toLowerCase(),   // Normaliser l'email aussi
          name: pseudo.trim()
        });
        
        console.log('[EventJoin] ✅ ===== JOIN REQUEST CREATED =====');
        console.log('[EventJoin] ✅ Result:', requestResult);
        console.log('[EventJoin] ✅ Request ID:', requestResult.requestId);
        console.log('[EventJoin] ✅ Event ID used:', firestoreEventId);
        console.log('[EventJoin] ✅ The request should now be visible in EventManagement for event:', firestoreEventId);
        console.log('[EventJoin] 🔔 Notification should have been sent to organizer:', {
          organizerId: event.organizerId,
          organizerName: event.organizerName,
          eventId: event.id,
          eventTitle: event.title,
          requestId: requestResult.requestId
        });
        console.log('[EventJoin] 📍 Organizer can see the request in EventManagement page for this event');
        
        // Si l'événement est temporaire, aussi créer une demande locale (fallback)
        if (event._isTemporary) {
          console.log('[EventJoin] Event is temporary, also creating local join request');
          const requestId = addJoinRequest({
            eventCode: event.code,
            eventId: event.id,
            participant: newParticipant,
            userId: userId,
            createdAt: new Date().toISOString()
          });
          console.log('[EventJoin] Local join request created with ID:', requestId);
        }
        
        setPendingParticipantId(newParticipantId);
        setIsJoined(true);
        
        toast({
          title: "Demande envoyée !",
          description: "Votre demande de participation a été envoyée. L'organisateur la validera prochainement.",
          duration: 6000
        });
      } catch (apiError) {
        console.error('[EventJoin] ⚠️ Error creating join request via API:', apiError);
        
        // Fallback : créer une demande locale si l'API échoue
        console.log('[EventJoin] Falling back to local store');
        const requestId = addJoinRequest({
          eventCode: event.code,
          eventId: event.id,
          participant: newParticipant,
          userId: userId,
          createdAt: new Date().toISOString()
        });
        
        setPendingParticipantId(newParticipantId);
        setIsJoined(true);
        
        toast({
          title: "Demande créée (mode local) !",
          description: "Votre demande a été enregistrée localement. Elle sera synchronisée avec le serveur dès que possible.",
          duration: 6000
        });
      }

    } catch (error) {
      console.error('[EventJoin] ❌ Erreur lors de la demande de participation:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer."
      });
    } finally {
      setIsLoading(false);
    }
  };


  // ✅ NOUVEAU FLUX : Écouter les joinRequests (pas participants) pour l'état pending
  // Le statut "pending" est dans joinRequests, pas dans participants
  useEffect(() => {
    if (!event?.id) return;
    if (!isAuthenticated || !currentUserId) {
      // Si pas authentifié, réinitialiser l'état
      setIsJoined(false);
      setPendingRequestId(null);
      setPendingParticipantId(null);
      return;
    }

    // ✅ Utiliser firestoreId si disponible, sinon id (pour garantir l'ID Firestore)
    const firestoreEventId = event.firestoreId || event.id;

    console.log('[EventJoin] 👂 Setting up join request listener:', {
      eventId: firestoreEventId,
      eventIdLocal: event.id,
      firestoreId: event.firestoreId,
      currentUserId
    });

    // ✅ Normaliser currentUserId en lowercase pour la recherche
    const normalizedUserId = currentUserId.trim().toLowerCase();
    
    const unsubscribe = listenMyJoinRequest(firestoreEventId, normalizedUserId, (request) => {
      if (!request) {
        console.log('[EventJoin] 👂 No join request found');
        setIsJoined(false);
        setPendingRequestId(null);
        setPendingParticipantId(null);
        return;
      }

      console.log('[EventJoin] 👂 Join request updated:', {
        requestId: request.id,
        status: request.status,
        userId: request.userId,
        note: 'Status should be: pending | confirmed | rejected'
      });

      if (request.status === 'pending') {
        setIsJoined(true);
        setPendingRequestId(request.id);
        setPendingParticipantId(request.id); // Pour compatibilité avec l'UI existante
        return;
      }

      if (request.status === 'confirmed' || request.status === 'approved') {
        // ✅ La demande est confirmée, recharger l'événement depuis Firestore pour avoir la liste à jour
        console.log('[EventJoin] ✅ Join request confirmed, reloading event from Firestore to get updated participants list');
        
        const firestoreEventId = event.firestoreId || event.id;
        const reloadEvent = async () => {
          try {
            const { findEventByCode } = await import('@/services/api');
            const updatedEvent = await findEventByCode(event.code);
            
            if (updatedEvent) {
              console.log('[EventJoin] ✅ Event reloaded from Firestore:', {
                eventId: updatedEvent.id,
                participantsCount: updatedEvent.participants?.length || 0
              });
              
              // Mettre à jour l'événement dans le store local avec les participants à jour
              const addEvent = useEventStore.getState().addEvent;
              const existingEvent = useEventStore.getState().events.find(e => 
                String(e.id) === String(updatedEvent.id) || 
                String(e.firestoreId) === String(updatedEvent.id) ||
                (e.code && updatedEvent.code && e.code.toUpperCase().replace(/[^A-Z]/g, '') === updatedEvent.code.toUpperCase().replace(/[^A-Z]/g, ''))
              );
              
              if (existingEvent) {
                // Mettre à jour l'événement existant avec les participants à jour
                useEventStore.getState().updateEvent(existingEvent.id, {
                  participants: updatedEvent.participants || []
                });
                console.log('[EventJoin] ✅ Event updated in local store with', updatedEvent.participants?.length || 0, 'participants');
              } else {
                // Ajouter l'événement s'il n'existe pas
                addEvent({
                  ...updatedEvent,
                  firestoreId: updatedEvent.id
                });
                console.log('[EventJoin] ✅ Event added to local store');
              }
              
              // Mettre à jour l'état local de l'événement
              setEvent({
                ...updatedEvent,
                firestoreId: updatedEvent.id
              });
              
              // Vérifier si le participant existe maintenant dans la liste mise à jour
              const existingParticipant = updatedEvent.participants?.find((p) => {
                const pEmail = (p.email || '').toLowerCase();
                const pUserId = (p.userId || '').toLowerCase();
                const uidKey = currentUserId?.trim().toLowerCase();
                return pEmail === uidKey || pUserId === uidKey;
              });

              if (existingParticipant) {
                console.log('[EventJoin] ✅ Participant found in updated event, redirecting');
                handleConfirmedParticipant(updatedEvent, existingParticipant, currentUserId);
              } else {
                // Le participant n'est pas encore dans participants, attendre un peu
                console.log('[EventJoin] ⏳ Request confirmed but participant not yet in participants, waiting...');
                // Le polling existant dans le useEffect ci-dessous gérera la redirection
              }
            }
          } catch (reloadError) {
            console.error('[EventJoin] ❌ Error reloading event from Firestore:', reloadError);
            // En cas d'erreur, utiliser le polling existant
          }
        };
        
        // Recharger l'événement depuis Firestore
        reloadEvent();
        return;
      }

      if (request.status === 'rejected') {
        setIsJoined(false);
        setPendingRequestId(null);
        setPendingParticipantId(null);
        toast({
          variant: "destructive",
          title: "Demande rejetée",
          description: "Votre demande de participation a été rejetée par l'organisateur.",
        });
      }
    });

    return () => {
      console.log('[EventJoin] 👂 Cleaning up join request listener');
      unsubscribe?.();
    };
  }, [event?.id, event?.firestoreId, isAuthenticated, currentUserId, toast]);

  // ✅ Créer automatiquement la demande après login si l'événement est trouvé
  useEffect(() => {
    if (!event?.id) return;
    if (!isAuthenticated || !currentUserId) return;
    if (!email?.trim()) return; // email prérempli par auth en général
    if (!pseudo?.trim()) return; // pseudo requis

    // Condition: ne pas spammer
    if (isJoined) return; // déjà pending côté UI
    if (hasSentJoinRequestRef.current) return;
    
    // ✅ Ne pas créer de demande pour les événements temporaires
    if (event._isTemporary || event.id?.startsWith('temp-')) {
      console.log('[EventJoin] ⚠️ Skipping auto-create for temporary event');
      return;
    }

    // ✅ Utiliser firestoreId si disponible, sinon id (pour garantir l'ID Firestore)
    const firestoreEventId = event.firestoreId || event.id;
    
    console.log('[EventJoin] 📝 Auto-creating join request after login:', {
      eventId: firestoreEventId,
      eventIdLocal: event.id,
      firestoreId: event.firestoreId,
      currentUserId,
      email: email.trim(),
      pseudo: pseudo.trim()
    });

    hasSentJoinRequestRef.current = true;

    // ✅ S'assurer que userId est toujours currentUserId.toLowerCase() quand authentifié
    createJoinRequest(firestoreEventId, {
      userId: currentUserId.toLowerCase().trim(), // Toujours en lowercase
      email: email.trim().toLowerCase(), // Normaliser l'email aussi
      name: pseudo.trim(),
      pseudo: pseudo.trim()
    })
      .then((result) => {
        console.log('[EventJoin] ✅ Join request created automatically:', result);
        // L'état pending sera mis à jour par l'écoute joinRequests ci-dessus
      })
      .catch((e) => {
        console.error('[EventJoin] ❌ Error auto-creating join request:', e);
        hasSentJoinRequestRef.current = false;
        // Si déjà pending -> message ok, sinon erreur
        if (e.message?.includes('déjà une demande')) {
          toast({
            title: "Info",
            description: "Vous avez déjà une demande en attente pour cet événement.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: e.message || "Impossible de créer la demande automatiquement.",
          });
        }
      });
  }, [event?.id, event?.firestoreId, event?._isTemporary, isAuthenticated, currentUserId, email, pseudo, isJoined, toast]);

  // 🔄 Vérification automatique d'accès : dès que l'organisateur accepte,
  // le participant est créé dans events/{eventId}/participants/{emailLower}
  // → on redirige automatiquement vers l'événement.
  // ✅ IMPORTANT : Ce useEffect doit être appelé TOUJOURS (pas conditionnellement)
  // pour respecter les règles des Hooks React
  useEffect(() => {
    // Ne démarrer la vérification que si on est en état "en attente" (isJoined && event)
    if (!isJoined || !event) {
      return;
    }

    let intervalId;
    let cancelled = false;

    const startAccessCheck = () => {
      if (!event?.id) return;

      // Email prioritaire : email saisi, sinon identifiant courant
      const baseEmail = (email || currentUserId || '').trim();
      if (!baseEmail) return;

      console.log('[EventJoin] 🔄 Starting auto access check for participant:', {
        eventId: event.id,
        email: baseEmail
      });

      intervalId = setInterval(async () => {
        if (cancelled) return;

        try {
          const allowed = await checkParticipantAccess(event.id, baseEmail);
          console.log('[EventJoin] 🔎 checkParticipantAccess result:', {
            eventId: event.id,
            email: baseEmail,
            allowed
          });

          if (allowed) {
            console.log('[EventJoin] ✅ Participant access granted, redirecting to event');
            clearInterval(intervalId);

            toast({
              title: '🎉 Accès accordé',
              description: `Votre participation à "${event.title}" a été validée.`
            });

            // Réinitialiser l'écran "en attente"
            setIsJoined(false);
            setPendingParticipantId(null);

            // Rediriger vers l'événement
            window.location.hash = `#event/${event.id}`;
            setTimeout(() => {
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }, 100);
          }
        } catch (err) {
          console.error('[EventJoin] ❌ Error during access check:', err);
        }
      }, 5000); // vérification toutes les 5s
    };

    // Démarrer la vérification
    startAccessCheck();

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isJoined, event?.id, email, currentUserId, toast]);

  if (isJoined && event) {
    // ✅ Le statut "pending" vient maintenant de joinRequests, pas de participants
    // On utilise pendingRequestId pour savoir qu'on a une demande en attente
    const status = 'pending'; // Si isJoined est true, c'est qu'on a une demande pending
    
    return (
      <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0">
        <Card className="p-6 neon-border">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className={`rounded-full p-4 ${
                status === 'confirmed' ? 'bg-green-500/10' : 
                status === 'rejected' ? 'bg-red-500/10' : 
                'bg-yellow-500/10'
              }`}>
                {status === 'confirmed' ? (
                  <CheckCircle className="w-12 h-12 text-green-500" />
                ) : status === 'rejected' ? (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                ) : (
                  <Clock className="w-12 h-12 text-yellow-500" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">
                {status === 'confirmed' ? 'Votre demande de participation est validée, Bienvenue !' : 
                 status === 'rejected' ? 'Demande rejetée' : 
                 'Demande envoyée !'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {status === 'confirmed' ? (
                  <>Vous êtes maintenant membre de "{event.title}".</>
                ) : status === 'rejected' ? (
                  <>Votre demande de participation à "{event.title}" a été rejetée par l'organisateur.</>
                ) : (
                  <>Votre demande de participation à "{event.title}" est en attente de validation.</>
                )}
              </p>
            </div>
            <Alert variant={status === 'rejected' ? 'destructive' : status === 'confirmed' ? 'default' : undefined}>
              {status === 'confirmed' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
              <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription>
                {status === 'confirmed' ? (
                  <>Vous pouvez maintenant accéder à l'événement et participer aux transactions.</>
                ) : status === 'rejected' ? (
                  <>Vous pouvez contacter l'organisateur si vous pensez qu'il s'agit d'une erreur.</>
                ) : (
                  <>L'organisateur recevra une notification et validera votre participation. 
                  Vous serez informé(e) une fois votre demande acceptée.</>
                )}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 justify-center">
              {status === 'confirmed' && (
                <Button
                  onClick={() => {
                    window.location.hash = `#event/${event.id}`;
                    setTimeout(() => {
                      window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }, 100);
                  }}
                  className="gap-2 button-glow"
                >
                  <ArrowRight className="w-4 h-4" />
                  Accéder à l'événement
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setIsJoined(false);
                  setEventCode('');
                  setPseudo('');
                  setEmail('');
                  setPendingParticipantId(null);
                  window.location.hash = '';
                }}
                className="neon-border"
              >
                Retour
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const handleBackToHome = () => {
    console.log('[EventJoin] Back to home clicked');
    window.location.hash = '';
    // Forcer le re-render
    setTimeout(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, 50);
  };

  // ✅ Log de diagnostic avant le rendu
  console.log('[EventJoin] ===== FORM DISPLAY CHECK =====', { 
    hasEvent: !!event, 
    eventId: event?.id,
    eventCode: event?.code,
    eventTitle: event?.title,
    isJoined, 
    isOrganizer, 
    isAuthenticated,
    currentUserId,
    pendingRequestId,
    pendingParticipantId,
    willShowForm: !!event && !isJoined && !isOrganizer,
    reason: !event ? 'No event' : isJoined ? 'Already joined' : isOrganizer ? 'Is organizer' : 'OK to show form'
  });

  return (
    <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Rejoindre un événement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Entre le code et rejoins le groupe. Transparence obligatoire 😊
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackToHome}
          className="shrink-0 min-h-[44px] min-w-[44px] hover:bg-destructive/10 hover:text-destructive"
          title="Retour à l'accueil"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>

      <Card className="p-4 sm:p-6 neon-border space-y-4 sm:space-y-6">
        {/* 📋 Guide d'accueil pour les invités */}
        <Alert className="bg-primary/10 border-primary/20">
          <AlertCircle className="w-4 h-4 text-primary" />
          <AlertDescription className="space-y-3">
            <p className="font-semibold text-primary text-base">📋 Parcours complet : Comment rejoindre un événement</p>
            <div className="text-sm space-y-2 mt-3">
              <div className="bg-background/50 p-3 rounded-lg space-y-2">
                <p className="font-semibold text-foreground">Étape 1 : Trouver l'événement</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li><strong>Par QR code :</strong> Scannez le QR code reçu (le code est automatiquement détecté)</li>
                  <li><strong>Par code :</strong> Saisissez le code à 8 lettres majuscules (ex: AMDZQINI) et cliquez sur "Rechercher"</li>
                  <li><strong>Par lien :</strong> Si vous avez cliqué sur un lien, le code est déjà pré-rempli</li>
                </ul>
              </div>
              <div className="bg-background/50 p-3 rounded-lg space-y-2">
                <p className="font-semibold text-foreground">Étape 2 : Se connecter</p>
                <p className="text-muted-foreground ml-2">
                  ⚠️ <strong>Obligatoire :</strong> Vous devez créer un compte ou vous connecter avec votre email pour envoyer votre demande de participation.
                </p>
                {!isAuthenticated && (
                  <Button
                    onClick={() => {
                      if (onAuthRequired) {
                        onAuthRequired();
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Erreur",
                          description: "Impossible d'ouvrir le formulaire de connexion."
                        });
                      }
                    }}
                    className="w-full mt-2 button-glow"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Se connecter ou créer un compte
                  </Button>
                )}
              </div>
              <div className="bg-background/50 p-3 rounded-lg space-y-2">
                <p className="font-semibold text-foreground">Étape 3 : Remplir le formulaire</p>
                <p className="text-muted-foreground ml-2">
                  Une fois connecté(e), remplissez votre <strong>Pseudo</strong> et votre <strong>Email</strong>, puis cliquez sur "Rejoindre l'événement".
                </p>
              </div>
              <div className="bg-background/50 p-3 rounded-lg space-y-2">
                <p className="font-semibold text-foreground">Étape 4 : Attendre la validation</p>
                <p className="text-muted-foreground ml-2">
                  Votre demande sera envoyée à l'organisateur. Vous recevrez une notification une fois votre participation validée.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* 🔐 Alerte si non authentifié - Plus visible et actionnable */}
          {!isAuthenticated && (
            <Alert className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-semibold text-destructive text-base mb-2">
                    🔐 Connexion requise pour continuer
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pour rejoindre cet événement, vous devez d'abord créer un compte ou vous connecter avec votre email.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (onAuthRequired) {
                      onAuthRequired();
                    } else {
                      toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible d'ouvrir le formulaire de connexion."
                      });
                    }
                  }}
                  className="w-full sm:w-auto button-glow"
                  size="lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Se connecter ou créer un compte
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="eventCode">Code événement (8 caractères requis)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="eventCode"
                  value={eventCode}
                  onChange={(e) => {
                    // Permettre uniquement les lettres majuscules
                    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                    console.log('[EventJoin] Input onChange:', value, 'Length:', value.length);
                    setEventCode(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && eventCode.trim() !== '') {
                      console.log('[EventJoin] Enter pressed, checking code');
                      handleCodeCheck(eventCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
                    }
                  }}
                  placeholder="Ex: VKCKVSOB (8 lettres majuscules)"
                  className="pl-10 neon-border font-mono uppercase w-full text-lg tracking-wider"
                  maxLength={8}
                  minLength={8}
                  style={{ minWidth: '240px', letterSpacing: '0.1em' }}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setIsQRScannerOpen(true)}
                className="neon-border gap-2"
                title="Scanner un QR code"
              >
                <QrCode className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {
                  console.log('[EventJoin] Search button clicked, eventCode:', eventCode);
                  console.log('[EventJoin] handleCodeCheck function:', typeof handleCodeCheck);
                  if (eventCode && eventCode.trim() !== '') {
                    console.log('[EventJoin] Calling handleCodeCheck with:', eventCode);
                    handleCodeCheck(eventCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
                  } else {
                    console.log('[EventJoin] Empty code, showing toast');
                    toast({
                      variant: "destructive",
                      title: "Code requis",
                      description: "Veuillez saisir un code événement"
                    });
                  }
                }}
                disabled={!eventCode || eventCode.trim() === ''}
                className="neon-border"
              >
                Rechercher
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Le code événement contient exactement 8 lettres majuscules (A-Z uniquement). Exemple : VKCKVSOB. Saisissez le code complet ou scannez le QR code reçu.
            </p>
            {eventCode && !event && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Aucun événement trouvé avec ce code.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {event && !isJoined && !isOrganizer && (
            <>
              <div className="p-4 rounded-lg neon-border bg-primary/5 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date début</p>
                      <p className="text-sm font-medium">
                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Non définie'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Participants</p>
                      <p className="text-sm font-medium">
                        {event.participants?.length || 0} 
                        {event.expectedParticipants && ` / ${event.expectedParticipants}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium">
                        {event.amount?.toFixed(2) || '0.00'} {event.currency || 'EUR'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Statut</p>
                      <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                        {event.status === 'active' ? 'Actif' : event.status === 'draft' ? 'Brouillon' : event.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message si non authentifié */}
              {!isAuthenticated && (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription>
                    <p className="text-sm">
                      <strong>Vous devez vous connecter</strong> pour remplir ce formulaire et envoyer votre demande de participation.
                    </p>
                    <Button
                      onClick={() => {
                        if (onAuthRequired) {
                          onAuthRequired();
                        }
                      }}
                      className="mt-2 w-full sm:w-auto button-glow"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Se connecter maintenant
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="pseudo">Pseudo {!isAuthenticated && <span className="text-destructive">*</span>}</Label>
                    {pseudo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPseudo('');
                          console.log('[EventJoin] Pseudo cleared');
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        Effacer
                      </Button>
                    )}
                  </div>
                  <Input
                    id="pseudo"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="Votre pseudo"
                    className="neon-border"
                    required
                    disabled={!isAuthenticated}
                  />
                  {!isAuthenticated && (
                    <p className="text-xs text-muted-foreground">
                      Connectez-vous pour débloquer ce champ
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email (optionnel)</Label>
                    {email && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEmail('');
                          console.log('[EventJoin] Email cleared');
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        Effacer
                      </Button>
                    )}
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      // Quand l'utilisateur termine de saisir l'email, vérifier l'authentification
                      if (email.trim() && !isAuthenticated && email.includes('@')) {
                        console.log('[EventJoin] Email entered but user not authenticated');
                        // Ne pas ouvrir automatiquement, mais informer l'utilisateur
                        // L'authentification sera demandée lors du clic sur "Rejoindre"
                      }
                    }}
                    placeholder="votre@email.com"
                    className="neon-border"
                    disabled={!isAuthenticated}
                  />
                  {!isAuthenticated && (
                    <p className="text-xs text-muted-foreground">
                      Connectez-vous pour débloquer ce champ
                    </p>
                  )}
                </div>
              </div>

              {/* ✅ Afficher le message organisateur SEULEMENT si authentifié ET organisateur */}
              {isAuthenticated && isOrganizer ? (
                <div className="space-y-2">
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Vous êtes l'organisateur de cet événement.</strong> Vous pouvez accéder directement à la gestion.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => {
                      console.log('[EventJoin] Organizer accessing event management:', event.id);
                      window.location.hash = `#/event/${event.id}`;
                    }}
                    className="w-full gap-2 button-glow"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Gérer l'événement
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={isLoading || !pseudo.trim() || !event}
                  className="w-full gap-2 button-glow"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : !event ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Code invalide
                    </>
                  ) : !isAuthenticated ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Se connecter pour rejoindre
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {event?._isTemporary ? 'Créer une demande' : 'Rejoindre l\'événement'}
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Scanner QR Code */}
<QRCodeScanner
  isOpen={isQRScannerOpen}
  onClose={() => setIsQRScannerOpen(false)}
  onScanSuccess={(scannedCode) => {
    console.log('[EventJoin] ===== QR CODE SCANNED =====');
    console.log('[EventJoin] Scanned code:', scannedCode);
    console.log('[EventJoin] onAuthRequired prop:', typeof onAuthRequired);

    // ✅ IMPORTANT : Réinitialiser tous les états avant de traiter le nouveau code
    console.log('[EventJoin] 🔄 Resetting states before processing QR code');
    setIsJoined(false);
    setPendingParticipantId(null);
    setPendingRequestId(null);
    setEvent(null);
    setPseudo('');
    setEmail('');
    setIsLoading(false);
    hasSentJoinRequestRef.current = false;

    // Nettoyer le code : garder uniquement les lettres majuscules
    const cleanCode =
      scannedCode?.trim().toUpperCase().replace(/[^A-Z]/g, '') || '';

    console.log('[EventJoin] Cleaned scanned code:', cleanCode);

    if (cleanCode && cleanCode.length === 8) {
      setEventCode(cleanCode);

      // ✅ Ouvrir automatiquement le dialogue d'authentification si l'utilisateur n'est pas connecté
      const userData = localStorage.getItem('bonkont-user');
      const isAuthenticated = !!userData;
      
      console.log('[EventJoin] Auth check:', {
        hasUserData: !!userData,
        isAuthenticated,
        onAuthRequiredExists: typeof onAuthRequired === 'function'
      });
      
      if (!isAuthenticated) {
        console.log('[EventJoin] 🔐 User not authenticated, opening auth dialog after QR scan');
        
        // Fermer d'abord le scanner pour éviter les conflits
        setIsQRScannerOpen(false);
        
        // Attendre un peu pour que le scanner se ferme complètement
        setTimeout(() => {
          console.log('[EventJoin] 🔐 Attempting to open auth dialog...');
          
          if (onAuthRequired && typeof onAuthRequired === 'function') {
            console.log('[EventJoin] ✅ Calling onAuthRequired()');
            try {
              onAuthRequired();
              console.log('[EventJoin] ✅ onAuthRequired() called successfully');
            } catch (error) {
              console.error('[EventJoin] ❌ Error calling onAuthRequired:', error);
              toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible d\'ouvrir le formulaire de connexion. Veuillez cliquer sur "Se connecter".'
              });
            }
          } else {
            console.error('[EventJoin] ❌ onAuthRequired is not a function!', {
              type: typeof onAuthRequired,
              value: onAuthRequired
            });
            toast({
              variant: 'destructive',
              title: 'Erreur',
              description: 'Impossible d\'ouvrir le formulaire de connexion. Veuillez cliquer sur "Se connecter".'
            });
          }
          
          // Vérifier l'événement après un délai pour permettre l'authentification
          setTimeout(() => {
            console.log('[EventJoin] Calling handleCodeCheck with cleaned code:', cleanCode);
            handleCodeCheck(cleanCode).catch((err) =>
              console.error('[EventJoin] Error in handleCodeCheck:', err)
            );
          }, 500);
        }, 200);
      } else {
        // Utilisateur déjà authentifié, fermer le scanner et vérifier le code
        setIsQRScannerOpen(false);
        setTimeout(() => {
          console.log('[EventJoin] User already authenticated, calling handleCodeCheck');
          handleCodeCheck(cleanCode).catch((err) =>
            console.error('[EventJoin] Error in handleCodeCheck:', err)
          );
        }, 100);
      }
    } else {
      console.warn('[EventJoin] ❌ No valid code extracted from QR scan:', scannedCode);
      setIsQRScannerOpen(false);
      toast({
        variant: 'destructive',
        title: 'Code invalide',
        description: 'Le code doit contenir exactement 8 lettres majuscules (A-Z).',
      });
    }
  }}
/></div>
); }
