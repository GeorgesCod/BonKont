import { useState } from 'react';
import { useEventStore } from '@/store/eventStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  MapPin, 
  Share2, 
  Users, 
  Star, 
  Calendar, 
  Euro,
  ExternalLink,
  Navigation,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { EventLocation } from '@/components/EventLocation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function EventManagement({ eventId, onBack }) {
  console.log('[EventManagement] Component mounted:', { eventId });
  
  const event = useEventStore((state) => state.events.find(e => e.id === eventId));
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  if (!event) {
    console.error('[EventManagement] Event not found:', eventId);
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Événement introuvable</p>
        <Button onClick={onBack} className="mt-4 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>
    );
  }

  console.log('[EventManagement] Event loaded:', {
    id: event.id,
    code: event.code,
    title: event.title,
    participantsCount: event.participants?.length || 0
  });

  // Liste des meilleurs spots (exemple - à adapter selon le lieu)
  const getSpotsForLocation = (location) => {
    const spotsByLocation = {
      'marrakech': [
        { name: 'Place Jemaa el-Fnaa', rating: 4.8, category: 'Culture', distance: '0.5 km' },
        { name: 'Palais de la Bahia', rating: 4.6, category: 'Histoire', distance: '1.2 km' },
        { name: 'Jardin Majorelle', rating: 4.7, category: 'Nature', distance: '2.5 km' },
        { name: 'Souk de Marrakech', rating: 4.5, category: 'Shopping', distance: '0.8 km' },
        { name: 'Mosquée Koutoubia', rating: 4.9, category: 'Architecture', distance: '1.0 km' }
      ],
      'essaouira': [
        { name: 'Médina d\'Essaouira', rating: 4.7, category: 'Culture', distance: '0.3 km' },
        { name: 'Port d\'Essaouira', rating: 4.6, category: 'Port', distance: '0.5 km' },
        { name: 'Plage d\'Essaouira', rating: 4.8, category: 'Plage', distance: '0.8 km' },
        { name: 'Skala de la Kasbah', rating: 4.5, category: 'Histoire', distance: '0.4 km' }
      ]
    };

    const locationLower = location?.toLowerCase() || '';
    if (locationLower.includes('marrakech')) {
      return spotsByLocation.marrakech;
    } else if (locationLower.includes('essaouira')) {
      return spotsByLocation.essaouira;
    }
    
    // Spots par défaut
    return [
      { name: 'Point d\'intérêt 1', rating: 4.5, category: 'Général', distance: '1.0 km' },
      { name: 'Point d\'intérêt 2', rating: 4.3, category: 'Général', distance: '1.5 km' }
    ];
  };

  const spots = getSpotsForLocation(event.location);
  const participants = Array.isArray(event.participants) ? event.participants : [];

  const handleShareLocation = () => {
    console.log('[EventManagement] Sharing location:', event.location);
    if (navigator.share && event.location) {
      navigator.share({
        title: `Lieu de l'événement: ${event.title}`,
        text: `Rejoignez-nous à: ${event.location}`,
        url: window.location.href
      }).catch(err => console.error('[EventManagement] Share error:', err));
    }
  };

  const getParticipantStats = (participant) => {
    const totalDue = event.amount / participants.length;
    const paid = participant.paidAmount || 0;
    const remaining = Math.max(0, totalDue - paid);
    const paymentProgress = totalDue > 0 ? (paid / totalDue) * 100 : 0;
    
    return {
      totalDue,
      paid,
      remaining,
      paymentProgress,
      hasPaid: participant.hasPaid || false,
      score: participant.score || 0,
      paymentRank: participant.paymentRank || null
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="neon-border flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text truncate">{event.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">{event.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2 flex-shrink-0">
          Code: {event.code}
        </Badge>
      </div>

      {/* Localisation */}
      <Card className="p-6 neon-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Localisation
          </h2>
          <Button variant="outline" size="sm" onClick={handleShareLocation} className="gap-2">
            <Share2 className="w-4 h-4" />
            Partager le lieu
          </Button>
        </div>
        
        {event.location && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-medium mb-2">{event.location}</p>
              <EventLocation initialLocation={event.location} />
            </div>
          </div>
        )}
      </Card>

      {/* Meilleurs spots à visiter */}
      <Card className="p-6 neon-border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" />
          Meilleurs spots à visiter
        </h2>
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-4">
            {spots.map((spot, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  console.log('[EventManagement] Spot clicked:', spot);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name)}`, '_blank');
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{spot.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {spot.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{spot.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Navigation className="w-4 h-4" />
                        <span>{spot.distance}</span>
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Liste des participants */}
      <Card className="p-6 neon-border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Participants ({participants.length})
        </h2>
        <ScrollArea className="h-96">
          <div className="space-y-3 pr-4">
            {participants.map((participant) => {
              const stats = getParticipantStats(participant);
              
              return (
                <div
                  key={participant.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    console.log('[EventManagement] Participant clicked:', {
                      id: participant.id,
                      name: participant.name,
                      stats
                    });
                    setSelectedParticipant(participant);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{participant.name}</h3>
                      <p className="text-sm text-muted-foreground">{participant.email}</p>
                    </div>
                    {stats.hasPaid && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Payé
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Montant dû</p>
                      <p className="font-semibold">{stats.totalDue.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payé</p>
                      <p className="font-semibold text-green-500">{stats.paid.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reste à payer</p>
                      <p className="font-semibold text-destructive">{stats.remaining.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-semibold flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {stats.score}/100
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progression du paiement</span>
                      <span>{stats.paymentProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${stats.paymentProgress}%` }}
                      />
                    </div>
                  </div>

                  {stats.paymentRank && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Classement: {stats.paymentRank}ème participant à avoir payé
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Dialog pour les détails du participant */}
      <Dialog open={selectedParticipant !== null} onOpenChange={() => setSelectedParticipant(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Profil du participant</DialogTitle>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedParticipant.name}</h3>
                <p className="text-muted-foreground">{selectedParticipant.email}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Participations</p>
                  <p className="text-2xl font-bold">{participants.length}</p>
                  <p className="text-xs text-muted-foreground">événements</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Score</p>
                  <p className="text-2xl font-bold">{getParticipantStats(selectedParticipant).score}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Notes et évaluations</h4>
                <div className="p-4 rounded-lg border border-border bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    {selectedParticipant.hasPaid 
                      ? 'Participant fiable et ponctuel dans ses paiements.'
                      : 'En attente de paiement.'}
                  </p>
                  {getParticipantStats(selectedParticipant).paymentRank && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Classé {getParticipantStats(selectedParticipant).paymentRank}ème pour la ponctualité
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Détails financiers</h4>
                <div className="space-y-2">
                  {(() => {
                    const stats = getParticipantStats(selectedParticipant);
                    return (
                      <>
                        <div className="flex justify-between p-2 rounded border border-border">
                          <span>Montant total dû</span>
                          <span className="font-semibold">{stats.totalDue.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between p-2 rounded border border-border">
                          <span>Montant payé</span>
                          <span className="font-semibold text-green-500">{stats.paid.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between p-2 rounded border border-border">
                          <span>Reste à payer</span>
                          <span className="font-semibold text-destructive">{stats.remaining.toFixed(2)}€</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

