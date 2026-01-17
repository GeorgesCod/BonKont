import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Users, Calendar, Euro, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

export function EventJoin() {
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

  // Récupérer les données utilisateur si connecté
  useEffect(() => {
    const userData = localStorage.getItem('bonkont-user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setPseudo(user.name || user.email?.split('@')[0] || '');
        setEmail(user.email || '');
      } catch (e) {
        console.error('[EventJoin] Erreur lors de la récupération de l\'utilisateur:', e);
      }
    }
  }, []);

  // Vérifier si un code est dans l'URL
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/\/join\/([A-Z0-9-]+)/);
    if (match) {
      setEventCode(match[1].toUpperCase());
      handleCodeCheck(match[1].toUpperCase());
    }
  }, []);

  const handleCodeCheck = (code) => {
    if (!code || code.trim() === '') {
      setEvent(null);
      return;
    }

    const foundEvent = events.find(e => e.code?.toUpperCase() === code.toUpperCase());
    setEvent(foundEvent || null);
  };

  const handleCodeChange = (value) => {
    const upperValue = value.toUpperCase();
    setEventCode(upperValue);
    handleCodeCheck(upperValue);
  };

  const handleJoin = async () => {
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
        p => p.email === email || p.name === pseudo
      );

      if (existingParticipant) {
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

      const newParticipant = {
        id: newParticipantId,
        name: pseudo.trim(),
        email: email.trim() || '',
        hasConfirmed: false,
        hasValidatedAmount: false,
        hasValidatedDeadline: false,
        hasAcceptedCharter: false,
        status: 'pending', // En attente de validation
        hasPaid: false,
        paidAmount: 0
      };

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

      // Sauvegarder les données utilisateur si pas déjà connecté
      if (!localStorage.getItem('bonkont-user')) {
        const userData = {
          name: pseudo,
          email: email || '',
          createdAt: new Date()
        };
        localStorage.setItem('bonkont-user', JSON.stringify(userData));
      }

    } catch (error) {
      console.error('[EventJoin] Erreur lors de la demande de participation:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isJoined && event) {
    return (
      <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0">
        <Card className="p-6 neon-border">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Demande envoyée !</h2>
              <p className="text-muted-foreground mt-2">
                Votre demande de participation à "{event.title}" est en attente de validation.
              </p>
            </div>
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                L'organisateur recevra une notification et validera votre participation. 
                Vous serez informé(e) une fois votre demande acceptée.
              </AlertDescription>
            </Alert>
            <Button
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventCode">Code événement</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                id="eventCode"
                value={eventCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Ex: FLO-7K2P"
                className="pl-10 neon-border font-mono uppercase"
                maxLength={20}
              />
            </div>
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

              <Button
                onClick={handleJoin}
                disabled={isLoading || !pseudo.trim()}
                className="w-full gap-2 button-glow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Rejoindre
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

