import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaymentMethods } from '@/components/PaymentMethods';
import { useToast } from '@/hooks/use-toast';
import { useEventStore } from '@/store/eventStore';
import {
  AlertCircle,
  Check,
  Clock,
  Receipt,
  UserCheck,
  Users,
  Euro,
  History,
  CheckCircle2,
  Timer,
  AlertTriangle
} from 'lucide-react';



export function PaymentValidation({ eventId, participantId, onComplete }) {
  const { toast } = useToast();
  const event = useEventStore((state) => state.events.find(e => e.id === eventId));
  const updateParticipant = useEventStore((state) => state.updateParticipant);
  const [validations, setValidations] = useState>(new Set());
  const [validationLogs, setValidationLogs] = useState([]);
  const [autoValidationTimer, setAutoValidationTimer] = useState(null);

  useEffect(() => {
    // Nettoyage du timer à la destruction du composant
    return () => {
      if (autoValidationTimer) {
        clearTimeout(autoValidationTimer);
      }
    };
  }, [autoValidationTimer]);

  if (!event) return null;

  const participant = event.participants.find(p => p.id === participantId);
  if (!participant) return null;

  const otherParticipants = event.participants.filter(p => p.id !== participantId);
  const validationProgress = (validations.size / otherParticipants.length) * 100;
  const isFullyValidated = validations.size === otherParticipants.length;

  const handleValidation = (validatorId, validatorName) => {
    const newValidations = new Set(validations);
    const action = newValidations.has(validatorId) ? 'unvalidate' : 'validate';

    if (action === 'validate') {
      newValidations.add(validatorId);
    } else {
      newValidations.delete(validatorId);
    }

    setValidations(newValidations);

    // Ajout du log de validation
    setValidationLogs(prev => [
      {
        timestamp Date(),
        participantId,
        participantName,
        action
      },
      ...prev
    ]);

    // Notification aux autres participants
    otherParticipants
      .filter(p => p.id !== validatorId)
      .forEach(p => {
        toast({
          title: `${validatorName} a ${action === 'validate' ? 'validé' : 'retiré sa validation'}`,
          description: `${newValidations.size} validation(s) sur ${otherParticipants.length} requises`
        });
      });

    // Vérification de la validation complète
    if (newValidations.size === otherParticipants.length) {
      handleFullValidation();
    }
  };

  const handleFullValidation = () => {
    // Mise à jour du statut du participant
    updateParticipant(eventId, participantId, {
      hasValidatedAmount,
      validationDate Date(),
      validatedBy.from(validations)
    });

    toast({
      title: "Paiement validé !",
      description: "Toutes les validations ont été reçues.",
      duration
    });

    // Notification de validation complète
    otherParticipants.forEach(p => {
      toast({
        title: "Validation terminée",
        description: `Le paiement de ${participant.name} a été validé par tous les participants.`
      });
    });

    onComplete?.();
  };

  const startAutoValidationTimer = () => {
    if (autoValidationTimer) return;

    const timer = window.setTimeout(() => {
      const remainingParticipants = otherParticipants.filter(p => !validations.has(p.id));
      
      if (remainingParticipants.length > 0) {
        toast({
          variant: "destructive",
          title: "Rappel de validation",
          description: `${remainingParticipants.length} participant(s) n'ont pas encore validé.`
        });

        // Envoi de notifications aux participants restants
        remainingParticipants.forEach(p => {
          toast({
            title: "Action requise",
            description: `${p.name}, votre validation est attendue pour le paiement de ${participant.name}.`
          });
        });
      }
    }, 24 * 60 * 60 * 1000); // 24 heures

    setAutoValidationTimer(timer);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 neon-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Validation du paiement</h3>
            <p className="text-sm text-muted-foreground">
              Code événement : <span className="font-mono">{event.code}</span>
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Clock className="w-4 h-4" />
            {event.deadline} jours restants
          </Badge>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-5 h-5 text-primary" />
              <h4 className="font-medium">État du paiement</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">
                  {(event.amount / event.participants.length).toFixed(2)}€
                </p>
                <p className="text-sm text-muted-foreground">
                  Montant individuel
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {validationProgress.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Validations reçues
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Validations requises</h4>
              </div>
              <Badge variant="outline" className="gap-2">
                {validations.size}/{otherParticipants.length}
              </Badge>
            </div>

            <Progress value={validationProgress} className="h-2" />

            <ScrollArea className="h-[300px] rounded-lg border border-border">
              <div className="p-4 space-y-2">
                {otherParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-lg neon-border"
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
                      onClick={() => handleValidation(p.id, p.name)}
                    >
                      {validations.has(p.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Validé
                        </>
                      ) : (
                        <>
                          <Timer className="w-4 h-4" />
                          En attente
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Historique des validations</h4>
              </div>
            </div>

            <ScrollArea className="h-[200px] rounded-lg border border-border">
              <div className="p-4 space-y-2">
                {validationLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {log.action === 'validate' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-medium">{log.participantName}</span>
                      <span className="text-muted-foreground">
                        a {log.action === 'validate' ? 'validé' : 'retiré sa validation'}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {!isFullyValidated && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm font-medium">
                  En attente de validation par les autres participants
                </p>
              </div>
            </div>
          )}

          {isFullyValidated && (
            <div className="flex justify-end">
              <Button
                className="gap-2 button-glow"
                onClick={handleFullValidation}
              >
                <Check className="w-4 h-4" />
                Confirmer le paiement
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}