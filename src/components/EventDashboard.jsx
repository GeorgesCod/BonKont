 import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  Users,
  Euro,
  Check,
  AlertTriangle,
  Bell,
  ArrowRight,
  Timer,
  History,
  Trash2,
  CreditCard
} from 'lucide-react';

export function EventDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const events = useEventStore((state) => state.events);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const deleteEvent = useEventStore((state) => state.deleteEvent);
  const updateParticipant = useEventStore((state) => state.updateParticipant);

  const filteredEvents = events.filter(event => {
    switch (activeTab) {
      case 'active':
        return event.status === 'active';
      case 'pending':
        return event.status === 'pending';
      case 'completed':
        return event.status === 'completed';
      default:
        return true;
    }
  });

  const handleSendReminder = (eventId) => {
    toast({
      title: "Rappel envoyé",
      description: "Les participants ont été notifiés par email."
    });
  };

  const handleDeleteEvent = (eventId) => {
    deleteEvent(eventId);
    toast({
      title: "Événement supprimé",
      description: "L'événement a été supprimé avec succès."
    });
  };

  const handlePayment = (eventId, participantId) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const participant = event.participants.find(p => p.id === participantId);
    if (!participant) return;

    setSelectedEvent(eventId);
    setSelectedParticipant(participantId);
    setPaymentAmount((event.amount / event.participants.length).toFixed(2));
  };

  const handlePaymentSubmit = () => {
    if (!selectedEvent || !selectedParticipant || !paymentAmount) return;

    const event = events.find(e => e.id === selectedEvent);
    if (!event) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Montant invalide",
        description: "Veuillez entrer un montant valide."
      });
      return;
    }

    const participant = event.participants.find(p => p.id === selectedParticipant);
    if (!participant) return;

    const totalDue = event.amount / event.participants.length;
    const alreadyPaid = participant.paidAmount || 0;
    const remainingDue = totalDue - alreadyPaid;

    if (amount > remainingDue) {
      toast({
        variant: "destructive",
        title: "Montant trop élevé",
        description: `Le montant maximum à payer est de ${remainingDue.toFixed(2)}€`
      });
      return;
    }

    // Mise à jour du participant
    updateParticipant(selectedEvent, selectedParticipant, {
      hasPaid: amount >= remainingDue,
      paidAmount: alreadyPaid + amount,
      paidDate: new Date()
    });

    // Mise à jour de l'événement
    updateEvent(selectedEvent, {
      totalPaid: event.totalPaid + amount,
      status: event.totalPaid + amount >= event.amount ? 'completed' : 'active'
    });

    toast({
      title: "Paiement effectué",
      description: `Paiement de ${amount.toFixed(2)}€ enregistré avec succès.`
    });

    setSelectedEvent(null);
    setSelectedParticipant(null);
    setPaymentAmount('');
  };

  const getEventProgress = (event) => {
    const validationProgress = event.participants.reduce((acc, p) => {
      let score = 0;
      if (p.hasConfirmed) score++;
      if (p.hasValidatedAmount) score++;
      if (p.hasValidatedDeadline) score++;
      return acc + (score / 3);
    }, 0) / event.participants.length * 100;

    const paymentProgress = (event.totalPaid / event.amount) * 100;

    return {
      validation: validationProgress,
      payment: paymentProgress
    };
  };

  const getRemainingTime = (event) => {
    const startDate = new Date(event.startDate);
    const end = new Date(startDate.getTime() + event.deadline * 24 * 60 * 60 * 1000);
    const now = new Date();
    const remaining = end.getTime() - now.getTime();
    const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold gradient-text">Tableau de bord</h2>
        <Button variant="outline" className="gap-2 neon-border">
          <History className="w-4 h-4" />
          Historique
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="gap-2">
            <Clock className="w-4 h-4" />
            En cours
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Timer className="w-4 h-4" />
            En attente
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <Check className="w-4 h-4" />
            Terminés
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredEvents.map((event) => {
            const progress = getEventProgress(event);
            const remainingDays = getRemainingTime(event);

            return (
              <Card key={event.id} className="p-6 neon-border space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  </div>
                  <Badge
                    variant={remainingDays > 5 ? 'outline' : 'destructive'}
                    className="gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {remainingDays} jours restants
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg neon-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <h4 className="font-medium">Participants</h4>
                      </div>
                      <span className="text-sm">{event.participants.length}</span>
                    </div>
                    <Progress value={progress.validation} className="h-2" />
                  </div>

                  <div className="p-4 rounded-lg neon-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Euro className="w-5 h-5 text-primary" />
                        <h4 className="font-medium">Paiements</h4>
                      </div>
                      <span className="text-sm">{progress.payment.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress.payment} className="h-2" />
                  </div>

                  <div className="p-4 rounded-lg neon-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h4 className="font-medium">Échéance</h4>
                      </div>
                    </div>
                    <div className="text-center py-2">
                      <div className="text-2xl font-bold gradient-text">
                        {remainingDays}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        jours restants
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 neon-border"
                    onClick={() => handlePayment(event.id, event.participants[0]?.id)}
                  >
                    <CreditCard className="w-4 h-4" />
                    Enregistrer un paiement
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 neon-border"
                    onClick={() => handleSendReminder(event.id)}
                  >
                    <Bell className="w-4 h-4" />
                    Envoyer un rappel
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 neon-border text-destructive"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </Button>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filteredEvents.length === 0 ? (
            <Card className="p-8 text-center neon-border">
              <p className="text-muted-foreground">Aucun événement en attente</p>
            </Card>
          ) : (
            filteredEvents.map((event) => (
              <Card key={event.id} className="p-6 neon-border">
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredEvents.length === 0 ? (
            <Card className="p-8 text-center neon-border">
              <p className="text-muted-foreground">Aucun événement terminé</p>
            </Card>
          ) : (
            filteredEvents.map((event) => (
              <Card key={event.id} className="p-6 neon-border">
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={selectedEvent !== null} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="participant">Participant</Label>
              <Input
                id="participant"
                value={selectedParticipant !== null ? events.find(e => e.id === selectedEvent)?.participants.find(p => p.id === selectedParticipant)?.name || '' : ''}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={handlePaymentSubmit} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
