import { useState, useEffect } from 'react';
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
import { findEventByCode, createJoinRequest, checkParticipantAccess } from '@/services/api';

export function EventJoin({ onAuthRequired }) {
  console.log('[EventJoin] ===== COMPONENT MOUNTED =====');
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
  
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('bonkont-user');
      const authenticated = !!userData;
      console.log('[EventJoin] Auth check:', authenticated);
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        try {
          const user = JSON.parse(userData);
          const userId = user.email || user.id || null;
          setCurrentUserId(userId);
          
          // Pré-remplir seulement une fois au chargement initial (permet de modifier ensuite)
          if (!hasInitializedFields) {
          setPseudo(user.name || user.email?.split('@')[0] || '');
          setEmail(user.email || '');
            setHasInitializedFields(true);
            console.log('[EventJoin] User data loaded (initial):', { name: user.name, email: user.email, userId });
          }
        } catch (e) {
          console.error('[EventJoin] Erreur lors de la récupération de l\'utilisateur:', e);
        }
      } else {
        setCurrentUserId(null);
        // Si non authentifié et que c'est le chargement initial, vider les champs
        if (!hasInitializedFields) {
          setPseudo('');
          setEmail('');
          setHasInitializedFields(true);
        }
      }
    };
    
    checkAuth();
    
    // Écouter les changements d'auth (mais ne pas réinitialiser les champs)
    const interval = setInterval(() => {
      const userData = localStorage.getItem('bonkont-user');
      const authenticated = !!userData;
      setIsAuthenticated(authenticated);
      if (authenticated) {
        try {
          const user = JSON.parse(userData);
          const userId = user.email || user.id || null;
          setCurrentUserId(userId);
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      } else {
        setCurrentUserId(null);
      }
    }, 1000);
    return () => clearInterval(interval);
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

  // Vérifier si l'utilisateur est l'organisateur de l'événement
  // IMPORTANT: Utiliser l'email saisi dans le formulaire, pas seulement l'utilisateur connecté
  useEffect(() => {
    if (event) {
      // Utiliser l'email saisi dans le formulaire pour la vérification
      const emailToCheck = email.trim() || currentUserId;
      const pseudoToCheck = pseudo.trim();
      
      // Vérifier si l'email saisi correspond à l'organisateur
      const organizerMatch = emailToCheck && (
        event.organizerId === emailToCheck || 
        event.organizerId === emailToCheck?.toLowerCase() ||
        event.organizerId === emailToCheck?.toUpperCase() ||
        event.organizerName?.toLowerCase() === pseudoToCheck?.toLowerCase()
      );
      
      // Vérifier si l'utilisateur est dans la liste des participants comme organisateur
      const participantMatch = event.participants?.find(p => 
        (p.email?.toLowerCase() === emailToCheck?.toLowerCase() || 
         p.userId === emailToCheck ||
         p.name?.toLowerCase() === pseudoToCheck?.toLowerCase()) &&
        (p.isOrganizer === true || p.role === 'organizer')
      );
      
      const isOrg = organizerMatch || !!participantMatch;
      setIsOrganizer(isOrg);
      
      console.log('[EventJoin] Organizer check:', { 
        eventId: event.id, 
        organizerId: event.organizerId, 
        organizerName: event.organizerName,
        emailSaisi: emailToCheck,
        pseudoSaisi: pseudoToCheck,
        currentUserId, 
        organizerMatch, 
        participantMatch: !!participantMatch,
        isOrganizer: isOrg 
      });
    } else {
      setIsOrganizer(false);
    }
  }, [event, email, pseudo, currentUserId]);

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
          title: foundEvent.title, 
          code: foundEvent.code 
        });
        setEvent(foundEvent);
        
        // Vérifier immédiatement si l'utilisateur est déjà participant validé
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
        
        if (userEmail) {
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
            } else if (existingParticipant.status === 'pending') {
              // Participant en attente, afficher le message d'attente
              console.log('[EventJoin] ⏳ Participant has pending request');
              setPendingParticipantId(existingParticipant.id);
              setIsJoined(true);
              setPseudo(existingParticipant.name || '');
              setEmail(existingParticipant.email || userEmail);
              return;
            }
          }
        }
        
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
          title: foundEvent.title, 
          code: foundEvent.code 
        });
        setEvent(foundEvent);
        
        // Vérifier immédiatement si l'utilisateur est déjà participant validé
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
        
        if (userEmail) {
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
            } else if (existingParticipant.status === 'pending') {
              // Participant en attente, afficher le message d'attente
              console.log('[EventJoin] ⏳ Participant has pending request');
              setPendingParticipantId(existingParticipant.id);
              setIsJoined(true);
              setPseudo(existingParticipant.name || '');
              setEmail(existingParticipant.email || userEmail);
              return;
            }
          }
        }
        
        // Optionnel : ajouter l'événement au store local pour un accès plus rapide la prochaine fois
        // (seulement si l'utilisateur est participant confirmé)
        const addEvent = useEventStore.getState().addEvent;
        const existingEvent = useEventStore.getState().events.find(e => e.id === foundEvent.id);
        if (!existingEvent) {
          // Ne pas ajouter automatiquement, attendre que l'utilisateur soit confirmé
          console.log('[EventJoin] Event not in local store, will be added when participant is confirmed');
        }
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
    if (!isAuthenticated) {
      console.log('[EventJoin] ❌ User not authenticated, requiring auth');
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
        
        console.log('[EventJoin] 📝 Creating join request with:', {
          userId: finalUserId,
          email: finalEmail,
          name: pseudo.trim(),
          isOpenEvent,
          eventStatus
        });
        
        const requestResult = await createJoinRequest(event.id, {
          userId: finalUserId, // Email saisi pour "open", email authentifié pour autres
          email: finalEmail,   // Email saisi pour "open", email authentifié pour autres
          name: pseudo.trim()
        });
        
        console.log('[EventJoin] ✅ ===== JOIN REQUEST CREATED =====');
        console.log('[EventJoin] ✅ Result:', requestResult);
        console.log('[EventJoin] ✅ Request ID:', requestResult.requestId);
        console.log('[EventJoin] ✅ Event ID used:', event.id);
        console.log('[EventJoin] ✅ The request should now be visible in EventManagement for event:', event.id);
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


  // Vérifier le statut du participant s'il existe déjà
  useEffect(() => {
    if (event && email) {
      const existingParticipant = event.participants?.find(
        p => p.email === email || (p.userId && email && p.userId === email)
      );
      
      if (existingParticipant) {
        console.log('[EventJoin] Existing participant found:', {
          id: existingParticipant.id,
          name: existingParticipant.name,
          status: existingParticipant.status
        });
        
        if (existingParticipant.status === 'pending') {
          setIsJoined(true);
          setPendingParticipantId(existingParticipant.id);
        } else if (existingParticipant.status === 'confirmed') {
          // Participant déjà accepté, rediriger vers l'événement
          handleConfirmedParticipant(event, existingParticipant, email);
        } else if (existingParticipant.status === 'rejected') {
          // Participant rejeté
          console.log('[EventJoin] Participant was rejected');
          toast({
            variant: "destructive",
            title: "Demande rejetée",
            description: "Votre demande de participation a été rejetée par l'organisateur."
          });
        }
      }
    }
  }, [event, email, toast]);

  if (isJoined && event) {
    const participant = event.participants?.find(p => p.id === pendingParticipantId);
    const status = participant?.status || 'pending';

    // 🔄 Vérification automatique d'accès : dès que l'organisateur accepte,
    // le participant est créé dans events/{eventId}/participants/{emailLower}
    // → on redirige automatiquement vers l'événement.
    useEffect(() => {
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

      // Démarrer la vérification uniquement si on est en état "en attente"
      if (status === 'pending') {
        startAccessCheck();
      }

      return () => {
        cancelled = true;
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [status, event?.id, email, currentUserId, toast]);
    
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
          <AlertDescription className="space-y-2">
            <p className="font-semibold text-primary">📋 Guide : Comment rejoindre un événement</p>
            <div className="text-sm space-y-1.5 mt-2">
              <p><strong>1️⃣ Par code :</strong> Saisissez le code à 8 lettres majuscules reçu dans votre invitation (ex: VKCKVSOB) et cliquez sur "Rechercher"</p>
              <p><strong>2️⃣ Par QR code :</strong> Cliquez sur le bouton QR code (📷) à droite et scannez le QR code reçu avec votre caméra</p>
              <p><strong>3️⃣ Par lien :</strong> Si vous avez cliqué sur un lien d'invitation, le code est déjà pré-rempli automatiquement</p>
              <p className="mt-2 text-xs text-muted-foreground">
                ⚠️ <strong>Important :</strong> Vous devez être connecté(e) pour rejoindre. Votre demande sera envoyée à l'organisateur qui devra la valider avant que vous ayez accès complet à l'événement.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                💡 <strong>Astuce :</strong> Si l'événement n'est pas trouvé, vous pouvez quand même créer une demande de participation. L'organisateur pourra la valider manuellement.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* 🔐 Alerte si non authentifié */}
          {!isAuthenticated && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Authentification requise :</strong> Pour rejoindre un évènement, merci de vous connecter ou de créer un compte.
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

          {event && (
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="pseudo">Pseudo</Label>
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
                  />
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
                  />
                </div>
              </div>

              {isOrganizer ? (
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
                  disabled={isLoading || !pseudo.trim() || !event || (!isAuthenticated && !event?._isTemporary)}
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
                  ) : !isAuthenticated && !event?._isTemporary ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Authentification requise
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
    console.log('[EventJoin] QR code scanned, received code:', scannedCode);

    // Nettoyer le code : garder uniquement les lettres majuscules
    const cleanCode =
      scannedCode?.trim().toUpperCase().replace(/[^A-Z]/g, '') || '';

    console.log('[EventJoin] Cleaned scanned code:', cleanCode);

    if (cleanCode && cleanCode.length === 8) {
      setEventCode(cleanCode);

      // Attendre un peu pour que le state soit mis à jour, puis vérifier
      setTimeout(() => {
        console.log(
          '[EventJoin] Calling handleCodeCheck with cleaned code:',
          cleanCode
        );
        handleCodeCheck(cleanCode).catch((err) =>
          console.error('[EventJoin] Error in handleCodeCheck:', err)
        );
      }, 100);
    } else {
      console.warn(
        '[EventJoin] No valid code extracted from QR scan:',
        scannedCode
      );
      toast({
        variant: 'destructive',
        title: 'Code invalide',
        description: 'Le code doit contenir exactement 8 lettres majuscules (A-Z).',
      });
    }

    setIsQRScannerOpen(false);
  }}
/></div>
); }
