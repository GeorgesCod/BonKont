import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Euro, Users, Clock, Plus, ArrowRight, Copy, Check, FileText, Shield } from 'lucide-react';
import { ParticipantForm } from '@/components/ParticipantForm';
import { EventLocation } from '@/components/EventLocation';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { nanoid } from 'nanoid';

export function EventCreation() {
  const { toast } = useToast();
  const addEvent = useEventStore((state) => state.addEvent);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState(30);
  const [eventCode, setEventCode] = useState(nanoid(8).toUpperCase());
  const [location, setLocation] = useState(null);
  const [participants, setParticipants] = useState([
    { id: 1, name: '', email: '', hasConfirmed: false, hasValidatedAmount: false, hasValidatedDeadline: false, hasAcceptedCharter: false }
  ]);
  const [charterAccepted, setCharterAccepted] = useState(false);

  // Log de la taille d'écran pour vérifier la responsivité
  useEffect(() => {
    const logScreenSize = () => {
      const width = window.innerWidth;
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const isDesktop = width >= 1024;
      
      const devicePixelRatio = window.devicePixelRatio || 1;
      const orientation = width > window.innerHeight ? 'landscape' : 'portrait';
      
      console.log('[EventCreation] Screen size:', {
        width,
        height: window.innerHeight,
        isMobile,
        isTablet,
        isDesktop,
        devicePixelRatio,
        orientation,
        breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
      });
    };

    logScreenSize();
    window.addEventListener('resize', logScreenSize);
    return () => window.removeEventListener('resize', logScreenSize);
  }, []);

  const addParticipant = () => {
    const newId = Math.max(...participants.map(p => p.id)) + 1;
    setParticipants([...participants, {
      id: newId,
      name: '',
      email: '',
      hasConfirmed: false,
      hasValidatedAmount: false,
      hasValidatedDeadline: false
    }]);
  };

  const removeParticipant = (id) => {
    if (participants.length > 1) {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  const updateParticipant = (id, updates) => {
    setParticipants(participants.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const canProceed = () => {
    let result = false;
    switch (step) {
      case 1:
        result = title.trim() !== '' && description.trim() !== '';
        console.log('[EventCreation] Step 1 validation:', { title: title.trim(), description: description.trim(), result });
        return result;
      case 2:
        const amountValue = parseFloat(amount);
        result = amount.trim() !== '' && !isNaN(amountValue) && amountValue > 0;
        console.log('[EventCreation] Step 2 validation:', { amount: amount.trim(), amountValue, isValid: !isNaN(amountValue), isPositive: amountValue > 0, result });
        return result;
      case 3:
        // Accepter si location existe avec une adresse valide
        result = location !== null && location.address && typeof location.address === 'string' && location.address.trim() !== '';
        console.log('[EventCreation] Step 3 validation:', { 
          location, 
          hasLocation: location !== null, 
          hasAddress: !!location?.address, 
          addressType: typeof location?.address,
          addressTrimmed: location?.address?.trim(), 
          result 
        });
        return result;
      case 4:
        const allParticipantsValid = participants.every(p => p.name.trim() !== '' && p.email.trim() !== '');
        result = allParticipantsValid && charterAccepted;
        console.log('[EventCreation] Step 4 validation:', { 
          participantsCount: participants.length, 
          allParticipantsValid, 
          charterAccepted, 
          participants: participants.map(p => ({ name: p.name.trim(), email: p.email.trim() })),
          result 
        });
        return result;
      default:
        console.log('[EventCreation] Step', step, 'validation: default true');
        return true;
    }
  };

  const handleSubmit = () => {
    console.log('[EventCreation] ===== SUBMITTING EVENT =====');
    console.log('[EventCreation] Event data:', { 
      title, 
      description, 
      amount, 
      deadline, 
      eventCode, 
      location, 
      participantsCount: participants.length,
      charterAccepted 
    });
    
    const newEvent = {
      title,
      description,
      amount: parseFloat(amount),
      deadline,
      code: eventCode,
      location,
      startDate: new Date(),
      participants: participants.map(p => ({
        ...p,
        hasPaid: false,
        paidAmount: 0,
        hasAcceptedCharter: true
      })),
      status: 'active',
      totalPaid: 0
    };

    console.log('[EventCreation] Event object created:', newEvent);
    console.log('[EventCreation] Adding event to store...');
    addEvent(newEvent);
    console.log('[EventCreation] ✅ Event added to store successfully');

    // Effet de confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast({
      title: "Événement créé !",
      description: "L'événement a été ajouté avec succès."
    });

    console.log('[EventCreation] Toast notification sent');
    console.log('[EventCreation] Resetting form...');

    // Réinitialiser le formulaire
    setStep(1);
    setTitle('');
    setDescription('');
    setAmount('');
    setDeadline(30);
    setEventCode(nanoid(8).toUpperCase());
    setLocation(null);
    setCharterAccepted(false);
    setParticipants([
      { id: 1, name: '', email: '', hasConfirmed: false, hasValidatedAmount: false, hasValidatedDeadline: false, hasAcceptedCharter: false }
    ]);
    
    console.log('[EventCreation] ✅ Form reset complete');
    console.log('[EventCreation] ===== SUBMIT PROCESS END =====');
  };

  return (
    <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Créer un événement</h2>
        <Badge variant="outline" className="gap-2 text-xs sm:text-sm">
          Étape {step}/5
        </Badge>
      </div>

      <Progress value={step * 20} className="h-2" />

      <Card className="p-4 sm:p-6 neon-border space-y-4 sm:space-y-6" onKeyDown={(e) => {
        // Empêcher la soumission du formulaire avec Enter
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          e.stopPropagation();
          console.log('[EventCreation] Enter key prevented, target:', e.target);
        }
      }}>
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'événement</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Soirée restaurant"
                className="neon-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre événement..."
                className="neon-border min-h-[100px]"
              />
            </div>
            <div className="p-4 rounded-lg neon-border bg-primary/5">
              <Label className="text-sm text-muted-foreground mb-2 block">Code de l'événement</Label>
              <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-background border border-primary/20 gap-2">
                <span className="text-lg sm:text-xl lg:text-2xl font-mono font-bold text-primary break-all">{eventCode}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="neon-border shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(eventCode);
                    toast({
                      title: "Code copié !",
                      description: "Le code a été copié dans le presse-papier."
                    });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Partagez ce code avec les participants pour qu'ils puissent rejoindre l'événement
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant total à partager</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                setAmount(value);
                console.log('[EventCreation] Amount changed:', value, 'canProceed:', canProceed());
              }}
              className="pl-10 neon-border"
              placeholder="0.00"
            />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Délai de remboursement (jours)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="deadline"
                  type="number"
                  min="1"
                  value={deadline}
                  onChange={(e) => setDeadline(parseInt(e.target.value))}
                  className="pl-10 neon-border"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <EventLocation
              location={location}
              onLocationChange={setLocation}
              isSejour={deadline >= 2} // Considérer comme séjour si délai >= 2 jours
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold">Participants</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addParticipant}
                  className="gap-2 neon-border w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Ajouter</span>
                </Button>
              </div>
              <div className="space-y-4">
                {participants.map((participant) => (
                  <ParticipantForm
                    key={participant.id}
                    participant={participant}
                    onUpdate={(updates) => {
                      console.log('[EventCreation] Participant updated:', participant.id, updates);
                      updateParticipant(participant.id, updates);
                      console.log('[EventCreation] Can proceed to next step:', canProceed());
                    }}
                    onRemove={() => {
                      console.log('[EventCreation] Removing participant:', participant.id);
                      removeParticipant(participant.id);
                    }}
                    canRemove={participants.length > 1}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg neon-border bg-primary/5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Charte d'équité et d'engagement</h3>
              </div>
              
              <ScrollArea className="h-48 rounded-lg border border-border p-4 bg-background">
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">1. Respect et engagement aux frais communs</h4>
                    <p className="text-muted-foreground">
                      Chaque participant s'engage à respecter les montants convenus et à contribuer équitablement aux frais communs de l'événement.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">2. Transparence des transactions</h4>
                    <p className="text-muted-foreground">
                      Toutes les transactions doivent être validées par l'ensemble des participants. Les tickets de caisse et justificatifs doivent être partagés.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">3. Validation obligatoire</h4>
                    <p className="text-muted-foreground">
                      Chaque achat effectué doit être validé par tous les participants avant d'être intégré au solde restant dû.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">4. Paiement dans les délais</h4>
                    <p className="text-muted-foreground">
                      Les participants s'engagent à effectuer leurs paiements dans les délais convenus pour maintenir la confiance et l'équité du groupe.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">5. Communication et respect</h4>
                    <p className="text-muted-foreground">
                      Une communication respectueuse et transparente est essentielle pour le bon déroulement de l'événement et la gestion des frais partagés.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-lg bg-background border border-border">
                <Checkbox
                  id="charter"
                  checked={charterAccepted}
                  onCheckedChange={(checked) => {
                    console.log('[EventCreation] Charter checkbox changed:', checked);
                    setCharterAccepted(checked);
                    console.log('[EventCreation] Charter accepted state:', checked);
                    console.log('[EventCreation] Can proceed to next step:', canProceed());
                  }}
                  className="mt-1 shrink-0"
                />
                <Label htmlFor="charter" className="text-xs sm:text-sm leading-relaxed cursor-pointer">
                  J'accepte la charte d'équité et d'engagement aux frais communs. Je m'engage à respecter les règles de transparence, de validation et de paiement dans les délais convenus.
                </Label>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-lg neon-border space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <h3 className="font-semibold text-sm sm:text-base">Événement</h3>
                </div>
                <p className="font-medium text-sm sm:text-base break-words">{title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{description}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg neon-border space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Euro className="w-4 h-4 sm:w-5 sm:h-5" />
                  <h3 className="font-semibold text-sm sm:text-base">Montant</h3>
                </div>
                <p className="font-medium text-sm sm:text-base">{amount}€</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {(parseFloat(amount) / participants.length).toFixed(2)}€ par personne
                </p>
              </div>
            </div>
            <div className="p-3 sm:p-4 rounded-lg neon-border space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-sm sm:text-base">Participants ({participants.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {participants.map((p) => (
                  <div key={p.id} className="text-xs sm:text-sm">
                    <p className="font-medium break-words">{p.name}</p>
                    <p className="text-muted-foreground break-all">{p.email}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 sm:p-4 rounded-lg neon-border space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-sm sm:text-base">Délai</h3>
              </div>
              <p className="font-medium text-sm sm:text-base">{deadline} jours</p>
            </div>
            {location && (
              <div className="p-3 sm:p-4 rounded-lg neon-border space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <h3 className="font-semibold text-sm sm:text-base">Lieu</h3>
                </div>
                <p className="font-medium text-sm sm:text-base break-words">{location.address}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-4 border-t border-border">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[EventCreation] Back button clicked, moving to step:', step - 1);
                setStep(step - 1);
                return false;
              }}
              className="neon-border w-full sm:w-auto order-2 sm:order-1"
            >
              Retour
            </Button>
          )}
          <div className="ml-auto w-full sm:w-auto order-1 sm:order-2">
            {step < 5 ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  console.log('[EventCreation] ===== NEXT BUTTON CLICKED =====');
                  console.log('[EventCreation] Event:', e);
                  console.log('[EventCreation] Current step:', step);
                  console.log('[EventCreation] Validation check...');
                  
                  const canProceedResult = canProceed();
                  console.log('[EventCreation] canProceed result:', canProceedResult);
                  
                  if (canProceedResult) {
                    console.log('[EventCreation] ✅ Validation passed, moving to step:', step + 1);
                    setStep(step + 1);
                    console.log('[EventCreation] Step changed successfully');
                    toast({
                      title: "Étape suivante",
                      description: `Passage à l'étape ${step + 1}/5`
                    });
                  } else {
                    console.warn('[EventCreation] ❌ Validation failed, cannot proceed');
                    console.warn('[EventCreation] Validation details:', {
                      step,
                      title: step === 1 ? title : undefined,
                      description: step === 1 ? description : undefined,
                      amount: step === 2 ? amount : undefined,
                      location: step === 3 ? location : undefined,
                      participants: step === 4 ? participants : undefined,
                      charterAccepted: step === 4 ? charterAccepted : undefined
                    });
                    toast({
                      variant: "destructive",
                      title: "Validation requise",
                      description: step === 4 
                        ? "Veuillez remplir tous les champs des participants et accepter la charte."
                        : "Veuillez remplir tous les champs requis avant de continuer."
                    });
                  }
                  console.log('[EventCreation] ===== NEXT BUTTON HANDLER END =====');
                  
                  return false;
                }}
                disabled={!canProceed()}
                className="gap-2 button-glow w-full sm:w-auto"
              >
                <span className="text-xs sm:text-sm">Suivant</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  console.log('[EventCreation] ===== SUBMIT BUTTON CLICKED =====');
                  console.log('[EventCreation] Event:', e);
                  console.log('[EventCreation] Final step, submitting event...');
                  handleSubmit();
                  console.log('[EventCreation] ===== SUBMIT HANDLER END =====');
                  
                  return false;
                }}
                className="gap-2 button-glow w-full sm:w-auto"
              >
                <span className="text-xs sm:text-sm">Créer l'événement</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}