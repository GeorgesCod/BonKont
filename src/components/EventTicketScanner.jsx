import { useState, useEffect } from 'react';
import { TesseractTest } from '@/components/TesseractTest';
import { useEventStore } from '@/store/eventStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Scan, CheckCircle2, X, Euro, User, PenLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function EventTicketScanner({ eventId, participantId, isOpen, onClose, onPaymentProcessed, mode = 'scan' }) {
  const [hasLogged, setHasLogged] = useState(false);

  useEffect(() => {
    if (isOpen && !hasLogged) {
      console.log('[EventTicketScanner] Component mounted/opened:', { eventId, participantId, isOpen });
      setHasLogged(true);
    } else if (!isOpen && hasLogged) {
      setHasLogged(false);
    }
  }, [isOpen, eventId, participantId, hasLogged]);

  const { toast } = useToast();
  const event = useEventStore((state) => state.events.find(e => e.id === eventId));
  const updateParticipant = useEventStore((state) => state.updateParticipant);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const addTransaction = useTransactionsStore((state) => state.addTransaction);

  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [manualEnseigne, setManualEnseigne] = useState('');
  const [manualDate, setManualDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [manualHeure, setManualHeure] = useState(() => format(new Date(), 'HH:mm'));
  const [manualTotal, setManualTotal] = useState('');
  const [manualDevise, setManualDevise] = useState('€');

  useEffect(() => {
    if (!isOpen) {
      setExtractedData(null);
      setIsProcessing(false);
      setManualEnseigne('');
      setManualDate(format(new Date(), 'yyyy-MM-dd'));
      setManualHeure(format(new Date(), 'HH:mm'));
      setManualTotal('');
      setManualDevise('€');
    }
  }, [isOpen]);
  
  // Ne pas rendre le composant si le dialog n'est pas ouvert
  if (!isOpen) {
    return null;
  }

  if (!event) {
    console.error('[EventTicketScanner] Event not found:', eventId);
    return null;
  }

  if (!participantId) {
    return null;
  }

  const participant = event.participants.find(p => p.id === participantId);
  if (!participant) {
    console.error('[EventTicketScanner] Participant not found:', participantId);
    return null;
  }

  const handleDataExtracted = (data) => {
    console.log('[EventTicketScanner] Data extracted from scan:', data);
    setExtractedData(data);
    
    // Si un montant est trouvé, proposer automatiquement le paiement
    if (data && data.total) {
      const amount = parseFloat(data.total);
      if (!isNaN(amount) && amount > 0) {
        console.log('[EventTicketScanner] Amount found in scan:', amount);
        toast({
          title: "Montant détecté",
          description: `Montant scanné: ${amount.toFixed(2)}€. Cliquez sur "Appliquer le paiement" pour enregistrer.`,
        });
      }
    }
  };

  const handleApplyPayment = async () => {
    if (!extractedData || !extractedData.total) {
      console.error('[EventTicketScanner] No amount found in extracted data');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Aucun montant n'a été détecté dans le ticket scanné.",
      });
      return;
    }

    const scannedAmount = parseFloat(extractedData.total);
    if (isNaN(scannedAmount) || scannedAmount <= 0) {
      console.error('[EventTicketScanner] Invalid amount:', extractedData.total);
      toast({
        variant: "destructive",
        title: "Montant invalide",
        description: "Le montant scanné n'est pas valide.",
      });
      return;
    }

    setIsProcessing(true);
    console.log('[EventTicketScanner] Processing payment:', {
      eventId,
      participantId,
      participantName: participant.name,
      scannedAmount,
      extractedData
    });

    try {
      // Calculer les montants
      const totalDue = event.amount / event.participants.length;
      const alreadyPaid = participant.paidAmount || 0;
      const newPaidAmount = alreadyPaid + scannedAmount;
      const isFullyPaid = newPaidAmount >= totalDue - 0.01;

      console.log('[EventTicketScanner] Payment calculation:', {
        totalDue,
        alreadyPaid,
        scannedAmount,
        newPaidAmount,
        isFullyPaid
      });

      // 1. Créer une transaction pour le report
      const transactionData = {
        store: extractedData.enseigne || 'Magasin inconnu',
        date: extractedData.date ? (() => {
          try {
            if (extractedData.date.includes('/')) {
              const [day, month, year] = extractedData.date.split('/');
              return new Date(`${year}-${month}-${day}`);
            }
            return new Date(extractedData.date);
          } catch (e) {
            return new Date();
          }
        })() : new Date(),
        time: extractedData.heure || format(new Date(), 'HH:mm'),
        amount: scannedAmount,
        currency: extractedData.devise === '$' || extractedData.devise === 'USD' ? 'USD' :
                  extractedData.devise === '£' || extractedData.devise === 'GBP' ? 'GBP' : 'EUR',
        participants: event.participants.map((p) => p.id),
        payerId: participantId,
        source: 'scanned_ticket',
        scannedData: extractedData,
        validatedBy: [participantId],
      };
      
      console.log('[EventTicketScanner] ⚠️ CRÉATION TRANSACTION SCANNÉE:', {
        eventId,
        transactionData,
        participantId,
        participantName: participant.name,
        montant: scannedAmount,
        participantsConcernes: transactionData.participants,
        payerId: transactionData.payerId
      });
      
      addTransaction(eventId, transactionData);
      
      console.log('[EventTicketScanner] ✅ Transaction ajoutée au store');

      // 2. Mise à jour du participant
      updateParticipant(eventId, participantId, {
        hasPaid: isFullyPaid,
        paidAmount: newPaidAmount,
        paidDate: new Date(),
        paymentMethod: 'scanned_ticket'
      });

      // 3. Mise à jour de l'événement
      const currentTotalPaid = event.totalPaid || 0;
      const newTotalPaid = currentTotalPaid + scannedAmount;
      const eventRemainingAmount = Math.max(0, event.amount - newTotalPaid);

      updateEvent(eventId, {
        totalPaid: newTotalPaid,
        remainingAmount: eventRemainingAmount,
        status: newTotalPaid >= event.amount - 0.01 ? 'completed' : 'active'
      });

      console.log('[EventTicketScanner] Payment processed successfully:', {
        participant: participant.name,
        amount: scannedAmount,
        newTotalPaid,
        eventStatus: newTotalPaid >= event.amount - 0.01 ? 'completed' : 'active'
      });

      toast({
        title: "✅ Paiement enregistré !",
        description: `Paiement de ${scannedAmount.toFixed(2)}€ scanné et enregistré pour ${participant.name}.`,
      });

      // Réinitialiser et fermer
      setExtractedData(null);
      setIsProcessing(false);
      
      if (onPaymentProcessed) {
        onPaymentProcessed();
      }
      
      onClose();
    } catch (error) {
      console.error('[EventTicketScanner] Error processing payment:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement du paiement.",
      });
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    console.log('[EventTicketScanner] Resetting scanner');
    setExtractedData(null);
  };

  const handleManualSubmit = () => {
    const amount = Number.parseFloat(String(manualTotal).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Montant invalide',
        description: 'Saisissez un montant valide.',
      });
      return;
    }
    const dateStr = manualDate ? (() => {
      try {
        const d = new Date(manualDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return format(new Date(), 'dd/MM/yyyy');
      }
    })() : format(new Date(), 'dd/MM/yyyy');
    handleDataExtracted({
      enseigne: manualEnseigne.trim() || 'Magasin inconnu',
      date: dateStr,
      heure: manualHeure || format(new Date(), 'HH:mm'),
      total: String(amount),
      devise: manualDevise || '€',
    });
  };

  const totalDue = event.amount / event.participants.length;
  const alreadyPaid = participant.paidAmount || 0;
  const remainingDue = Math.max(0, totalDue - alreadyPaid);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'manual' ? <PenLine className="w-5 h-5 text-primary" /> : <Scan className="w-5 h-5 text-primary" />}
            {mode === 'manual' ? 'Saisie manuelle' : `Scanner un ticket pour ${participant.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'manual'
              ? "Saisissez les informations du ticket si le scan ne fonctionne pas."
              : `Scannez le ticket de caisse pour enregistrer automatiquement le paiement de ${participant.name}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{participant.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Montant dû: </span>
                  <span className="font-semibold">{totalDue.toFixed(2)}€</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Déjà payé: </span>
                  <span className="font-semibold text-green-500">{alreadyPaid.toFixed(2)}€</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Reste: </span>
                  <span className="font-semibold text-destructive">{remainingDue.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </Card>

          {mode === 'manual' && !extractedData ? (
            <Card className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="et-manual-enseigne">Enseigne / Magasin</Label>
                  <Input
                    id="et-manual-enseigne"
                    placeholder="Ex: Carrefour"
                    value={manualEnseigne}
                    onChange={(e) => setManualEnseigne(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="et-manual-date">Date</Label>
                  <Input
                    id="et-manual-date"
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="et-manual-heure">Heure</Label>
                  <Input
                    id="et-manual-heure"
                    type="time"
                    value={manualHeure}
                    onChange={(e) => setManualHeure(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="et-manual-total">Montant</Label>
                  <Input
                    id="et-manual-total"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 26,70"
                    value={manualTotal}
                    onChange={(e) => setManualTotal(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="et-manual-devise">Devise</Label>
                  <select
                    id="et-manual-devise"
                    value={manualDevise}
                    onChange={(e) => setManualDevise(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="€">€ (EUR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleManualSubmit} className="w-full sm:w-auto gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Utiliser ces données
              </Button>
            </Card>
          ) : mode === 'scan' ? (
            <div className="space-y-4">
              {isOpen && (
                <TesseractTest
                  key={`scanner-${participantId}-${eventId}`}
                  onDataExtracted={handleDataExtracted}
                  autoOpenCamera={true}
                />
              )}
            </div>
          ) : null}

          {/* Données extraites */}
          {extractedData && (
            <Card className="p-4 border-green-500/50 bg-green-500/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">Données extraites du ticket</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Réinitialiser
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {extractedData.enseigne && (
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Enseigne</p>
                    <p className="font-medium">{extractedData.enseigne}</p>
                  </div>
                )}
                {extractedData.date && (
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="font-medium">{extractedData.date}</p>
                  </div>
                )}
                {extractedData.heure && (
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Heure</p>
                    <p className="font-medium">{extractedData.heure}</p>
                  </div>
                )}
                {extractedData.total && (
                  <div className="p-3 rounded-lg bg-background border-2 border-green-500/50">
                    <p className="text-xs text-muted-foreground mb-1">Montant</p>
                    <p className="font-bold text-lg text-green-500 flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      {parseFloat(extractedData.total).toFixed(2)}
                      {extractedData.devise || '€'}
                    </p>
                  </div>
                )}
              </div>

              {extractedData.total && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleApplyPayment}
                    disabled={isProcessing}
                    className="flex-1 gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Appliquer le paiement de {parseFloat(extractedData.total).toFixed(2)}€
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

