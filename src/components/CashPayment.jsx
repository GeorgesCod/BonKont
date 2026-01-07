import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useEventStore } from '@/store/eventStore';
import { AlertCircle, Check, Euro, Receipt, UserCheck, Users, Calculator, AlertTriangle } from 'lucide-react';


export function CashPayment({ eventId, participantId, amount, onValidated }) {
  const { toast } = useToast();
  const event = useEventStore((state) => state.events.find(e => e.id === eventId));
  const updateParticipant = useEventStore((state) => state.updateParticipant);
  const updateEvent = useEventStore((state) => state.updateEvent);
  
  const [declaredAmount, setDeclaredAmount] = useState(amount.toString());
  const [validations, setValidations] = useState(new Set());

  if (!event) return null;

  const participant = event.participants.find(p => p.id === participantId);
  if (!participant) return null;

  const otherParticipants = event.participants.filter(p => p.id !== participantId);
  const paidAmount = parseFloat(declaredAmount);
  const validationProgress = (validations.size / otherParticipants.length) * 100;
  const isValidated = validationProgress >= 100;

  // Calcul des nouvelles contributions après règlement partiel
  const calculateNewContributions = (paidAmount) => {
    const totalAmount = event.amount;
    const remainingAmount = totalAmount - paidAmount;
    const remainingParticipants = event.participants.filter(p => !p.hasPaid).length;
    
    // Calcul du nouveau montant individuel pour les participants restants
    const newIndividualAmount = remainingParticipants > 0 
      ? Number((remainingAmount / remainingParticipants).toFixed(2))
      : 0;
    
    const remainingTotal = Math.max(0, remainingAmount);
    const paymentPercentage = (paidAmount / amount) * 100;
    
    return {
      paidAmount,
      newIndividualAmount,
      remainingTotal,
      paymentPercentage
    };
  };

  const handleValidate = (validatorId) => {
    const newValidations = new Set(validations);
    if (newValidations.has(validatorId)) {
      newValidations.delete(validatorId);
    } else {
      newValidations.add(validatorId);
    }
    setValidations(newValidations);

    // Si tous les participants ont validé
    if (newValidations.size >= otherParticipants.length) {
      processPayment();
    }
  };

  const processPayment = () => {
    const { newIndividualAmount, remainingTotal, paymentPercentage } = calculateNewContributions(paidAmount);
    const totalDue = event.amount / event.participants.length;
    const alreadyPaid = participant.paidAmount || 0;
    const isFullyPaid = (alreadyPaid + paidAmount) >= totalDue - 0.01;

    console.log('[CashPayment] Processing payment:', {
      participantId,
      paidAmount,
      alreadyPaid,
      totalDue,
      isFullyPaid,
      newIndividualAmount,
      remainingTotal,
      paymentPercentage
    });

    // Mise à jour du participant qui paie
    updateParticipant(eventId, participantId, {
      hasPaid: isFullyPaid,
      paidAmount: alreadyPaid + paidAmount,
      paidDate: new Date(),
      paymentPercentage
    });

    // Mise à jour des montants pour les autres participants
    event.participants
      .filter(p => !p.hasPaid && p.id !== participantId)
      .forEach(p => {
        const pTotalDue = event.amount / event.participants.length;
        const pAlreadyPaid = p.paidAmount || 0;
        const pAmountDue = Math.max(0, pTotalDue - pAlreadyPaid);
        
        updateParticipant(eventId, p.id, {
          amountDue: pAmountDue
        });
      });

    // Mise à jour du montant total restant de l'événement
    const currentTotalPaid = event.totalPaid || 0;
    const newTotalPaid = currentTotalPaid + paidAmount;
    const eventRemainingAmount = Math.max(0, event.amount - newTotalPaid);
    
    updateEvent(eventId, {
      totalPaid: newTotalPaid,
      remainingAmount: eventRemainingAmount,
      lastPaymentPercentage: paymentPercentage,
      status: newTotalPaid >= event.amount - 0.01 ? 'completed' : 'active'
    });

    console.log('[CashPayment] Payment processed successfully');

    toast({
      title: "Paiement validé !",
      description: `Le paiement de ${paidAmount}€ (${paymentPercentage.toFixed(1)}%) a été enregistré. Les contributions restantes ont été ajustées à ${newIndividualAmount}€ par personne.`
    });

    onValidated();
  };

  const handleAmountChange = (value) => {
    setDeclaredAmount(value);
    const paidAmount = parseFloat(value);
    if (!isNaN(paidAmount)) {
      const { newIndividualAmount, paymentPercentage } = calculateNewContributions(paidAmount);
      toast({
        title: "Simulation de répartition",
        description: `Montant : ${paymentPercentage.toFixed(1)}% du total. Chaque participant restant devra ${newIndividualAmount}€`
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg neon-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Paiement en espèces</h3>
          </div>
          <div className="text-sm font-medium">
            Code événement : <span className="text-primary">{event.code}</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Montant total de l'événement</span>
            <span className="text-lg font-bold">{event.amount}€</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Déjà payé</span>
            <span>{event.totalPaid}€</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Reste à payer</span>
            <span>{(event.amount - event.totalPaid).toFixed(2)}€</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Montant versé</Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              value={declaredAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="pl-10 neon-border"
              disabled={isValidated}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span>Part individuelle : {(event.amount / event.participants.length).toFixed(2)}€</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                Validation des participants ({validations.size}/{otherParticipants.length} requis)
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {validationProgress.toFixed(0)}%
            </span>
          </div>
          <Progress value={validationProgress} className="h-2" />
        </div>

        {!isValidated && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">
                Validation requise de tous les participants
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {otherParticipants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 rounded-lg neon-border"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`gap-2 ${
                  validations.has(p.id)
                    ? 'bg-green-500/20 text-green-500 border-green-500/50'
                    : ''
                }`}
                onClick={() => handleValidate(p.id)}
                disabled={isValidated}
              >
                {validations.has(p.id) ? (
                  <>
                    <Check className="w-4 h-4" />
                    Validé
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Valider
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}