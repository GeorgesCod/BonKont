   import { useEffect, useRef, useState, useMemo } from 'react';
import { TesseractTest } from '@/components/TesseractTest';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Scan,
  CheckCircle2,
  X,
  Euro,
  Store,
  Calendar,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

export function EventDashboardScanner({
  eventId,
  isOpen,
  onClose,
  onPaymentProcessed, // ✅ optionnel (si tu veux déclencher un refresh dans EventDashboard)
}) {
  const { toast } = useToast();

  // ✅ EventId robuste (si jamais prop eventId arrive null)
  const effectiveEventId = useMemo(() => {
    return eventId || localStorage.getItem('bonkont_scanner_eventId') || '';
  }, [eventId]);

  const event = useEventStore((state) =>
    state.events.find((e) => String(e.id) === String(effectiveEventId))
  );

  const [extractedData, setExtractedData] = useState(null);
  const [selectedPayer, setSelectedPayer] = useState(''); // ✅ string
  const payerSectionRef = useRef(null);

  const participants = useMemo(() => {
    return Array.isArray(event?.participants) ? event.participants : [];
  }, [event]);

  // ✅ scroll vers "Choisir le payeur" après extraction
  useEffect(() => {
    if (extractedData && payerSectionRef.current) {
      payerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [extractedData]);

  // ✅ reset auto quand on ferme la modale
  useEffect(() => {
    if (!isOpen) {
      setExtractedData(null);
      setSelectedPayer('');
    }
  }, [isOpen]);

  if (!event) {
    // Ne pas casser l'app si pas d'event (ex: eventId pas encore set)
    if (isOpen) console.error('[EventDashboardScanner] Event not found:', effectiveEventId);
    return null;
  }

  const handleDataExtracted = (data) => {
    // ✅ Normalisation propre des champs
    const safeDate =
      data?.date
        ? (() => {
            try {
              // format jj/mm/aaaa -> yyyy-mm-dd
              if (typeof data.date === 'string' && data.date.includes('/')) {
                const [day, month, year] = data.date.split('/');
                return new Date(`${year}-${month}-${day}`).toISOString().split('T')[0];
              }
              return data.date;
            } catch {
              return format(new Date(), 'yyyy-MM-dd');
            }
          })()
        : format(new Date(), 'yyyy-MM-dd');

    const safeTime = data?.heure || format(new Date(), 'HH:mm');

    const safeAmount = data?.total ? Number.parseFloat(String(data.total).replace(',', '.')) : NaN;

    const currency =
      data?.devise === '$' || data?.devise === 'USD'
        ? 'USD'
        : data?.devise === '£' || data?.devise === 'GBP'
        ? 'GBP'
        : 'EUR';

    const scannedDataForTransaction = {
      store: data?.enseigne || 'Magasin inconnu',
      date: safeDate,
      time: safeTime,
      amount: Number.isFinite(safeAmount) ? String(safeAmount) : '',
      currency,
      scannedData: data,
    };

    // ✅ stocker (si tu en as besoin ailleurs)
    localStorage.setItem('bonkont_scanned_data', JSON.stringify(scannedDataForTransaction));

    setExtractedData(data);

    if (Number.isFinite(safeAmount) && safeAmount > 0) {
      toast({
        title: '✅ Données extraites !',
        description: `Montant scanné: ${safeAmount.toFixed(2)}€. Sélectionnez un payeur ci-dessous pour valider.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Montant non détecté',
        description: "Le montant total n'a pas été détecté. Réessayez avec une photo plus nette.",
      });
    }
  };

  const handleReset = () => {
    setExtractedData(null);
    setSelectedPayer('');
  };

  const handleValidatePayment = () => {
    if (!selectedPayer) {
      toast({
        variant: 'destructive',
        title: 'Payeur manquant',
        description: 'Veuillez sélectionner un participant.',
      });
      return;
    }

    const totalRaw = extractedData?.total;
    const amount = Number.parseFloat(String(totalRaw ?? '').replace(',', '.'));

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Montant invalide',
        description: 'Le montant scanné est invalide. Réinitialisez et rescanez.',
      });
      return;
    }

    const paymentData = {
      eventId: effectiveEventId,
      payerId: selectedPayer,
      amount,
      currency: extractedData?.devise || 'EUR',
      timestamp: new Date().toISOString(),
    };

    // ✅ Stocker temporairement la transaction (si c’est ton flux)
    localStorage.setItem('bonkont_last_payment', JSON.stringify(paymentData));

    toast({
      title: 'Paiement enregistré',
      description: `Montant de ${amount.toFixed(2)}€ attribué.`,
    });

    // ✅ informer le parent si besoin
    onPaymentProcessed?.(paymentData);

    // ✅ fermer et rediriger vers l’écran transactions
    onClose?.();
    window.location.hash = `#event/${effectiveEventId}/transactions`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            Scanner un ticket pour l'événement "{event.title}"
          </DialogTitle>
          <DialogDescription>
            Scannez le ticket de caisse pour extraire les informations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <TesseractTest onDataExtracted={handleDataExtracted} />

          {extractedData && (
            <Card className="p-4 border-green-500/50 bg-green-500/5 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold">Données extraites du ticket</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                  <X className="w-4 h-4" />
                  Réinitialiser
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Enseigne</p>
                  </div>
                  <p className="font-medium">{extractedData.enseigne || 'Magasin inconnu'}</p>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Date</p>
                  </div>
                  <p className="font-medium">{extractedData.date || format(new Date(), 'dd/MM/yyyy')}</p>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Heure</p>
                  </div>
                  <p className="font-medium">{extractedData.heure || format(new Date(), 'HH:mm')}</p>
                </div>

                <div className="p-3 rounded-lg bg-background border-2 border-green-500/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Euro className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Montant</p>
                  </div>
                  <p className="font-bold text-lg text-green-500 flex items-center gap-1">
                    {Number.isFinite(Number.parseFloat(String(extractedData.total ?? '').replace(',', '.')))
                      ? Number.parseFloat(String(extractedData.total).replace(',', '.')).toFixed(2)
                      : '—'}
                    {extractedData.devise || '€'}
                  </p>
                </div>
              </div>

              {/* SECTION APPARAISSANT APRÈS SCAN */}
              <div ref={payerSectionRef} className="mt-6 space-y-4 animate-fade-in">
                <h3 className="text-lg font-semibold">Choisir le payeur</h3>

                <select
                  value={selectedPayer}
                  onChange={(e) => setSelectedPayer(e.target.value)}
                  className="w-full p-2 rounded border border-border bg-background text-foreground"
                >
                  <option value="" style={{ color: '#000', background: '#fff' }}>
                    -- Sélectionner un participant --
                  </option>

                  {participants.map((p, idx) => {
                    const label =
                      p?.name?.trim() ||
                      `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() ||
                      p?.email?.trim() ||
                      p?.mobile?.trim() ||
                      `Participant ${idx + 1}`;

                    return (
                      <option
                        key={p?.id ?? idx}
                        value={String(p?.id ?? '')}
                        style={{ color: '#000', background: '#fff' }} // ✅ dropdown lisible en dark
                      >
                        {label}
                      </option>
                    );
                  })}
                </select>

                <Button
                  onClick={handleValidatePayment}
                  className="w-full sm:w-auto"
                  disabled={!selectedPayer}
                >
                  Valider le paiement
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
 