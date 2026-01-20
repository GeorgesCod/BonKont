import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Users, Calendar, Euro, AlertCircle, CheckCircle, Loader2, Clock, ArrowRight, QrCode } from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import { useJoinRequestsStore } from '@/store/joinRequestsStore';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { findEventByCode } from '@/services/api';

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
          setPseudo(user.name || user.email?.split('@')[0] || '');
          setEmail(user.email || '');
          console.log('[EventJoin] User data loaded:', { name: user.name, email: user.email, userId });
        } catch (e) {
          console.error('[EventJoin] Erreur lors de la récupération de l\'utilisateur:', e);
        }
      } else {
        setCurrentUserId(null);
      }
    };
    
    checkAuth();
    
    // Écouter les changements d'auth
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  // Vérifier si l'utilisateur est l'organisateur de l'événement
  useEffect(() => {
    if (event && currentUserId) {
      const organizerMatch = event.organizerId === currentUserId || 
                            event.organizerId === currentUserId?.toLowerCase() ||
                            event.organizerId === currentUserId?.toUpperCase();
      const participantMatch = event.participants?.find(p => 
        (p.userId === currentUserId || p.email === currentUserId || p.email?.toLowerCase() === currentUserId?.toLowerCase()) &&
        p.isOrganizer === true
      );
      
      const isOrg = organizerMatch || !!participantMatch;
      setIsOrganizer(isOrg);
      console.log('[EventJoin] Organizer check:', { 
        eventId: event.id, 
        organizerId: event.organizerId, 
        currentUserId, 
        organizerMatch, 
        participantMatch: !!participantMatch,
        isOrganizer: isOrg 
      });
    } else {
      setIsOrganizer(false);
    }
  }, [event, currentUserId]);

  // Vérifier si un code est dans l'URL (depuis QR code ou lien direct)
  useEffect(() => {
    console.log('[EventJoin] ===== CHECKING URL FOR CODE =====');
    const hash = window.location.hash;
    console.log('[EventJoin] Current hash:', hash);
    console.log('[EventJoin] Events available:', events.length);
    
    // Pattern 1: #/join/CODE
    let match = hash.match(/\/join\/([A-Z0-9]+)/i);
    if (match) {
      const code = match[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
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
    match = hash.match(/\/event\/([A-Z0-9]+)/i);
    if (match) {
      const code = match[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
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

    // Nettoyer le code : enlever les espaces et caractères spéciaux, garder seulement lettres et chiffres
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    console.log('[EventJoin] Checking code:', { original: code, cleaned: cleanCode, length: cleanCode.length });
    
    // Vérifier d'abord dans les événements locaux (pour les organisateurs)
    if (events.length > 0) {
      console.log('[EventJoin] Checking local events first...');
      const foundEvent = events.find(e => {
        const eventCode = e.code?.toUpperCase()?.replace(/[^A-Z0-9]/g, '') || '';
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
        return;
      }
    }
    
    // Si pas trouvé localement, chercher sur le backend (API)
    console.log('[EventJoin] Event not found locally, searching on backend API...');
    setIsLoading(true);
    
    try {
      const foundEvent = await findEventByCode(cleanCode);
      
      if (foundEvent) {
        console.log('[EventJoin] ✅✅✅ EVENT FOUND on backend!', { 
          id: foundEvent.id, 
          title: foundEvent.title, 
          code: foundEvent.code 
        });
        setEvent(foundEvent);
        
        // Optionnel : ajouter l'événement au store local pour un accès plus rapide la prochaine fois
        // (seulement si l'utilisateur est participant confirmé)
        const addEvent = useEventStore.getState().addEvent;
        const existingEvent = useEventStore.getState().events.find(e => e.id === foundEvent.id);
        if (!existingEvent) {
          // Ne pas ajouter automatiquement, attendre que l'utilisateur soit confirmé
          console.log('[EventJoin] Event not in local store, will be added when participant is confirmed');
        }
      } else {
        // Événement non trouvé - permettre quand même de créer une demande de participation
        console.log('[EventJoin] ⚠️ Event not found, but allowing join request creation');
        console.log('[EventJoin] Code:', cleanCode);
        
        // Créer un événement "temporaire" pour permettre la création de la demande
        // L'organisateur devra synchroniser manuellement
        const tempEvent = {
          id: `temp-${cleanCode}`,
          code: cleanCode,
          title: `Événement ${cleanCode}`,
          description: 'Événement en attente de synchronisation',
          participants: [],
          status: 'pending_sync',
          // Marquer comme temporaire pour indiquer qu'il faut synchroniser
          _isTemporary: true,
          _eventCode: cleanCode
        };
        
        setEvent(tempEvent);
        
        toast({
          title: "Code reconnu",
          description: "Vous pouvez créer une demande de participation. L'organisateur validera votre demande.",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('[EventJoin] ❌ Error searching event on backend:', error);
      console.error('[EventJoin] Error details:', {
        message: error.message,
        name: error.name
      });
      
      // Même en cas d'erreur, permettre de créer une demande
      console.log('[EventJoin] ⚠️ API error, but allowing join request creation');
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
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

    // 🔐 SÉCURITÉ : Vérifier l'authentification OBLIGATOIRE
    // Mais permettre de créer une demande même sans authentification si l'événement est temporaire
    if (!isAuthenticated && !event?._isTemporary) {
      console.log('[EventJoin] ❌ User not authenticated, requiring auth');
      toast({
        variant: "destructive",
        title: "Authentification requise",
        description: "Pour rejoindre cet évènement, merci de confirmer votre identité."
      });
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
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
        p => p.email === email || (p.email && email && p.email.toLowerCase() === email.toLowerCase())
      );

      if (existingParticipant) {
        console.log('[EventJoin] ⚠️ User already participant:', existingParticipant);
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

      // Si l'événement est temporaire (non trouvé), créer une demande dans le store
      if (event._isTemporary) {
        console.log('[EventJoin] Event is temporary, creating join request in store');
        const requestId = addJoinRequest({
          eventCode: event.code,
          eventId: event.id,
          participant: newParticipant,
          userId: userId,
          createdAt: new Date().toISOString()
        });
        console.log('[EventJoin] Join request created with ID:', requestId);
        
        setPendingParticipantId(newParticipantId);
        setIsJoined(true);
        
        toast({
          title: "Demande créée !",
          description: "Votre demande de participation a été enregistrée. L'organisateur pourra la valider lorsqu'il synchronisera les demandes.",
          duration: 6000
        });
      } else {
        // Événement trouvé, ajouter directement le participant
        updateEvent(event.id, {
          participants: [...(event.participants || []), newParticipant]
        });

        setPendingParticipantId(newParticipantId);
        setIsJoined(true);

        toast({
          title: "Demande envoyée !",
          description: "Votre demande de participation est en attente de validation par l'organisateur."
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
          console.log('[EventJoin] Participant already confirmed, redirecting to event');
          toast({
            title: "Déjà membre",
            description: "Vous êtes déjà membre de cet événement."
          });
          window.location.hash = `#event/${event.id}`;
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
                {status === 'confirmed' ? 'Demande acceptée !' : 
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
              <AlertCircle className="w-4 h-4" />
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

  return (
    <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Rejoindre un événement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Entre le code et rejoins le groupe. Transparence obligatoire 😊
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-6 neon-border space-y-4 sm:space-y-6">
        {/* 📋 Guide d'accueil pour les invités */}
        <Alert className="bg-primary/10 border-primary/20">
          <AlertCircle className="w-4 h-4 text-primary" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold text-primary">📋 Guide : Comment rejoindre un événement</p>
            <div className="text-sm space-y-1.5 mt-2">
              <p><strong>1️⃣ Par code :</strong> Saisissez le code à 8 caractères reçu dans votre invitation (ex: VKCKVSOB) et cliquez sur "Rechercher"</p>
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
            <Label htmlFor="eventCode">Code événement</Label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="eventCode"
                  value={eventCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    console.log('[EventJoin] Input onChange:', value, 'Length:', value.length);
                    setEventCode(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && eventCode.trim() !== '') {
                      console.log('[EventJoin] Enter pressed, checking code');
                      handleCodeCheck(eventCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
                    }
                  }}
                  placeholder="Saisissez le code (8 caractères, ex: VKCKVSOB)"
                  className="pl-10 neon-border font-mono uppercase w-full"
                  maxLength={20}
                  style={{ minWidth: '200px' }}
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
              💡 Saisissez le code ou scannez le QR code reçu pour rejoindre l'événement
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
                  <Label htmlFor="pseudo">Pseudo</Label>
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
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
          // Nettoyer le code et le définir
          const cleanCode = scannedCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
          console.log('[EventJoin] Cleaned scanned code:', cleanCode);
          if (cleanCode) {
            setEventCode(cleanCode);
            // Attendre un peu pour que le state soit mis à jour, puis vérifier
            setTimeout(() => {
              console.log('[EventJoin] Calling handleCodeCheck with cleaned code:', cleanCode);
              handleCodeCheck(cleanCode).catch(err => console.error('[EventJoin] Error in handleCodeCheck:', err));
            }, 100);
          } else {
            console.warn('[EventJoin] No valid code extracted from QR scan:', scannedCode);
            toast({
              variant: "destructive",
              title: "Code invalide",
              description: "Impossible d'extraire un code valide du QR code scanné."
            });
          }
          setIsQRScannerOpen(false);
        }}
      />
    </div>
  );
}

