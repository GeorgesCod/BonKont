import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Euro, Users, Clock, Plus, ArrowRight, Copy, Check, FileText, Shield, Globe } from 'lucide-react';
import { ParticipantForm } from '@/components/ParticipantForm';
import { EventLocation } from '@/components/EventLocation';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { nanoid } from 'nanoid';
import { EventCode } from '@/components/EventCode';

export function EventCreation({ onEventCreated }) {
  const { toast } = useToast();
  const addEvent = useEventStore((state) => state.addEvent);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useDuration, setUseDuration] = useState(true); // true = durée en jours, false = date limite
  const [duration, setDuration] = useState(1);
  const [deadline, setDeadline] = useState(30);
  const [expectedParticipants, setExpectedParticipants] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [eventCode, setEventCode] = useState(nanoid(8).toUpperCase());
  const [location, setLocation] = useState(null);
  const [organizerId, setOrganizerId] = useState(null);
  const [organizerName, setOrganizerName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [charterAccepted, setCharterAccepted] = useState(false);
  const [showShareCode, setShowShareCode] = useState(false);
  const [createdEventId, setCreatedEventId] = useState(null);

  // Récupérer l'utilisateur connecté (organisateur)
  useEffect(() => {
    const userData = localStorage.getItem('bonkont-user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userId = user.email || nanoid(); // Utiliser l'email comme ID unique
        setOrganizerId(userId);
        setOrganizerName(user.name || user.email?.split('@')[0] || 'Organisateur');
        
        // L'organisateur devient automatiquement participant #1
        setParticipants([{
          id: 1,
          name: user.name || user.email?.split('@')[0] || 'Organisateur',
          email: user.email || '',
          hasConfirmed: true, // L'organisateur est automatiquement confirmé
          hasValidatedAmount: false,
          hasValidatedDeadline: false,
          hasAcceptedCharter: false,
          isOrganizer: true
        }]);
      } catch (e) {
        console.error('[EventCreation] Erreur lors de la récupération de l\'utilisateur:', e);
      }
    }
  }, []);

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
        result = title.trim() !== '' && description.trim() !== '' && startDate !== '';
        console.log('[EventCreation] Step 1 validation:', { title: title.trim(), description: description.trim(), startDate, result });
        return result;
      case 2:
        const amountValue = parseFloat(amount);
        const dateValid = useDuration 
          ? duration > 0 
          : endDate !== '' && new Date(endDate) >= new Date(startDate);
        result = amount.trim() !== '' && !isNaN(amountValue) && amountValue > 0 && dateValid;
        console.log('[EventCreation] Step 2 validation:', { 
          amount: amount.trim(), 
          amountValue, 
          isValid: !isNaN(amountValue), 
          isPositive: amountValue > 0, 
          dateValid,
          result 
        });
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
        // L'organisateur est déjà dans la liste, on vérifie juste qu'il a un nom
        const organizerValid = participants.length > 0 && participants[0].name.trim() !== '';
        result = organizerValid && charterAccepted;
        console.log('[EventCreation] Step 4 validation:', { 
          participantsCount: participants.length, 
          organizerValid, 
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
    
    if (!organizerId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez être connecté pour créer un événement."
      });
      return;
    }

    // Calculer la date de fin
    const start = new Date(startDate);
    const end = useDuration 
      ? new Date(start.getTime() + duration * 24 * 60 * 60 * 1000)
      : new Date(endDate);
    
    // Calculer le délai de remboursement (jours entre startDate et endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('[EventCreation] Event data:', { 
      title, 
      description, 
      amount, 
      startDate,
      endDate: end.toISOString(),
      duration,
      useDuration,
      deadline: daysDiff,
      expectedParticipants,
      currency,
      eventCode, 
      location, 
      organizerId,
      organizerName,
      participantsCount: participants.length,
      charterAccepted 
    });
    
    const newEvent = {
      title,
      description,
      amount: parseFloat(amount),
      deadline: daysDiff,
      startDate: start,
      endDate: end,
      expectedParticipants: expectedParticipants ? parseInt(expectedParticipants) : null,
      currency,
      code: eventCode,
      location,
      organizerId,
      organizerName,
      participants: participants.map((p, index) => ({
        ...p,
        id: index + 1,
        hasPaid: false,
        paidAmount: 0,
        hasAcceptedCharter: true,
        status: p.isOrganizer ? 'confirmed' : 'pending' // L'organisateur est confirmé, les autres en attente
      })),
      status: 'draft', // Événement en brouillon jusqu'au démarrage officiel
      totalPaid: 0
    };

    console.log('[EventCreation] Event object created:', newEvent);
    console.log('[EventCreation] Adding event to store...');
    const eventId = addEvent(newEvent);
    console.log('[EventCreation] ✅ Event added to store successfully, eventId:', eventId);

    // Effet de confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast({
      title: "Événement créé !",
      description: "Partagez maintenant le code avec vos amis."
    });

    // Afficher l'écran de partage du code
    setCreatedEventId(eventId);
    setShowShareCode(true);
    
    console.log('[EventCreation] ✅ Event creation process complete');
  };

  // Si on affiche l'écran de partage du code
  if (showShareCode && createdEventId) {
    return (
      <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Ton code événement</h2>
            <p className="text-sm text-muted-foreground mt-1">Partage ce code. Seuls ceux qui l'ont peuvent rejoindre.</p>
          </div>
        </div>
        <EventCode eventId={createdEventId} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowShareCode(false);
              setCreatedEventId(null);
              // Réinitialiser le formulaire
              setStep(1);
              setTitle('');
              setDescription('');
              setAmount('');
              setStartDate('');
              setEndDate('');
              setDuration(1);
              setDeadline(30);
              setExpectedParticipants('');
              setCurrency('EUR');
              setEventCode(nanoid(8).toUpperCase());
              setLocation(null);
              setCharterAccepted(false);
              if (onEventCreated) {
                onEventCreated(createdEventId);
              }
            }}
            className="neon-border"
          >
            Terminé
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Créer un événement</h2>
          <p className="text-sm text-muted-foreground mt-1">Tu proposes l'idée, Bonkont garde les comptes.</p>
        </div>
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
              <Label htmlFor="title">Nom de l'événement</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Voyage Florence"
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
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="neon-border"
                min={new Date().toISOString().split('T')[0]}
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
              <Label htmlFor="amount">Budget total</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-32 neon-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                La part cible par personne sera calculée automatiquement
              </p>
            </div>
            <div className="space-y-2">
              <Label>Durée / Date limite</Label>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant={useDuration ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseDuration(true)}
                  className="neon-border"
                >
                  Durée (jours)
                </Button>
                <Button
                  type="button"
                  variant={!useDuration ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseDuration(false)}
                  className="neon-border"
                >
                  Date limite
                </Button>
              </div>
              {useDuration ? (
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                    className="pl-10 neon-border"
                    placeholder="Nombre de jours"
                  />
                </div>
              ) : (
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="neon-border"
                  min={startDate || new Date().toISOString().split('T')[0]}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedParticipants">Nombre prévu de participants (optionnel)</Label>
              <Input
                id="expectedParticipants"
                type="number"
                min="1"
                value={expectedParticipants}
                onChange={(e) => setExpectedParticipants(e.target.value)}
                className="neon-border"
                placeholder="Ex: 8"
              />
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
              <div className="p-4 rounded-lg neon-border bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="text-base sm:text-lg font-semibold">Organisateur</h3>
                  <Badge variant="outline" className="ml-auto">Participant #1</Badge>
                </div>
                {participants.length > 0 && participants[0].isOrganizer && (
                  <div className="space-y-2">
                    <p className="font-medium">{participants[0].name}</p>
                    <p className="text-sm text-muted-foreground">{participants[0].email}</p>
                    <Badge variant="outline" className="gap-1">
                      <Check className="w-3 h-3" />
                      Confirmé
                    </Badge>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Les autres participants rejoindront l'événement avec le code.
                </p>
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