 import { useEffect, useState } from 'react';
import { useEventTransactions } from '@/hooks/useEventTransactions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Receipt,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Store,
  Euro,
  DollarSign,
  PoundSterling,
  Save,
  X,
  Scan,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TesseractTest } from '@/components/TesseractTest';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { POT_ID, getContributionToPot } from '@/utils/bonkontBalances';
import {
  updateParticipantInFirestore,
  updateEventInFirestore,
  addTransactionToFirestore,
  updateTransactionInFirestore,
  deleteTransactionInFirestore,
} from '@/services/api';

export function TransactionManagement({ eventId, onBack }) {
  const { toast } = useToast();
  const event = useEventStore((state) =>
    state.events.find((e) => e.id === eventId || (e.firestoreId && String(e.firestoreId) === String(eventId)))
  );
  const { transactions, effectiveEventId } = useEventTransactions(event);
  const updateParticipant = useEventStore((state) => state.updateParticipant);
  const updateEvent = useEventStore((state) => state.updateEvent);

  // Données scannées (retour EventDashboard)
  const [scannedData, setScannedData] = useState(null);

  // Payeur (ticket scanné)
  const [selectedPayerId, setSelectedPayerId] = useState('');

  // Validations tiers (ticket scanné)
  const [validations, setValidations] = useState(new Set());

  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [formData, setFormData] = useState({
    store: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    amount: '',
    currency: 'EUR',
    participants: [],
  });

  const [scanMode, setScanMode] = useState('manual'); // 'manual' | 'scan'
  const [scanResult, setScanResult] = useState(null);
  // Saisie manuelle : dépense/achat vs contribution à la cagnotte espèces
  const [manualEntryKind, setManualEntryKind] = useState('expense'); // 'expense' | 'contribution'

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Vérifier les données scannées au montage
  useEffect(() => {
    const storedEventId = localStorage.getItem('bonkont_scanner_eventId');
    const storedScannedData = localStorage.getItem('bonkont_scanned_data');

    if (storedEventId === eventId && storedScannedData) {
      try {
        const parsed = JSON.parse(storedScannedData);
        console.log('[TransactionManagement] Found scanned data from EventDashboard:', parsed);

        setScannedData(parsed);
        setManualEntryKind(parsed.transactionKind === 'contribution' ? 'contribution' : 'expense');

        setFormData({
          store: parsed.store || '',
          date: parsed.date || format(new Date(), 'yyyy-MM-dd'),
          time: parsed.time || format(new Date(), 'HH:mm'),
          amount: parsed.amount || '',
          currency: parsed.currency || 'EUR',
          participants: [],
        });

        // Ouvrir automatiquement le formulaire
        setIsAdding(true);

        // Nettoyer le localStorage
        localStorage.removeItem('bonkont_scanner_eventId');
        localStorage.removeItem('bonkont_scanned_data');

        toast({
          title: '✅ Données scannées chargées',
          description: 'Les données du ticket scanné ont été pré-remplies. Choisissez le payeur et validez.',
        });
      } catch (e) {
        console.error('[TransactionManagement] Error parsing scanned data:', e);
      }
    }
  }, [eventId, toast]);

  if (!event) {
    console.error('[TransactionManagement] Event not found:', eventId);
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

  console.log('[TransactionManagement] Event and transactions loaded:', {
    eventId,
    eventTitle: event.title,
    transactionsCount: transactions.length,
  });

  const participants = (Array.isArray(event.participants) ? event.participants : []).map((p) => ({
    ...p,
    id: String(p.id),
  }));

  const currentParticipantId = (() => {
    try {
      const userData = typeof window !== 'undefined' ? localStorage.getItem('bonkont-user') : null;
      if (!userData) return null;
      const user = JSON.parse(userData);
      const email = (user?.email || '').toLowerCase();
      const id = user?.id;
      const match = participants.find(
        (p) => (p.email || '').toLowerCase() === email || String(p.id) === String(id)
      );
      return match ? String(match.id) : null;
    } catch {
      return null;
    }
  })();

  const isOrganizer = (() => {
    try {
      const userData = typeof window !== 'undefined' ? localStorage.getItem('bonkont-user') : null;
      if (!userData || !event?.organizerId) return false;
      const user = JSON.parse(userData);
      const email = (user?.email || '').toLowerCase().trim();
      const orgId = String(event.organizerId || '').toLowerCase().trim();
      return orgId && (email === orgId || String(user?.id) === orgId);
    } catch {
      return false;
    }
  })();

  const handleAddTransaction = () => {
    console.log('[TransactionManagement] Opening add transaction form');
    setIsAdding(true);
    setScannedData(null);
    setSelectedPayerId('');
    setValidations(new Set());
    setScanResult(null);
    setScanMode('manual');
    setFormData({
      store: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      amount: '',
      currency: 'EUR',
      participants: [],
    });
  };

  const handleToggleValidation = (e, transaction, participantId, participantName, validatedForSomeoneElse = false) => {
    e.stopPropagation();
    const validatedBy = transaction.validatedBy || [];
    const idStr = String(participantId);
    const hasValidated = validatedBy.map(String).includes(idStr);
    const newValidatedBy = hasValidated
      ? validatedBy.filter((id) => String(id) !== idStr)
      : [...validatedBy.map(String), idStr];
    updateTransaction(transaction.id, { validatedBy: newValidatedBy });
    if (validatedForSomeoneElse) {
      toast({
        title: hasValidated ? 'Validation retirée' : '✅ Je valide (organisateur)',
        description: hasValidated
          ? `Validation retirée pour ${participantName}.`
          : `Validation enregistrée pour ${participantName}. Rappel : « Tu n'as pas validé cette transaction. Je valide. »`,
      });
    } else {
      toast({
        title: hasValidated ? 'Validation retirée' : '✅ Je valide',
        description: hasValidated
          ? 'Vous avez retiré votre validation.'
          : 'Votre validation a été enregistrée (règle BONKONT).',
      });
    }
  };

  const handleEditTransaction = (transaction) => {
    console.log('[TransactionManagement] Opening edit transaction form:', transaction);
    setEditingTransaction(transaction);
    setScannedData(null);
    setSelectedPayerId('');
    setValidations(new Set());
    setScanResult(null);
    setScanMode('manual');

    setFormData({
      store: transaction.store || '',
      date: transaction.date
        ? format(new Date(transaction.date), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      time: transaction.time || format(new Date(), 'HH:mm'),
      amount: transaction.amount?.toString() || '',
      currency: transaction.currency || 'EUR',
      participants: transaction.participants || [],
    });
  };

  const toggleParticipant = (participantId) => {
    console.log('[TransactionManagement] Toggling participant:', participantId);
    setFormData((prev) => {
      const next = prev.participants.includes(participantId)
        ? prev.participants.filter((id) => id !== participantId)
        : [...prev.participants, participantId];
      return { ...prev, participants: next };
    });
  };

  const getCurrencyIcon = (currency) => {
    switch (currency) {
      case 'EUR':
        return <Euro className="w-4 h-4" />;
      case 'USD':
        return <DollarSign className="w-4 h-4" />;
      case 'GBP':
        return <PoundSterling className="w-4 h-4" />;
      default:
        return <Euro className="w-4 h-4" />;
    }
  };

  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'EUR':
        return '€';
      case 'USD':
        return '$';
      case 'GBP':
        return '£';
      default:
        return '€';
    }
  };

  const asString = (v) => String(v ?? '');

  // Enregistrement possible : flux scanné/contribution → payeur/contributeur + validation collective ; sinon → dépense manuelle (store, montant, participants)
  const isContributionFlow =
    manualEntryKind === 'contribution' || (scannedData && scannedData.transactionKind === 'contribution');
  const needsCollectiveValidationToSave = scannedData || isContributionFlow;
  const canSaveScanned = needsCollectiveValidationToSave
    ? selectedPayerId &&
      formData.amount &&
      parseFloat(formData.amount) > 0 &&
      validations.size >= Math.max(0, participants.length - 1)
    : formData.store?.trim() &&
      formData.amount &&
      parseFloat(formData.amount) > 0 &&
      formData.participants.length > 0;

  const handleSaveTransaction = () => {
    console.log('[TransactionManagement] Saving transaction:', formData);

    const isContribution = manualEntryKind === 'contribution' || (scannedData && scannedData.transactionKind === 'contribution');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        variant: 'destructive',
        title: '⚠️ Montant invalide',
        description: 'Veuillez saisir un montant supérieur à 0.',
      });
      return;
    }

    if (isContribution) {
      if (!selectedPayerId) {
        toast({
          variant: 'destructive',
          title: '⚠️ Champ requis',
          description: 'Veuillez sélectionner qui verse dans la cagnotte.',
        });
        return;
      }
    } else {
      if (!formData.store || !formData.store.trim()) {
        toast({
          variant: 'destructive',
          title: '⚠️ Champ requis',
          description: "Veuillez remplir le nom de l'enseigne ou du magasin pour continuer.",
        });
        return;
      }
      if (formData.participants.length === 0) {
        toast({
          variant: 'destructive',
          title: '⚠️ Participants requis',
          description: 'Veuillez sélectionner au moins un participant concerné par cette transaction.',
        });
        return;
      }
    }

    // Règle BONKONT : validation collective (dépense scannée ou contribution au pot)
    const needsCollectiveValidation = (scannedData && selectedPayerId) || (isContribution && selectedPayerId);
    if (needsCollectiveValidation && participants.length > 1 && validations.size < participants.length - 1) {
      toast({
        variant: 'destructive',
        title: '⚠️ Validation collective incomplète',
        description: isContribution
          ? `Chacun doit valider la contribution au pot (${validations.size}/${participants.length - 1}).`
          : `Tous les autres participants doivent valider (${validations.size}/${participants.length - 1}).`,
      });
      return;
    }

    const transactionData = {
      store: isContribution ? (formData.store.trim() || 'Contribution espèces') : formData.store.trim(),
      date: new Date(formData.date),
      time: formData.time,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      participants: isContribution ? [] : formData.participants,
    };

    // RÈGLE BONKONT : validatedBy détermine qui est concerné (validation collective)
    if (editingTransaction) {
      transactionData.validatedBy = editingTransaction.validatedBy ?? formData.participants;
      if (editingTransaction.payerId != null) transactionData.payerId = editingTransaction.payerId;
      if (editingTransaction.source != null) transactionData.source = editingTransaction.source;
    } else if (isContribution) {
      transactionData.type = 'CONTRIBUTION';
      transactionData.source = 'manual';
      transactionData.fromId = selectedPayerId;
      transactionData.toId = POT_ID;
      transactionData.validatedBy = [selectedPayerId, ...Array.from(validations)];
    } else if (scannedData && selectedPayerId) {
      transactionData.payerId = selectedPayerId;
      transactionData.source = 'scanned_ticket';
      transactionData.validatedBy = [selectedPayerId, ...Array.from(validations)];
    } else if (formData.participants.length > 0) {
      transactionData.validatedBy = formData.participants;
    }

    const participantNames = formData.participants
      .map((pId) => participants.find((p) => p.id === pId)?.name)
      .filter(Boolean)
      .join(', ');

    if (editingTransaction) {
      if (effectiveEventId) {
        updateTransactionInFirestore(effectiveEventId, editingTransaction.id, transactionData).catch((err) => {
          console.error('[TransactionManagement] updateTransactionInFirestore:', err);
          toast({ title: 'Erreur', description: 'Impossible de mettre à jour la transaction.', variant: 'destructive' });
        });
      }

      toast({
        title: '✅ Transaction modifiée avec succès',
        description: `La transaction "${transactionData.store}" d'un montant de ${transactionData.amount.toFixed(
          2
        )}${getCurrencySymbol(transactionData.currency)} a été mise à jour.`,
      });
    } else {
      if (effectiveEventId) {
        addTransactionToFirestore(effectiveEventId, transactionData).catch((err) => {
          console.error('[TransactionManagement] addTransactionToFirestore:', err);
          toast({ title: 'Erreur', description: 'Impossible d\'enregistrer la transaction.', variant: 'destructive' });
        });
      }

      // si scanné ou contribution cagnotte : créditer payeur/contributeur + update event
      const shouldCreditPayer = (scannedData && selectedPayerId) || (isContribution && selectedPayerId);
      if (shouldCreditPayer) {
        const payer = participants.find((p) => p.id === selectedPayerId);
        if (payer) {
          const totalDue = event.amount / Math.max(1, participants.length);
          const alreadyPaid = payer.paidAmount || 0;
          const newPaidAmount = alreadyPaid + transactionData.amount;
          const isFullyPaid = newPaidAmount >= totalDue - 0.01;

          const participantUpdates = {
            hasPaid: isFullyPaid,
            paidAmount: newPaidAmount,
            paidDate: new Date(),
            paymentMethod: isContribution ? 'manual' : 'scanned_ticket',
          };
          updateParticipant(eventId, selectedPayerId, participantUpdates);
          updateParticipantInFirestore(effectiveEventId || eventId, selectedPayerId, participantUpdates);

          const currentTotalPaid = event.totalPaid || 0;
          const newTotalPaid = currentTotalPaid + transactionData.amount;
          const eventRemainingAmount = Math.max(0, event.amount - newTotalPaid);
          const eventUpdates = {
            totalPaid: newTotalPaid,
            remainingAmount: eventRemainingAmount,
            status: newTotalPaid >= event.amount - 0.01 ? 'completed' : 'active',
          };
          updateEvent(eventId, eventUpdates);
          updateEventInFirestore(effectiveEventId || eventId, eventUpdates);
        }
      }

      const participantCount = isContribution ? 0 : formData.participants.length;
      const participantText =
        participantCount === 1 ? participantNames : `${participantCount} participants (${participantNames})`;

      toast({
        title: '✅ Transaction enregistrée avec succès',
        description: isContribution
          ? `Contribution "${transactionData.store}" de ${transactionData.amount.toFixed(
              2
            )}${getCurrencySymbol(transactionData.currency)} enregistrée.`
          : scannedData
            ? `Transaction "${transactionData.store}" de ${transactionData.amount.toFixed(
                2
              )}${getCurrencySymbol(transactionData.currency)} enregistrée.`
            : `Transaction "${transactionData.store}" de ${transactionData.amount.toFixed(
                2
              )}${getCurrencySymbol(transactionData.currency)} enregistrée pour ${participantText}.`,
      });
    }

    // reset
    setIsAdding(false);
    setEditingTransaction(null);
    setScanMode('manual');
    setScanResult(null);
    setScannedData(null);
    setSelectedPayerId('');
    setManualEntryKind('expense');
    setValidations(new Set());
    setFormData({
      store: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      amount: '',
      currency: 'EUR',
      participants: [],
    });
  };

  const handleDeleteTransaction = (transactionId) => {
    const transaction = transactions.find((t) => t.id === transactionId);
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = () => {
    if (!transactionToDelete) return;

    if (effectiveEventId) {
      deleteTransactionInFirestore(effectiveEventId, transactionToDelete.id).catch((err) => {
        console.error('[TransactionManagement] deleteTransactionInFirestore:', err);
        toast({ title: 'Erreur', description: 'Impossible de supprimer la transaction.', variant: 'destructive' });
      });
    }

    toast({
      title: '✅ Transaction supprimée',
      description: `La transaction "${transactionToDelete.store || ''}" a été supprimée avec succès.`,
    });

    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const closeDialog = () => {
    console.log('[TransactionManagement] Closing transaction dialog');
    setIsAdding(false);
    setEditingTransaction(null);
    setScanMode('manual');
    setScanResult(null);
    setScannedData(null);
    setSelectedPayerId('');
    setManualEntryKind('expense');
    setValidations(new Set());
    setFormData({
      store: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      amount: '',
      currency: 'EUR',
      participants: [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Bouton retour au tableau de bord */}
      <Button 
        variant="outline" 
        onClick={onBack} 
        className="gap-2 min-h-[44px] w-full sm:w-auto touch-manipulation"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au tableau de bord
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text truncate">
              Gestion des transactions
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">{event.title}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2 flex-shrink-0">
          Code: {event.code}
        </Badge>
      </div>

      {/* Bouton ajouter */}
      <div className="flex justify-end">
        <Button onClick={handleAddTransaction} className="gap-2 button-glow">
          <Plus className="w-4 h-4" />
          Ajouter une transaction
        </Button>
      </div>

      {/* Liste des transactions */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4 pr-4">
          {transactions.length === 0 ? (
            <Card className="p-8 text-center neon-border">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune transaction enregistrée</p>
              <Button onClick={handleAddTransaction} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Ajouter la première transaction
              </Button>
            </Card>
          ) : (
            transactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="p-6 neon-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => handleEditTransaction(transaction)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Store className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-semibold">{transaction.store}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {transaction.date
                            ? format(new Date(transaction.date), 'dd MMM yyyy', { locale: fr })
                            : 'Date non définie'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{transaction.time || 'Heure non définie'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      {getCurrencyIcon(transaction.currency)}
                      <span className="text-2xl font-bold">
                        {transaction.amount?.toFixed(2) || '0.00'}
                        {getCurrencySymbol(transaction.currency)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {transaction.participants?.length || 0} participant(s)
                    </Badge>
                  </div>
                </div>

                {transaction.participants && transaction.participants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Participants:</p>
                    <div className="flex flex-wrap gap-2">
                      {transaction.participants.map((pId) => {
                        const participant = participants.find((p) => p.id === pId);
                        return participant ? (
                          <Badge key={pId} variant="outline" className="text-xs">
                            {participant.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {(transaction.payerId || transaction.type === 'CONTRIBUTION' || transaction.fromId) && participants.length > 0 && (
                  <div
                    className="mt-4 pt-4 border-t border-border rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                      ✍️ Règle BONKONT : chaque participant valide
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Chaque transaction (contribution ou dépense) doit être validée par chaque participant pour éviter tout malentendu. L’organisateur peut valider à la place d’un participant retardataire après rappel.
                    </p>
                    <p className="text-xs text-muted-foreground mb-3 p-2 rounded bg-muted/50 border border-border/50">
                      {transaction.type === 'CONTRIBUTION' || transaction.fromId ? (
                        <><strong>Contribution au pot</strong> = quote-part théorique (plafond contributif à ne pas dépasser, pas obligatoire). Elle devient réelle si le participant verse effectivement (en partie ou en total). La règle BONKONT s’applique pour rester équitable. Je valide = je valide cette contribution.</>
                      ) : (
                        <><strong>Dépense :</strong> Je valide = je suis concerné, je consomme ma part. Je ne valide pas = je ne suis pas concerné, je ne consomme pas.</>
                      )}
                    </p>
                    <div className="space-y-2">
                      {participants.map((p) => {
                        const validatedBy = transaction.validatedBy || [];
                        const hasValidated = validatedBy.map(String).includes(String(p.id));
                        const isCurrentUser = currentParticipantId && String(p.id) === String(currentParticipantId);
                        const canToggle = isCurrentUser || isOrganizer;
                        const validatedForSomeoneElse = isOrganizer && !isCurrentUser;
                        const participantName = p.name || p.email || `Participant`;
                        const isOrganizerParticipant = event?.organizerId && ((p.email || '').toLowerCase().trim() === (event.organizerId || '').toLowerCase().trim() || String(p.id) === String(event.organizerId));
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded border border-border bg-background/50 gap-3"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{participantName}</span>
                              {isOrganizerParticipant && (
                                <Badge variant="secondary" className="text-xs font-medium text-primary border-primary/50">Organisateur</Badge>
                              )}
                            </div>
                            <label
                              className={`flex items-center gap-2 select-none text-sm ${
                                canToggle ? 'cursor-pointer' : 'cursor-default'
                              } ${hasValidated ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
                              onClick={(e) => e.stopPropagation()}
                              title={validatedForSomeoneElse && !hasValidated ? 'Tu n\'as pas validé cette transaction. Je valide (organisateur)' : undefined}
                            >
                              <Checkbox
                                checked={!!hasValidated}
                                disabled={!canToggle}
                                onCheckedChange={() => {
                                  if (canToggle) handleToggleValidation({ stopPropagation: () => {} }, transaction, p.id, participantName, validatedForSomeoneElse);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="border-amber-500/50 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                              <span>
                                {hasValidated
                                  ? (validatedForSomeoneElse ? 'Validé (organisateur)' : 'Validé')
                                  : (validatedForSomeoneElse ? 'Tu n\'as pas validé. Je valide' : 'Je valide')}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTransaction(transaction);
                    }}
                    className="gap-2 flex-1"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTransaction(transaction.id);
                    }}
                    className="gap-2 text-destructive hover:text-destructive flex-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialog ajouter/modifier */}
      <Dialog open={isAdding || editingTransaction !== null} onOpenChange={(open) => (!open ? closeDialog() : null)}>
        {/* IMPORTANT : on évite d’empêcher l’affichage des menus */}
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}</DialogTitle>
            <DialogDescription>
              {editingTransaction ? 'Modifiez les détails de la transaction' : 'Ajoutez une nouvelle transaction à l\'événement'}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={scanMode}
            onValueChange={(value) => {
              console.log('[TransactionManagement] Scan mode changed:', value);
              setScanMode(value);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="gap-2">
                <Receipt className="w-4 h-4" />
                Saisie manuelle
              </TabsTrigger>
              <TabsTrigger value="scan" className="gap-2">
                <Scan className="w-4 h-4" />
                Scanner un ticket
              </TabsTrigger>
            </TabsList>

            {/* SCAN */}
            <TabsContent value="scan" className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-primary/5">
                <p className="text-sm text-muted-foreground mb-4">
                  Scannez votre ticket de caisse pour remplir automatiquement les informations.
                </p>

                {scanResult ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/10">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <h4 className="font-semibold text-green-500">Données extraites avec succès</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {scanResult.enseigne && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Enseigne:</span>
                            <span className="font-medium">{scanResult.enseigne}</span>
                          </div>
                        )}
                        {scanResult.date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{scanResult.date}</span>
                          </div>
                        )}
                        {scanResult.heure && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Heure:</span>
                            <span className="font-medium">{scanResult.heure}</span>
                          </div>
                        )}
                        {scanResult.total && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Montant:</span>
                            <span className="font-medium">
                              {scanResult.total}
                              {scanResult.devise || '€'}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          if (!scanResult) return;

                          const newFormData = { ...formData };

                          if (scanResult.enseigne && scanResult.enseigne !== 'Magasin inconnu') {
                            newFormData.store = scanResult.enseigne;
                          }

                          if (scanResult.date) {
                            try {
                              const parts = scanResult.date.split('/');
                              if (parts.length === 3) {
                                const day = parts[0].padStart(2, '0');
                                const month = parts[1].padStart(2, '0');
                                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                                newFormData.date = `${year}-${month}-${day}`;
                              }
                            } catch (e) {
                              console.error('[TransactionManagement] Date parsing error:', e);
                            }
                          }

                          if (scanResult.heure) newFormData.time = scanResult.heure;
                          if (scanResult.total) newFormData.amount = scanResult.total.toString();

                          if (scanResult.devise) {
                            if (scanResult.devise === '€' || scanResult.devise === 'EUR') newFormData.currency = 'EUR';
                            else if (scanResult.devise === '$' || scanResult.devise === 'USD')
                              newFormData.currency = 'USD';
                            else if (scanResult.devise === '£' || scanResult.devise === 'GBP')
                              newFormData.currency = 'GBP';
                          }

                          setFormData(newFormData);
                          setScanMode('manual');

                          toast({
                            title: '✅ Données appliquées',
                            description: 'Les données scannées ont été appliquées au formulaire.',
                          });
                        }}
                        className="w-full mt-4 button-glow"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Appliquer les données et compléter
                      </Button>

                      <Button variant="outline" onClick={() => setScanResult(null)} className="w-full mt-2">
                        <Scan className="w-4 h-4 mr-2" />
                        Scanner un autre ticket
                      </Button>
                    </div>
                  </div>
                ) : (
                  <TesseractTest
                    onDataExtracted={(extractedData) => {
                      console.log('[TransactionManagement] Data extracted from scan:', extractedData);
                      if (extractedData) {
                        setScanResult(extractedData);
                        toast({
                          title: '✅ Scan réussi',
                          description: 'Les données ont été extraites. Vérifiez-les avant de les appliquer.',
                        });
                      }
                    }}
                  />
                )}
              </div>
            </TabsContent>

            {/* MANUAL */}
            <TabsContent value="manual" className="space-y-4">
              {!scannedData && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                  <Label>Type de saisie</Label>
                  <RadioGroup
                    value={manualEntryKind}
                    onValueChange={setManualEntryKind}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="expense" />
                      <span className="text-sm">Dépense / achat (répartir entre participants)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="contribution" />
                      <span className="text-sm">Contribution à la cagnotte (espèces)</span>
                    </label>
                  </RadioGroup>
                  {manualEntryKind === 'contribution' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Quote-part théorique (plafond contributif à ne pas dépasser, pas obligatoire). Elle devient réelle si le participant verse effectivement (en partie ou en total). La règle BONKONT s’applique pour rester équitable. Chaque participant devra valider.
                    </p>
                  )}
                </div>
              )}

              {scannedData && scannedData.transactionKind === 'contribution' && (
                <p className="text-sm text-muted-foreground p-2 rounded bg-primary/10 border border-primary/30">
                  Contribution au pot (quote-part théorique, plafond contributif). Choisissez qui verse ci-dessous. Chaque participant devra valider (règle BONKONT). L’organisateur peut valider à la place d’un retardataire après rappel.
                </p>
              )}

              <div>
                <Label htmlFor="store">
                  {manualEntryKind === 'contribution' || (scannedData && scannedData.transactionKind === 'contribution')
                    ? 'Libellé (optionnel)'
                    : 'Enseigne / Magasin'}
                </Label>
                <Input
                  id="store"
                  value={formData.store}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                  placeholder={manualEntryKind === 'contribution' ? 'Ex: Espèces' : "Nom de l'enseigne"}
                  className="neon-border"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="neon-border"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Heure</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="neon-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="amount">Montant</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="neon-border"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Devise</Label>
                   <Select
  value={asString(formData.currency)}
  onValueChange={(value) =>
    setFormData((prev) => ({ ...prev, currency: value }))
  }
>
  <SelectTrigger className="neon-border">
    <SelectValue placeholder="Devise" />
  </SelectTrigger>

  <SelectContent className="bg-popover text-popover-foreground border border-border">
    <SelectItem value="EUR">EUR (€)</SelectItem>
    <SelectItem value="USD">USD ($)</SelectItem>
    <SelectItem value="GBP">GBP (£)</SelectItem>
  </SelectContent>
</Select>
                </div>
              </div>

              {/* ✅ Participants ou contributeur */}
              <div className="space-y-2">
                <Label>
                  {manualEntryKind === 'contribution' || (scannedData && scannedData.transactionKind === 'contribution')
                    ? 'Qui verse dans la cagnotte ?'
                    : scannedData
                      ? 'Participant payeur (un seul)'
                      : 'Participants concernés'}
                </Label>

                {manualEntryKind === 'contribution' || (scannedData && scannedData.transactionKind === 'contribution') ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez le participant qui met de l'argent dans la cagnotte (espèces).
                    </p>
                    <Select
                      value={asString(selectedPayerId)}
                      onValueChange={(value) => {
                        setSelectedPayerId(value);
                        setFormData((prev) => ({ ...prev, participants: [] }));
                      }}
                    >
                      <SelectTrigger className="neon-border">
                        <SelectValue placeholder="-- Qui verse ? --" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground border border-border z-[9999]">
                        <ScrollArea className="h-56">
                          {participants.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground">Aucun participant</div>
                          ) : (
                            participants.map((p, idx) => {
                              const label =
                                p.name?.trim() ||
                                `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() ||
                                p.email?.trim() ||
                                `Participant ${idx + 1}`;
                              return (
                                <SelectItem key={asString(p.id)} value={asString(p.id)} className="cursor-pointer">
                                  {label} {p.email ? `(${p.email})` : ''}
                                </SelectItem>
                              );
                            })
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    {selectedPayerId ? (
                      <div className="text-xs text-green-500 font-semibold">✅ Contributeur sélectionné</div>
                    ) : (
                      <div className="text-xs text-yellow-500">⚠️ Choisissez qui verse pour enregistrer</div>
                    )}
                  </>
                ) : scannedData ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez le participant qui a payé (liste scrollable).
                    </p>

<Select
  value={asString(selectedPayerId)}
  onValueChange={(value) => {
    // value est toujours une string côté Radix
    setSelectedPayerId(value);
    setFormData((prev) => ({ ...prev, participants: value ? [value] : [] }));
  }}
>
  <SelectTrigger className="neon-border">
    <SelectValue placeholder="-- Sélectionner un participant --" />
  </SelectTrigger>

  <SelectContent className="bg-popover text-popover-foreground border border-border z-[9999]">
    <ScrollArea className="h-56">
      {participants.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">Aucun participant</div>
      ) : (
        participants.map((p, idx) => {
          const label =
            p.name?.trim() ||
            `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() ||
            p.email?.trim() ||
            `Participant ${idx + 1}`;

          return (
            <SelectItem
              key={asString(p.id)}
              value={asString(p.id)}
              className="cursor-pointer"
            >
              {label} {p.email ? `(${p.email})` : ''}
            </SelectItem>
          );
        })
      )}
    </ScrollArea>
  </SelectContent>
</Select>


                    {selectedPayerId ? (
                      <div className="text-xs text-green-500 font-semibold">✅ Payeur sélectionné</div>
                    ) : (
                      <div className="text-xs text-yellow-500">⚠️ Choisis le payeur pour pouvoir enregistrer</div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Cochez un ou plusieurs participants (liste scrollable).</p>

                    <ScrollArea className="h-56 rounded-lg border border-border p-3">
                      <div className="space-y-2">
                        {participants.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">Aucun participant</div>
                        ) : (
                          participants.map((participant) => {
                            const isSelected = formData.participants.includes(participant.id);
                            return (
                              <div
                                key={participant.id}
                                className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-primary/5 ${
                                  isSelected ? 'bg-primary/10 border border-primary/50' : ''
                                }`}
                                onClick={() => toggleParticipant(participant.id)}
                              >
                                <input type="checkbox" checked={isSelected} onChange={() => toggleParticipant(participant.id)} />
                                <span className="text-sm">
                                  {participant.name} {participant.email ? `(${participant.email})` : ''}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>

              {/* Validation collective (règle BONKONT) : ticket scanné ou contribution au pot */}
              {(scannedData || manualEntryKind === 'contribution' || scannedData?.transactionKind === 'contribution') &&
                selectedPayerId &&
                formData.amount &&
                participants.length > 1 && (
                <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-yellow-500" />
                      <Label className="text-sm font-medium">
                        Chaque participant valide ({validations.size}/{participants.length - 1} autres + le payeur/contributeur)
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((validations.size / (participants.length - 1)) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 p-2 rounded bg-muted/50">
                    <strong>Règle BONKONT :</strong> Chaque transaction (contribution ou dépense) doit être validée par <strong>chaque participant</strong> pour éviter tout malentendu. L’organisateur peut valider à la place d’un participant retardataire après rappel (« Tu n’as pas validé cette transaction. Je valide »).
                    {(manualEntryKind === 'contribution' || scannedData?.transactionKind === 'contribution') ? (
                      <> La contribution = quote-part théorique (plafond contributif à ne pas dépasser, pas obligatoire). Elle devient réelle si le participant verse effectivement (en partie ou en total). Je valide = je valide cette contribution au pot.</>
                    ) : (
                      <> Je valide = je suis concerné, je consomme ma part. Je ne valide pas = je ne suis pas concerné, je ne consomme pas.</>
                    )}
                  </p>

                  <div className="space-y-2">
                    {participants
                       .filter((p) => String(p.id) !== String(selectedPayerId))

                      .map((participant) => {
                         const isValidated = validations.has(String(participant.id));

                        return (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 rounded border border-border"
                          >
                            <div>
                              <p className="font-medium text-sm">{participant.name}</p>
                              <p className="text-xs text-muted-foreground">{participant.email}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`gap-2 ${
                                isValidated ? 'bg-green-500/20 text-green-500 border-green-500/50' : ''
                              }`}
                               onClick={() => {
  setValidations((prev) => {
    const next = new Set(prev);
    const id = String(participant.id); // ✅ important si ids mixtes
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}}

                            >
                              {isValidated ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Validé
                                </>
                              ) : (
                                <>
                                  <Users className="w-4 h-4" />
                                  Valider
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                  </div>

                  {validations.size === participants.length - 1 && (
                    <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/50">
                      <p className="text-sm text-green-500 font-medium">
                        {(manualEntryKind === 'contribution' || scannedData?.transactionKind === 'contribution')
                          ? '✅ Tous ont validé la contribution au pot. Vous pouvez enregistrer.'
                          : '✅ Tous les participants ont validé. Vous pouvez enregistrer la transaction.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={closeDialog} className="gap-2 flex-1">
                  <X className="w-4 h-4" />
                  Annuler
                </Button>

                <Button
                  onClick={handleSaveTransaction}
                  className="gap-2 flex-1 button-glow"
                  disabled={!canSaveScanned}
                  title={
                    !canSaveScanned
                      ? needsCollectiveValidationToSave
                        ? 'Qui verse + validation collective (règle BONKONT) requis'
                        : 'Enseigne, montant et participants requis'
                      : 'Enregistrer'
                  }
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setTransactionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la transaction "{transactionToDelete?.store || 'cette transaction'}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTransaction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Récapitulatif des paiements — même logique que les Ajustements (transactions = vérité Firestore) */}
      <div className="mt-10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold">Récapitulatif des paiements</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Calcul basé sur les transactions validées (règle BonKont). Même source que les ajustements.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const eventForCalc = { ...event, id: effectiveEventId || event.id };
              const lines = participants.map((p) => {
                const expected = event.amount / Math.max(1, participants.length);
                const paid = getContributionToPot(p.id, eventForCalc, transactions);
                const balance = paid - expected;
                const status = balance >= 0 ? `✅ +${balance.toFixed(2)}€` : `❌ -${Math.abs(balance).toFixed(2)}€`;
                return `👤 ${p.name} (${p.email}) : ${status}`;
              });

              const header = `📊 Bilan de l'événement "${event.title}"\n`;
              const totalLine = `💰 Montant total : ${event.amount.toFixed(2)}€\n👥 Participants : ${participants.length}\n\n`;
              const fullText = header + totalLine + lines.join('\n');

              navigator.clipboard.writeText(fullText).then(() => {
                toast({
                  title: '📋 Récap copié',
                  description: 'Vous pouvez le coller dans WhatsApp, Slack ou autre.',
                });
              });
            }}
          >
            Copier le récap
          </Button>
        </div>

        <Card className="p-6 neon-border">
          <div className="space-y-4">
            {participants.map((participant) => {
              const eventForCalc = { ...event, id: effectiveEventId || event.id };
              const expected = event.amount / Math.max(1, participants.length);
              const paid = getContributionToPot(participant.id, eventForCalc, transactions);
              const balance = paid - expected;
              const hasPaid = paid >= expected - 0.01;

              return (
                <div key={participant.id} className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{participant.name}</span>
                    <span className="text-sm text-muted-foreground">{participant.email}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {balance >= 0 ? `+${balance.toFixed(2)}€` : `-${Math.abs(balance).toFixed(2)}€`}
                    </div>
                    {/* Bouton "Envoyer un rappel" du RÉCAPITULATIF DES PAIEMENTS (pas celui du tableau de bord) */}
                    {!hasPaid && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 text-xs min-h-[44px] sm:min-h-[32px]"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const message = `Rappel BONKONT – ${event.title}\n${participant.name}, merci de vérifier ton solde.`;
                          try {
                            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                              await navigator.clipboard.writeText(message);
                              toast({
                                title: '📋 Message copié',
                                description: `Rappel copié pour ${participant.name}. Collez-le dans WhatsApp ou un message.`,
                              });
                            } else {
                              throw new Error('Clipboard non disponible');
                            }
                          } catch (_err) {
                            toast({
                              title: 'Rappel (copiez le texte ci-dessous)',
                              description: message,
                              variant: 'default',
                              duration: 10000,
                            });
                          }
                        }}
                      >
                        Envoyer un rappel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
