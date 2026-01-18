import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Users, Calendar, Euro, AlertCircle, CheckCircle, Loader2, Clock, ArrowRight, QrCode } from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import { QRCodeScanner } from '@/components/QRCodeScanner';

export function EventJoin({ onAuthRequired }) {
  const { toast } = useToast();
  const events = useEventStore((state) => state.events);
  const updateEvent = useEventStore((state) => state.updateEvent);
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
    const hash = window.location.hash;
    console.log('[EventJoin] Checking URL for event code:', hash);
    
    // Pattern 1: #/join/CODE
    let match = hash.match(/\/join\/([A-Z0-9-]+)/i);
    if (match) {
      const code = match[1].toUpperCase();
      console.log('[EventJoin] Code found in URL (pattern 1):', code);
      setEventCode(code);
      handleCodeCheck(code);
      return;
    }
    
    // Pattern 2: /event/CODE (redirigé depuis App.jsx)
    match = hash.match(/\/event\/([A-Z0-9-]+)/i);
    if (match) {
      const code = match[1].toUpperCase();
      console.log('[EventJoin] Code found in URL (pattern 2), redirecting:', code);
      window.location.hash = `#/join/${code}`;
      setEventCode(code);
      handleCodeCheck(code);
      return;
    }
  }, []);

  const handleCodeCheck = (code) => {
    if (!code || code.trim() === '') {
      setEvent(null);
      return;
    }

    console.log('[EventJoin] Checking code:', code);
    console.log('[EventJoin] Available events:', events.map(e => ({ id: e.id, code: e.code, title: e.title })));
    
    const foundEvent = events.find(e => {
      const eventCode = e.code?.toUpperCase() || '';
      const searchCode = code.toUpperCase();
      const match = eventCode === searchCode;
      if (match) {
        console.log('[EventJoin] ✅ Match found:', { eventCode, searchCode, eventId: e.id, title: e.title });
      }
      return match;
    });
    
    if (foundEvent) {
      console.log('[EventJoin] ✅ Event found:', { id: foundEvent.id, title: foundEvent.title, code: foundEvent.code });
      setEvent(foundEvent);
    } else {
      console.log('[EventJoin] ❌ No event found for code:', code);
      console.log('[EventJoin] Available codes:', events.map(e => e.code).filter(Boolean));
      setEvent(null);
    }
  };

  // Vérifier automatiquement le code quand il change (avec debounce)
  useEffect(() => {
    if (eventCode && eventCode.trim() !== '' && events.length > 0) {
      const timer = setTimeout(() => {
        console.log('[EventJoin] Auto-checking code after change:', eventCode);
        handleCodeCheck(eventCode);
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCode, events.length]);

  // Réagir aux changements dans le store d'événements
  useEffect(() => {
    console.log('[EventJoin] Events in store:', events.length, 'events');
    if (events.length > 0) {
      console.log('[EventJoin] Event codes available:', events.map(e => e.code).filter(Boolean));
    }
    if (eventCode && eventCode.trim() !== '') {
      console.log('[EventJoin] Events changed, rechecking code:', eventCode);
      handleCodeCheck(eventCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]); // Seulement réagir au nombre d'événements pour éviter les boucles

  // Vérifier le code au chargement si présent dans l'URL ou dans le state
  useEffect(() => {
    if (eventCode && eventCode.trim() !== '' && events.length > 0) {
      console.log('[EventJoin] Initial check for code:', eventCode);
      handleCodeCheck(eventCode);
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
    if (!isAuthenticated) {
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

      // Récupérer userId depuis localStorage
      const userData = JSON.parse(localStorage.getItem('bonkont-user'));
      const userId = userData?.email || userData?.id || null;

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
        status: 'pending'
      });

      // Ajouter le participant à l'événement
      updateEvent(event.id, {
        participants: [...(event.participants || []), newParticipant]
      });

      setPendingParticipantId(newParticipantId);
      setIsJoined(true);

      toast({
        title: "Demande envoyée !",
        description: "Votre demande de participation est en attente de validation par l'organisateur."
      });

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
              <p><strong>1️⃣ Par code :</strong> Saisissez le code reçu dans votre invitation et cliquez sur "Rechercher"</p>
              <p><strong>2️⃣ Par QR code :</strong> Cliquez sur le bouton QR code à droite et scannez le QR code reçu</p>
              <p><strong>3️⃣ Par lien :</strong> Si vous avez cliqué sur un lien d'invitation, le code est déjà pré-rempli</p>
              <p className="mt-2 text-xs text-muted-foreground">
                ⚠️ <strong>Important :</strong> Vous devez être connecté(e) pour rejoindre. Votre demande sera envoyée à l'organisateur qui devra la valider.
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
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="eventCode"
                  value={eventCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    console.log('[EventJoin] Input onChange:', value);
                    setEventCode(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && eventCode.trim() !== '') {
                      console.log('[EventJoin] Enter pressed, checking code');
                      handleCodeCheck(eventCode);
                    }
                  }}
                  placeholder="Ex: FLO-7K2P"
                  className="pl-10 neon-border font-mono uppercase"
                  maxLength={20}
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
                    handleCodeCheck(eventCode);
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
                  disabled={isLoading || !pseudo.trim() || !isAuthenticated}
                  className="w-full gap-2 button-glow"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : !isAuthenticated ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Authentification requise
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Rejoindre
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
          console.log('[EventJoin] QR code scanned:', scannedCode);
          setEventCode(scannedCode);
          handleCodeCheck(scannedCode);
          setIsQRScannerOpen(false);
        }}
      />
    </div>
  );
}

