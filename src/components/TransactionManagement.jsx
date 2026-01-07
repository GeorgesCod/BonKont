import { useState } from 'react';
import { useTransactionsStore } from '@/store/transactionsStore';
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
  Camera,
  Upload,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TesseractTest } from '@/components/TesseractTest';
import { useEventStore } from '@/store/eventStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TransactionManagement({ eventId, onBack }) {
  console.log('[TransactionManagement] Component mounted:', { eventId });
  
  const event = useEventStore((state) => state.events.find(e => e.id === eventId));
  const transactions = useTransactionsStore((state) => state.getTransactionsByEvent(eventId));
  const addTransaction = useTransactionsStore((state) => state.addTransaction);
  const updateTransaction = useTransactionsStore((state) => state.updateTransaction);
  const deleteTransaction = useTransactionsStore((state) => state.deleteTransaction);

  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    store: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    amount: '',
    currency: 'EUR',
    participants: []
  });
  const [scanMode, setScanMode] = useState('manual'); // 'manual' or 'scan'
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

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
    transactionsCount: transactions.length
  });

  const participants = Array.isArray(event.participants) ? event.participants : [];

  const handleAddTransaction = () => {
    console.log('[TransactionManagement] Opening add transaction form');
    setIsAdding(true);
    setFormData({
      store: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      amount: '',
      currency: 'EUR',
      participants: []
    });
  };

  const handleEditTransaction = (transaction) => {
    console.log('[TransactionManagement] Opening edit transaction form:', transaction);
    setEditingTransaction(transaction);
    setFormData({
      store: transaction.store || '',
      date: transaction.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      time: transaction.time || format(new Date(), 'HH:mm'),
      amount: transaction.amount?.toString() || '',
      currency: transaction.currency || 'EUR',
      participants: transaction.participants || []
    });
  };

  const handleSaveTransaction = () => {
    console.log('[TransactionManagement] Saving transaction:', formData);
    
    if (!formData.store || !formData.store.trim()) {
      console.error('[TransactionManagement] Validation failed: store name is required');
      alert('Veuillez remplir le nom de l\'enseigne');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      console.error('[TransactionManagement] Validation failed: amount is required');
      alert('Veuillez remplir un montant valide');
      return;
    }
    
    if (formData.participants.length === 0) {
      console.error('[TransactionManagement] Validation failed: at least one participant is required');
      alert('Veuillez sélectionner au moins un participant');
      return;
    }

    const transactionData = {
      store: formData.store,
      date: new Date(formData.date),
      time: formData.time,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      participants: formData.participants
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData);
      console.log('[TransactionManagement] Transaction updated:', editingTransaction.id);
    } else {
      addTransaction(eventId, transactionData);
      console.log('[TransactionManagement] Transaction added');
    }

    setIsAdding(false);
    setEditingTransaction(null);
    setFormData({
      store: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      amount: '',
      currency: 'EUR',
      participants: []
    });
  };

  const handleDeleteTransaction = (transactionId) => {
    console.log('[TransactionManagement] Deleting transaction:', transactionId);
    if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      deleteTransaction(transactionId);
    }
  };

  const toggleParticipant = (participantId) => {
    console.log('[TransactionManagement] Toggling participant:', participantId);
    setFormData(prev => {
      const participants = prev.participants.includes(participantId)
        ? prev.participants.filter(id => id !== participantId)
        : [...prev.participants, participantId];
      return { ...prev, participants };
    });
  };

  const getCurrencyIcon = (currency) => {
    switch (currency) {
      case 'EUR': return <Euro className="w-4 h-4" />;
      case 'USD': return <DollarSign className="w-4 h-4" />;
      case 'GBP': return <PoundSterling className="w-4 h-4" />;
      default: return <Euro className="w-4 h-4" />;
    }
  };

  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      default: return '€';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="neon-border">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Gestion des transactions</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
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
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
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
                        const participant = participants.find(p => p.id === pId);
                        return participant ? (
                          <Badge key={pId} variant="outline" className="text-xs">
                            {participant.name}
                          </Badge>
                        ) : null;
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

      {/* Dialog pour ajouter/modifier une transaction */}
      <Dialog open={isAdding || editingTransaction !== null} onOpenChange={(open) => {
        if (!open) {
          setIsAdding(false);
          setEditingTransaction(null);
          setScanMode('manual');
          setIsScanning(false);
          setScanResult(null);
          setFormData({
            store: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm'),
            amount: '',
            currency: 'EUR',
            participants: []
          });
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={scanMode} onValueChange={(value) => {
            console.log('[TransactionManagement] Scan mode changed:', value);
            setScanMode(value);
          }} className="w-full">
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

            <TabsContent value="scan" className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-primary/5">
                <p className="text-sm text-muted-foreground mb-4">
                  Scannez votre ticket de caisse pour remplir automatiquement les informations
                </p>
                <TesseractTest
                  onDataExtracted={(extractedData) => {
                    console.log('[TransactionManagement] Data extracted from scan:', extractedData);
                    setScanResult(extractedData);
                    
                    // Remplir automatiquement le formulaire
                    if (extractedData) {
                      const newFormData = { ...formData };
                      
                      if (extractedData.enseigne && extractedData.enseigne !== 'Magasin inconnu') {
                        newFormData.store = extractedData.enseigne;
                        console.log('[TransactionManagement] Store filled:', extractedData.enseigne);
                      }
                      
                      if (extractedData.date) {
                        try {
                          // Convertir la date au format YYYY-MM-DD
                          const dateParts = extractedData.date.split('/');
                          if (dateParts.length === 3) {
                            const day = dateParts[0].padStart(2, '0');
                            const month = dateParts[1].padStart(2, '0');
                            const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
                            newFormData.date = `${year}-${month}-${day}`;
                            console.log('[TransactionManagement] Date filled:', newFormData.date);
                          }
                        } catch (e) {
                          console.error('[TransactionManagement] Date parsing error:', e);
                        }
                      }
                      
                      if (extractedData.heure) {
                        newFormData.time = extractedData.heure;
                        console.log('[TransactionManagement] Time filled:', extractedData.heure);
                      }
                      
                      if (extractedData.total) {
                        newFormData.amount = extractedData.total.toString();
                        console.log('[TransactionManagement] Amount filled:', extractedData.total);
                      }
                      
                      if (extractedData.devise) {
                        // Convertir le symbole en code devise
                        if (extractedData.devise === '€' || extractedData.devise === 'EUR') {
                          newFormData.currency = 'EUR';
                        } else if (extractedData.devise === '$' || extractedData.devise === 'USD') {
                          newFormData.currency = 'USD';
                        } else if (extractedData.devise === '£' || extractedData.devise === 'GBP') {
                          newFormData.currency = 'GBP';
                        }
                        console.log('[TransactionManagement] Currency filled:', newFormData.currency);
                      }
                      
                      setFormData(newFormData);
                      setScanMode('manual'); // Passer à l'onglet manuel pour compléter
                      console.log('[TransactionManagement] Form filled from scan, switching to manual mode');
                    }
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
            <div>
              <Label htmlFor="store">Enseigne / Magasin</Label>
              <Input
                id="store"
                value={formData.store}
                onChange={(e) => {
                  setFormData({ ...formData, store: e.target.value });
                  console.log('[TransactionManagement] Store changed:', e.target.value);
                }}
                placeholder="Nom de l'enseigne"
                className="neon-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    console.log('[TransactionManagement] Date changed:', e.target.value);
                  }}
                  className="neon-border"
                />
              </div>
              <div>
                <Label htmlFor="time">Heure</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => {
                    setFormData({ ...formData, time: e.target.value });
                    console.log('[TransactionManagement] Time changed:', e.target.value);
                  }}
                  className="neon-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Montant</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value });
                    console.log('[TransactionManagement] Amount changed:', e.target.value);
                  }}
                  placeholder="0.00"
                  className="neon-border"
                />
              </div>
              <div>
                <Label htmlFor="currency">Devise</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => {
                    setFormData({ ...formData, currency: value });
                    console.log('[TransactionManagement] Currency changed:', value);
                  }}
                >
                  <SelectTrigger className="neon-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Participants concernés</Label>
              <ScrollArea className="h-48 rounded-lg border border-border p-4">
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-primary/5 cursor-pointer"
                      onClick={() => toggleParticipant(participant.id)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.participants.includes(participant.id)}
                        onChange={() => toggleParticipant(participant.id)}
                        className="w-4 h-4"
                      />
                      <Label className="cursor-pointer flex-1">
                        {participant.name} ({participant.email})
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTransaction(null);
                  setScanMode('manual');
                  setIsScanning(false);
                  setScanResult(null);
                  setFormData({
                    store: '',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    time: format(new Date(), 'HH:mm'),
                    amount: '',
                    currency: 'EUR',
                    participants: []
                  });
                }}
                className="gap-2 flex-1"
              >
                <X className="w-4 h-4" />
                Annuler
              </Button>
              <Button
                onClick={handleSaveTransaction}
                className="gap-2 flex-1 button-glow"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </Button>
            </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

