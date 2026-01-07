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
  CreditCard,
  ArrowLeft,
  Wallet,
  DollarSign,
  Receipt,
  Calculator
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaymentMethods } from '@/components/PaymentMethods';
import { CashPayment } from '@/components/CashPayment';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Lock } from 'lucide-react';

export function EventDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [savedCards, setSavedCards] = useState([
    { id: 'card1', last4: '4242', brand: 'Visa', expiryMonth: '12', expiryYear: '2025' }
  ]);
  const [selectedCard, setSelectedCard] = useState('card1');
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    name: ''
  });
  
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

  const handlePayment = (eventId, participantId = null) => {
    const event = events.find(e => e.id === eventId);
    if (!event) {
      console.error('[Payment] Event not found:', eventId);
      return;
    }

    setSelectedEvent(eventId);
    setSelectedParticipant(participantId || event.participants[0]?.id || null);
    
    // Calculer le montant dû pour le participant sélectionné
    if (participantId) {
      const participant = event.participants.find(p => p.id === participantId);
      if (participant) {
        const totalDue = event.amount / event.participants.length;
        const alreadyPaid = participant.paidAmount || 0;
        const remainingDue = Math.max(0, totalDue - alreadyPaid);
        setPaymentAmount(remainingDue.toFixed(2));
        console.log('[Payment] Participant selected:', {
          participantId,
          name: participant.name,
          totalDue,
          alreadyPaid,
          remainingDue
        });
      }
    } else {
      const totalDue = event.amount / event.participants.length;
      setPaymentAmount(totalDue.toFixed(2));
      console.log('[Payment] No participant selected, default amount:', totalDue);
    }
    
    setPaymentMethod('card');
  };

  const handlePaymentSubmit = () => {
    console.log('[Payment] Submit started:', {
      selectedEvent,
      selectedParticipant,
      paymentAmount,
      paymentMethod
    });

    if (!selectedEvent || !selectedParticipant || !paymentAmount) {
      console.error('[Payment] Missing required fields');
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs requis."
      });
      return;
    }

    const event = events.find(e => e.id === selectedEvent);
    if (!event) {
      console.error('[Payment] Event not found');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      console.error('[Payment] Invalid amount:', paymentAmount);
      toast({
        variant: "destructive",
        title: "Montant invalide",
        description: "Veuillez entrer un montant valide."
      });
      return;
    }

    const participant = event.participants.find(p => p.id === selectedParticipant);
    if (!participant) {
      console.error('[Payment] Participant not found');
      return;
    }

    const totalDue = event.amount / event.participants.length;
    const alreadyPaid = participant.paidAmount || 0;
    const remainingDue = totalDue - alreadyPaid;

    console.log('[Payment] Payment calculation:', {
      totalDue,
      alreadyPaid,
      remainingDue,
      amount
    });

    if (amount > remainingDue + 0.01) { // Tolérance de 1 centime
      console.warn('[Payment] Amount exceeds remaining due');
      toast({
        variant: "destructive",
        title: "Montant trop élevé",
        description: `Le montant maximum à payer est de ${remainingDue.toFixed(2)}€`
      });
      return;
    }

    // Mise à jour du participant
    updateParticipant(selectedEvent, selectedParticipant, {
      hasPaid: amount >= remainingDue - 0.01,
      paidAmount: alreadyPaid + amount,
      paidDate: new Date(),
      paymentMethod: paymentMethod
    });

    // Mise à jour de l'événement
    const newTotalPaid = event.totalPaid + amount;
    updateEvent(selectedEvent, {
      totalPaid: newTotalPaid,
      status: newTotalPaid >= event.amount - 0.01 ? 'completed' : 'active'
    });

    console.log('[Payment] Payment successful:', {
      participant: participant.name,
      amount,
      method: paymentMethod,
      newTotalPaid
    });

    toast({
      title: "Paiement effectué",
      description: `Paiement de ${amount.toFixed(2)}€ par ${paymentMethod === 'card' ? 'carte bancaire' : 'espèces'} enregistré avec succès.`
    });

    setSelectedEvent(null);
    setSelectedParticipant(null);
    setPaymentAmount('');
    setPaymentMethod('card');
  };

  const handlePaymentMethodSelect = (method) => {
    console.log('[Payment] Method selected:', method);
    setPaymentMethod(method);
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
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{event.title}</h3>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('[EventDashboard] Event code clicked:', event.code, event.id);
                          window.location.hash = `event/${event.id}`;
                        }}
                        title="Cliquez pour gérer l'événement"
                      >
                        {event.code}
                      </Badge>
                    </div>
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

      <Dialog open={selectedEvent !== null} onOpenChange={() => {
        console.log('[Payment] Dialog closed');
        setSelectedEvent(null);
        setSelectedParticipant(null);
        setPaymentAmount('');
        setPaymentMethod('card');
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold gradient-text">
              Enregistrer un paiement
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (() => {
            const event = events.find(e => e.id === selectedEvent);
            if (!event) return null;

            const participant = selectedParticipant 
              ? event.participants.find(p => p.id === selectedParticipant)
              : null;

            const totalDue = event.amount / event.participants.length;
            const alreadyPaid = participant?.paidAmount || 0;
            const remainingDue = Math.max(0, totalDue - alreadyPaid);
            const totalRemaining = event.amount - (event.totalPaid || 0);

            return (
              <div className="space-y-6">
                {/* Liste des participants avec scroll */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Choisir le participant qui paie
                  </Label>
                  <ScrollArea className="h-48 rounded-lg border border-border">
                    <div className="p-2 space-y-2">
                      {event.participants.map((p) => {
                        const pTotalDue = event.amount / event.participants.length;
                        const pAlreadyPaid = p.paidAmount || 0;
                        const pRemainingDue = Math.max(0, pTotalDue - pAlreadyPaid);
                        const isSelected = selectedParticipant === p.id;

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedParticipant(p.id);
                              setPaymentAmount(pRemainingDue.toFixed(2));
                              console.log('[Payment] Participant clicked:', {
                                id: p.id,
                                name: p.name,
                                remainingDue: pRemainingDue
                              });
                            }}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{p.name}</p>
                                <p className="text-sm text-muted-foreground">{p.email}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs">
                                  <span className="text-muted-foreground">
                                    Dû: {pTotalDue.toFixed(2)}€
                                  </span>
                                  <span className="text-muted-foreground">
                                    Payé: {pAlreadyPaid.toFixed(2)}€
                                  </span>
                                  <span className={`font-semibold ${
                                    pRemainingDue > 0 ? 'text-destructive' : 'text-green-500'
                                  }`}>
                                    Restant: {pRemainingDue.toFixed(2)}€
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Montant */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-base font-semibold flex items-center gap-2">
                    <Euro className="w-5 h-5 text-primary" />
                    Montant du paiement
                  </Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => {
                        setPaymentAmount(e.target.value);
                        console.log('[Payment] Amount changed:', e.target.value);
                      }}
                      placeholder="0.00"
                      className="pl-10 neon-border"
                    />
                  </div>
                </div>

                {/* Solde participatif restant dû */}
                <div className="p-4 rounded-lg neon-border bg-primary/5 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    Solde participatif restant dû
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Montant total événement</p>
                      <p className="text-lg font-bold">{event.amount.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Déjà payé</p>
                      <p className="text-lg font-bold text-green-500">
                        {(event.totalPaid || 0).toFixed(2)}€
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reste à payer (total)</p>
                      <p className="text-lg font-bold text-destructive">
                        {totalRemaining.toFixed(2)}€
                      </p>
                    </div>
                    {participant && (
                      <div>
                        <p className="text-muted-foreground">Reste à payer (participant)</p>
                        <p className="text-lg font-bold text-destructive">
                          {remainingDue.toFixed(2)}€
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Méthodes de paiement */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Mode de paiement
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => handlePaymentMethodSelect('card')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'card'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <CreditCard className="w-6 h-6 text-primary" />
                        <span className="font-medium">Carte bancaire</span>
                        <span className="text-xs text-muted-foreground">
                          Paiement sécurisé
                        </span>
                      </div>
                    </div>
                    <div
                      onClick={() => handlePaymentMethodSelect('cash')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" />
                        <span className="font-medium">Espèces</span>
                        <span className="text-xs text-muted-foreground">
                          Validation collective
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contenu selon la méthode de paiement sélectionnée */}
                  {paymentMethod === 'cash' ? (
                    <div className="mt-4">
                      <CashPayment
                        eventId={selectedEvent}
                        participantId={selectedParticipant}
                        amount={parseFloat(paymentAmount) || 0}
                        onValidated={() => {
                          console.log('[Payment] Cash payment validated');
                          setSelectedEvent(null);
                          setSelectedParticipant(null);
                          setPaymentAmount('');
                          setPaymentMethod('card');
                        }}
                      />
                    </div>
                  ) : paymentMethod === 'card' ? (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 rounded-lg neon-border bg-primary/5">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-primary" />
                          Cartes enregistrées
                        </h3>
                        
                        {!showAddCard ? (
                          <>
                            <RadioGroup value={selectedCard} onValueChange={setSelectedCard} className="space-y-3">
                              {savedCards.map((card) => (
                                <div
                                  key={card.id}
                                  className="flex items-center justify-between p-4 rounded-lg border border-primary/50 bg-background/50 hover:bg-primary/5 transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <RadioGroupItem value={card.id} id={card.id} />
                                    <Label htmlFor={card.id} className="flex items-center gap-3 cursor-pointer">
                                      <CreditCard className="w-5 h-5 text-primary" />
                                      <div>
                                        <div className="font-medium">
                                          •••• •••• •••• {card.last4}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {card.brand} • {card.expiryMonth}/{card.expiryYear}
                                        </div>
                                      </div>
                                    </Label>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      console.log('[Payment] Edit card:', card.id);
                                      setNewCard({
                                        number: `****${card.last4}`,
                                        expiryMonth: card.expiryMonth,
                                        expiryYear: card.expiryYear,
                                        cvv: '',
                                        name: ''
                                      });
                                      setShowAddCard(true);
                                    }}
                                    className="text-primary hover:text-primary/90"
                                  >
                                    Modifier
                                  </Button>
                                </div>
                              ))}
                            </RadioGroup>
                            
                            <Button
                              variant="outline"
                              className="w-full mt-4 neon-border border-primary/50 hover:border-primary hover:bg-primary/10"
                              onClick={() => {
                                console.log('[Payment] Add new card clicked');
                                setNewCard({
                                  number: '',
                                  expiryMonth: '',
                                  expiryYear: '',
                                  cvv: '',
                                  name: ''
                                });
                                setShowAddCard(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Ajouter une carte
                            </Button>
                          </>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold">Nouvelle carte bancaire</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log('[Payment] Cancel add card');
                                  setShowAddCard(false);
                                  setNewCard({
                                    number: '',
                                    expiryMonth: '',
                                    expiryYear: '',
                                    cvv: '',
                                    name: ''
                                  });
                                }}
                              >
                                Annuler
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="cardNumber">Numéro de carte</Label>
                                <Input
                                  id="cardNumber"
                                  type="text"
                                  placeholder="1234 5678 9012 3456"
                                  value={newCard.number}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                                    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                                    setNewCard({ ...newCard, number: formatted });
                                    console.log('[Payment] Card number changed');
                                  }}
                                  maxLength={19}
                                  className="neon-border"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="cardName">Nom sur la carte</Label>
                                <Input
                                  id="cardName"
                                  type="text"
                                  placeholder="NOM PRÉNOM"
                                  value={newCard.name}
                                  onChange={(e) => {
                                    setNewCard({ ...newCard, name: e.target.value.toUpperCase() });
                                    console.log('[Payment] Card name changed');
                                  }}
                                  className="neon-border"
                                />
                              </div>
                              
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label htmlFor="expiryMonth">Mois</Label>
                                  <Input
                                    id="expiryMonth"
                                    type="text"
                                    placeholder="MM"
                                    value={newCard.expiryMonth}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                                      if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12)) {
                                        setNewCard({ ...newCard, expiryMonth: value });
                                        console.log('[Payment] Expiry month changed');
                                      }
                                    }}
                                    maxLength={2}
                                    className="neon-border"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="expiryYear">Année</Label>
                                  <Input
                                    id="expiryYear"
                                    type="text"
                                    placeholder="AA"
                                    value={newCard.expiryYear}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                                      setNewCard({ ...newCard, expiryYear: value });
                                      console.log('[Payment] Expiry year changed');
                                    }}
                                    maxLength={2}
                                    className="neon-border"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="cvv">CVV</Label>
                                  <Input
                                    id="cvv"
                                    type="text"
                                    placeholder="123"
                                    value={newCard.cvv}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                      setNewCard({ ...newCard, cvv: value });
                                      console.log('[Payment] CVV changed');
                                    }}
                                    maxLength={4}
                                    className="neon-border"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                <Lock className="w-4 h-4" />
                                <span>Vos informations sont sécurisées et cryptées</span>
                              </div>
                              
                              <Button
                                className="w-full button-glow"
                                onClick={() => {
                                  if (newCard.number && newCard.name && newCard.expiryMonth && newCard.expiryYear && newCard.cvv) {
                                    const last4 = newCard.number.replace(/\s/g, '').slice(-4);
                                    const newCardData = {
                                      id: `card${Date.now()}`,
                                      last4,
                                      brand: newCard.number.startsWith('4') ? 'Visa' : 'Mastercard',
                                      expiryMonth: newCard.expiryMonth,
                                      expiryYear: `20${newCard.expiryYear}`,
                                      name: newCard.name
                                    };
                                    setSavedCards([...savedCards, newCardData]);
                                    setSelectedCard(newCardData.id);
                                    setShowAddCard(false);
                                    setNewCard({
                                      number: '',
                                      expiryMonth: '',
                                      expiryYear: '',
                                      cvv: '',
                                      name: ''
                                    });
                                    console.log('[Payment] Card added successfully:', newCardData);
                                    toast({
                                      title: "Carte ajoutée",
                                      description: "Votre carte a été enregistrée avec succès."
                                    });
                                  } else {
                                    toast({
                                      variant: "destructive",
                                      title: "Champs manquants",
                                      description: "Veuillez remplir tous les champs de la carte."
                                    });
                                  }
                                }}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Enregistrer la carte
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-lg neon-border bg-primary/5">
                      <p className="text-sm text-muted-foreground">
                        Paiement via {paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'lydia' ? 'Lydia' : 'Virement bancaire'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Cette fonctionnalité sera disponible prochainement.
                      </p>
                    </div>
                  )}

                  {/* Autres moyens de paiement actifs */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Autres moyens de paiement disponibles
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-4 flex flex-col gap-2 neon-border border-primary/50 hover:border-primary hover:bg-primary/10"
                          onClick={() => {
                            console.log('[Payment] PayPal selected');
                            handlePaymentMethodSelect('paypal');
                          }}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#0070BA] flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-medium">PayPal</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-4 flex flex-col gap-2 neon-border border-primary/50 hover:border-primary hover:bg-primary/10"
                          onClick={() => {
                            console.log('[Payment] Lydia selected');
                            handlePaymentMethodSelect('lydia');
                          }}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#3396CD] flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-medium">Lydia</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto py-4 flex flex-col gap-2 neon-border border-primary/50 hover:border-primary hover:bg-primary/10"
                          onClick={() => {
                            console.log('[Payment] Virement selected');
                            handlePaymentMethodSelect('transfer');
                          }}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#00D54B] flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-sm font-medium">Virement</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('[Payment] Back clicked');
                      setSelectedEvent(null);
                      setSelectedParticipant(null);
                      setPaymentAmount('');
                      setPaymentMethod('card');
                      setShowAddCard(false);
                      setNewCard({
                        number: '',
                        expiryMonth: '',
                        expiryYear: '',
                        cvv: '',
                        name: ''
                      });
                    }}
                    className="gap-2 neon-border"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                  </Button>
                  {paymentMethod === 'card' && (
                    <Button
                      onClick={handlePaymentSubmit}
                      disabled={!selectedParticipant || !paymentAmount || parseFloat(paymentAmount) <= 0 || !selectedCard}
                      className="flex-1 gap-2 button-glow"
                    >
                      <CreditCard className="w-4 h-4" />
                      Enregistrer le paiement
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
