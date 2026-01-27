import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Euro, Users, Clock, Plus, ArrowRight, Copy, Check, FileText, Shield, Globe, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ParticipantForm } from '@/components/ParticipantForm';
import { EventLocation } from '@/components/EventLocation';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { nanoid } from 'nanoid';
import { generateEventCode } from '@/lib/auth';
import { EventCode } from '@/components/EventCode';
import { createEvent as createEventAPI } from '@/services/api';

export function EventCreation({ onEventCreated, onClose }) {
  const { toast } = useToast();
  const addEvent = useEventStore((state) => state.addEvent);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [useDuration, setUseDuration] = useState(true); // true = durée en jours, false = date limite
  const [duration, setDuration] = useState(1);
  const [deadline, setDeadline] = useState(30);
  const [expectedParticipants, setExpectedParticipants] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [eventCode, setEventCode] = useState(generateEventCode());
  const [location, setLocation] = useState(null);
  const [organizerId, setOrganizerId] = useState(null);
  const [organizerName, setOrganizerName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [charterAccepted, setCharterAccepted] = useState(false);
  const [showShareCode, setShowShareCode] = useState(false);
  const [createdEventId, setCreatedEventId] = useState(null);

  // Récupérer l'utilisateur connecté (organisateur)
  useEffect(() => {
    console.log('[EventCreation] ===== COMPONENT MOUNTED =====');
    const userData = localStorage.getItem('bonkont-user');
    console.log('[EventCreation] User data from localStorage:', userData ? 'Found' : 'Not found');
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userId = user.email || nanoid(); // Utiliser l'email comme ID unique
        console.log('[EventCreation] Setting organizer:', { userId, name: user.name, email: user.email });
        setOrganizerId(userId);
        setOrganizerName(user.name || user.email?.split('@')[0] || 'Organisateur');
        
        // L'organisateur devient automatiquement participant #1
        const organizerParticipant = {
          id: 1,
          name: user.name || user.email?.split('@')[0] || 'Organisateur',
          email: user.email || '',
          hasConfirmed: true, // L'organisateur est automatiquement confirmé
          hasValidatedAmount: false,
          hasValidatedDeadline: false,
          hasAcceptedCharter: false,
          isOrganizer: true
        };
        console.log('[EventCreation] Setting organizer as participant:', organizerParticipant);
        setParticipants([organizerParticipant]);
      } catch (e) {
        console.error('[EventCreation] Erreur lors de la récupération de l\'utilisateur:', e);
      }
    } else {
      console.warn('[EventCreation] ⚠️ No user data found in localStorage');
    }
  }, []);
  
  // Log de l'état quand step change
  useEffect(() => {
    console.log('[EventCreation] Step changed to:', step);
    if (step === 5) {
      console.log('[EventCreation] ===== STEP 5 - FINAL STEP =====');
      const validationResult = canProceed();
      console.log('[EventCreation] Step 5 state:', {
        title,
        description,
        amount,
        startDate,
        participantsCount: participants.length,
        organizerId,
        canProceed: validationResult
      });
      console.log('[EventCreation] Step 5 button should be:', validationResult ? 'ENABLED' : 'DISABLED');
    }
  }, [step, title, description, amount, startDate, participants, organizerId]);

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
      case 5: {
        // Étape de récapitulatif - validation très permissive
        // Si on arrive à l'étape 5, toutes les étapes précédentes sont validées
        // On vérifie juste que les données minimales existent
        result = !!(title && description && amount && startDate && participants && participants.length > 0);
        
        console.log('[EventCreation] Step 5 validation (simplified):', { 
          title: !!title,
          description: !!description,
          amount: !!amount,
          startDate: !!startDate,
          participants: participants?.length || 0,
          result 
        });
        
        return result;
      }
      default:
        console.log('[EventCreation] Step', step, 'validation: default true');
        return true;
    }
  };

  // Fonction pour vérifier les chevauchements de dates
  // IMPORTANT: Le code de l'événement est l'identité unique
  // Si les codes sont différents, c'est un événement différent et c'est autorisé
  const checkDateOverlaps = (newStart, newEnd, organizerId, newParticipants, newEventCode) => {
    const events = useEventStore.getState().events;
    const overlaps = [];
    
    console.log('[EventCreation] checkDateOverlaps called:', {
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString(),
      organizerId,
      newParticipantsCount: newParticipants?.length || 0,
      existingEventsCount: events.length
    });
    
    // Normaliser les dates (ignorer l'heure, seulement la date)
    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    
    const newStartNorm = normalizeDate(newStart);
    const newEndNorm = normalizeDate(newEnd);
    
    events.forEach((existingEvent, index) => {
      if (!existingEvent.startDate || !existingEvent.endDate) {
        console.log(`[EventCreation] Event ${index} skipped: missing dates`);
        return;
      }
      
      // Ignorer les événements terminés ou annulés
      if (existingEvent.status === 'completed' || existingEvent.status === 'cancelled') {
        console.log(`[EventCreation] Event ${index} "${existingEvent.title}" skipped: status is ${existingEvent.status}`);
        return;
      }
      
      // IMPORTANT: Le code de l'événement est l'identité unique
      // Si les codes sont différents, c'est un événement différent = AUTORISÉ
      if (existingEvent.code && newEventCode && existingEvent.code !== newEventCode) {
        console.log(`[EventCreation] Event ${index} "${existingEvent.title}" (${existingEvent.code}) skipped: different code (${newEventCode}) - OK`);
        return;
      }
      
      const existingStart = normalizeDate(existingEvent.startDate);
      const existingEnd = normalizeDate(existingEvent.endDate);
      
      // Vérifier si les dates se chevauchent
      const datesOverlap = (newStartNorm <= existingEnd && newEndNorm >= existingStart);
      
      console.log(`[EventCreation] Event ${index} "${existingEvent.title}":`, {
        existingStart: existingStart.toISOString(),
        existingEnd: existingEnd.toISOString(),
        datesOverlap,
        organizerId: existingEvent.organizerId
      });
      
      if (!datesOverlap) return;
      
      // Normaliser les IDs pour la comparaison
      const normalizedOrganizerId = organizerId?.toLowerCase()?.trim() || '';
      const existingOrganizerId = existingEvent.organizerId?.toLowerCase()?.trim() || '';
      
      // Vérifier si le MÊME organisateur crée deux événements qui se chevauchent
      const sameOrganizer = normalizedOrganizerId && existingOrganizerId && 
                            normalizedOrganizerId === existingOrganizerId;
      
      // IMPORTANT: Ne pas bloquer si l'organisateur est seulement participant dans l'autre événement
      // Une personne peut être organisateur d'un événement et participant d'un autre
      // On bloque seulement si c'est le MÊME organisateur avec le MÊME code d'événement
      const organizerInvolved = sameOrganizer;
      
      console.log(`[EventCreation] Event ${index} "${existingEvent.title}" (${existingEvent.code}):`, {
        existingOrganizerId,
        currentOrganizerId: normalizedOrganizerId,
        sameOrganizer,
        organizerIsParticipant,
        organizerInvolved
      });
      
      // Vérifier si un participant du nouvel événement est déjà impliqué dans l'événement existant
      // IMPORTANT: Ignorer l'organisateur dans cette vérification (déjà vérifié ci-dessus)
      let participantInvolved = null;
      for (const newParticipant of newParticipants) {
        const newEmail = newParticipant.email?.toLowerCase()?.trim() || '';
        const newUserId = newParticipant.userId?.toLowerCase()?.trim() || '';
        
        // Ignorer l'organisateur dans la vérification des participants
        if (newEmail === normalizedOrganizerId || newUserId === normalizedOrganizerId) {
          continue;
        }
        
        const found = existingEvent.participants?.find(p => {
          const pEmail = p.email?.toLowerCase()?.trim() || '';
          const pName = p.name?.toLowerCase()?.trim() || '';
          const pUserId = p.userId?.toLowerCase() || '';
          
          // Correspondance par email (prioritaire)
          if (newEmail && pEmail && newEmail === pEmail) {
            return (p.status === 'confirmed' || p.status === 'pending');
          }
          // Correspondance par userId
          if (newUserId && pUserId && newUserId === pUserId) {
            return (p.status === 'confirmed' || p.status === 'pending');
          }
          // Correspondance par nom (si pas d'email)
          if (!newEmail && !pEmail && newName && pName && newName === pName) {
            return (p.status === 'confirmed' || p.status === 'pending');
          }
          return false;
        });
        
        if (found) {
          participantInvolved = {
            participant: newParticipant,
            existingParticipant: found
          };
          console.log(`[EventCreation] Event ${index} participantInvolved:`, participantInvolved);
          break;
        }
      }
      
      // Bloquer seulement si le même organisateur ou participant est impliqué
      // Différents organisateurs avec dates communes = AUTORISÉ (code événement = identité unique)
      if (organizerInvolved || participantInvolved) {
        overlaps.push({
          event: existingEvent,
          reason: organizerInvolved ? 'organizer' : 'participant',
          participantInfo: participantInvolved
        });
        console.log(`[EventCreation] ⚠️ Overlap detected with event "${existingEvent.title}" (${existingEvent.code})`);
      } else {
        // Pas de conflit : différents organisateurs avec dates communes = OK
        console.log(`[EventCreation] ✓ Event "${existingEvent.title}" (${existingEvent.code}) has overlapping dates but different organizer - OK`);
      }
    });
    
    console.log('[EventCreation] Total overlaps found:', overlaps.length);
    return overlaps;
  };

  const handleSubmit = async () => {
    try {
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
      
      // Vérifier les chevauchements de dates
      console.log('[EventCreation] Before checkDateOverlaps:', {
        organizerId,
        organizerIdType: typeof organizerId,
        eventCode,
        participantsCount: participants.length,
        participants: participants.map(p => ({ name: p.name, email: p.email, isOrganizer: p.isOrganizer }))
      });
      const overlaps = checkDateOverlaps(start, end, organizerId, participants, eventCode);
      
      if (overlaps.length > 0) {
        console.warn('[EventCreation] ❌ Date overlaps detected:', overlaps);
        console.warn('[EventCreation] Overlap details:', JSON.stringify(overlaps, null, 2));
        console.warn('[EventCreation] Current organizerId:', organizerId, 'Type:', typeof organizerId);
        console.warn('[EventCreation] Overlapping events:', overlaps.map(o => ({
          title: o.event.title,
          code: o.event.code,
          organizerId: o.event.organizerId,
          organizerIdType: typeof o.event.organizerId,
          reason: o.reason,
          participantInfo: o.participantInfo
        })));
        
        // Construire le message d'erreur
        const overlapMessages = overlaps.map((overlap, idx) => {
          const event = overlap.event;
          const eventStart = new Date(event.startDate).toLocaleDateString('fr-FR');
          const eventEnd = new Date(event.endDate).toLocaleDateString('fr-FR');
          const eventTitle = event.title || 'Sans titre';
          const location = event.location?.address || event.location?.city || 'Lieu non spécifié';
          const eventCode = event.code || 'N/A';
          
          console.log(`[EventCreation] Overlap ${idx + 1}:`, {
            eventTitle,
            eventCode,
            eventStart,
            eventEnd,
            location,
            reason: overlap.reason,
            organizerId: event.organizerId,
            currentOrganizerId: organizerId
          });
          
          if (overlap.reason === 'organizer') {
            return `• Vous êtes déjà organisateur de "${eventTitle}" (Code: ${eventCode}) du ${eventStart} au ${eventEnd} à ${location}`;
          } else {
            const participantName = overlap.participantInfo?.participant?.name || 
                                    overlap.participantInfo?.participant?.email || 
                                    'un participant';
            return `• Le participant "${participantName}" est déjà impliqué dans "${eventTitle}" (Code: ${eventCode}) du ${eventStart} au ${eventEnd} à ${location}`;
          }
        });
        
        const errorMessage = `Impossible de créer cet événement :\n\n${overlapMessages.join('\n')}\n\nUne personne ne peut pas être à deux endroits différents en même temps.`;
        
        console.error('[EventCreation] Blocking event creation due to overlaps:', {
          overlapsCount: overlaps.length,
          errorMessage
        });
        
        toast({
          variant: "destructive",
          title: "Conflit de dates",
          description: errorMessage,
          duration: 15000 // Afficher plus longtemps pour que l'utilisateur puisse lire
        });
        return;
      }
      
      // Calculer la durée de l'événement (jours entre startDate et endDate)
      const eventDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('[EventCreation] Event data:', { 
        title, 
        description, 
        amount, 
        startDate,
        endDate: end.toISOString(),
        duration,
        useDuration,
        eventDuration,
        paymentDeadline: deadline,
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
        deadline: deadline, // Délai de paiement configuré par l'utilisateur
        eventDuration: eventDuration, // Durée de l'événement (pour référence)
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
        status: 'active', // Événement actif dès la création
        totalPaid: 0
      };

      console.log('[EventCreation] Event object created:', newEvent);
      
      // Créer l'événement dans Firestore via l'API
      let firestoreEventId = null;
      try {
        console.log('[EventCreation] Creating event in Firestore...');
        // IMPORTANT: Le code événement est lié à l'organisateur via organizerId dans Firestore
        // L'organisateur est automatiquement ajouté comme participant dans Firestore
        const firestoreResult = await createEventAPI({
          ...newEvent,
          startDate: start.toISOString().split('T')[0], // Format YYYY-MM-DD
          endDate: end.toISOString().split('T')[0],
          organizerEmail: participants.find(p => p.isOrganizer)?.email || organizerId // Transmettre l'email de l'organisateur
        });
        firestoreEventId = firestoreResult.eventId;
        console.log('[EventCreation] ✅ Event created in Firestore, eventId:', firestoreEventId);
        
        // Mettre à jour l'ID de l'événement local avec l'ID Firestore
        newEvent.id = firestoreEventId;
        newEvent.firestoreId = firestoreEventId;
      } catch (error) {
        console.error('[EventCreation] ⚠️ Error creating event in Firestore:', error);
        // Continuer quand même avec le store local (fallback)
        toast({
          variant: "default",
          title: "Avertissement",
          description: "L'événement a été créé localement. La synchronisation avec le serveur sera effectuée automatiquement."
        });
      }
      
      // Toujours ajouter au store local pour que l'événement soit disponible immédiatement
      console.log('[EventCreation] Adding event to local store...');
      console.log('[EventCreation] Event data before adding:', { 
        id: newEvent.id, 
        firestoreId: firestoreEventId, 
        title: newEvent.title,
        status: newEvent.status,
        code: newEvent.code
      });
      
      // S'assurer que l'ID est bien défini avant d'ajouter
      if (!newEvent.id && firestoreEventId) {
        newEvent.id = firestoreEventId;
      }
      
      const eventId = addEvent(newEvent);
      console.log('[EventCreation] ✅ Event added to local store successfully, eventId:', eventId);
      
      // Vérifier que l'événement est bien dans le store
      const events = useEventStore.getState().events;
      const eventInStore = events.find(e => 
        String(e.id) === String(eventId) || 
        String(e.id) === String(firestoreEventId) ||
        String(e.firestoreId) === String(firestoreEventId)
      );
      console.log('[EventCreation] Event verification:', {
        eventId,
        firestoreEventId,
        eventInStore: !!eventInStore,
        eventsCount: events.length,
        eventTitle: eventInStore?.title,
        eventStatus: eventInStore?.status,
        eventCode: eventInStore?.code,
        allEventIds: events.map(e => ({ id: e.id, firestoreId: e.firestoreId, code: e.code, status: e.status }))
      });
      
      if (!eventInStore) {
        console.error('[EventCreation] ❌ Event not found in store after adding!');
        console.error('[EventCreation] This is a critical error - event may not appear in dashboard');
      }

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
    } catch (error) {
      console.error('[EventCreation] ❌ Error submitting event:', error);
      toast({
        variant: "destructive",
        title: "Erreur lors de la création",
        description: error.message || "Une erreur est survenue lors de la création de l'événement. Veuillez réessayer."
      });
    }
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => {
              console.log('[EventCreation] Gérer les participants clicked, eventId:', createdEventId);
              
              // Vérifier que l'événement est dans le store
              const events = useEventStore.getState().events;
              const eventExists = events.some(e => String(e.id) === String(createdEventId));
              console.log('[EventCreation] Event check before navigation:', {
                eventId: createdEventId,
                eventExists,
                eventsCount: events.length,
                availableIds: events.map(e => e.id)
              });
              
              if (eventExists) {
                // Naviguer vers l'événement
                window.location.hash = `#event/${createdEventId}`;
                // Forcer le re-render
                setTimeout(() => {
                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                }, 100);
                
                // Fermer le formulaire de création
                if (onClose) {
                  onClose();
                }
              } else {
                console.error('[EventCreation] Event not found in store, cannot navigate');
                toast({
                  variant: "destructive",
                  title: "Erreur",
                  description: "L'événement n'a pas été trouvé. Veuillez rafraîchir la page."
                });
              }
            }}
            className="gap-2 button-glow"
          >
            <Users className="w-4 h-4" />
            Gérer les participants
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              console.log('[EventCreation] Terminé clicked');
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
              setEventCode(generateEventCode());
              setLocation(null);
              setCharterAccepted(false);
              
              // Fermer le formulaire et retourner au dashboard
              if (onEventCreated) {
                onEventCreated(createdEventId);
              }
              if (onClose) {
                onClose();
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

  const handleBackToHome = () => {
    console.log('[EventCreation] Back to home clicked');
    if (onClose) {
      onClose();
    } else {
      window.location.hash = '';
      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 50);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-2 sm:px-0 pb-24 sm:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Créer un événement</h2>
          <p className="text-sm text-muted-foreground mt-1">Tu proposes l'idée, Bonkont garde les comptes.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="gap-2 text-xs sm:text-sm">
            Étape {step}/5
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToHome}
            className="shrink-0 min-h-[44px] min-w-[44px] hover:bg-destructive/10 hover:text-destructive"
            title="Retour à l'accueil"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>
      </div>

      <Progress value={step * 20} className="h-2" />

      <Card className="p-4 sm:p-6 neon-border space-y-4 sm:space-y-6" onKeyDown={(e) => {
        // Empêcher la soumission du formulaire avec Enter
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          e.stopPropagation();
          console.log('[EventCreation] Enter key prevented, target:', e.target);
        }
      }}
      onClick={(e) => {
        // Log pour déboguer les clics sur la Card
        if (e.target.tagName === 'BUTTON') {
          console.log('[EventCreation] Button clicked inside Card:', e.target);
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
              <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`
                      w-full justify-start text-left font-normal neon-border
                      ${!startDate && 'text-muted-foreground'}
                    `}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(new Date(startDate), 'PPP', { locale: fr })
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Utiliser le format local pour éviter les problèmes de fuseau horaire
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setStartDate(`${year}-${month}-${day}`);
                        setStartDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`
                        w-full justify-start text-left font-normal neon-border
                        ${!endDate && 'text-muted-foreground'}
                      `}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(new Date(endDate), 'PPP', { locale: fr })
                      ) : (
                        <span>Choisir une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Utiliser le format local pour éviter les problèmes de fuseau horaire
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setEndDate(`${year}-${month}-${day}`);
                          setEndDatePickerOpen(false);
                        }
                      }}
                      disabled={(date) => {
                        const minDate = startDate ? new Date(startDate) : new Date();
                        minDate.setHours(0, 0, 0, 0);
                        return date < minDate;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDeadline">Délai de paiement (jours après la fin de l'événement)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="paymentDeadline"
                  type="number"
                  min="1"
                  value={deadline}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setDeadline(value);
                  }}
                  className="pl-10 neon-border"
                  placeholder="Ex: 30"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Délai accordé aux participants pour effectuer leurs paiements après la fin de l'événement
              </p>
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
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <h3 className="font-semibold text-sm sm:text-base">Événement</h3>
                </div>
                <p className="font-medium text-sm sm:text-base break-words">{title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{description}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg neon-border bg-primary/5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Euro className="w-4 h-4 sm:w-5 sm:h-5" />
                    <h3 className="font-semibold text-sm sm:text-base">Budget total</h3>
                    <Badge variant="outline" className="text-xs">Saisi</Badge>
                  </div>
                  <div>
                    <p className="font-bold text-2xl sm:text-3xl text-foreground">{amount}€</p>
                    <p className="text-xs text-muted-foreground mt-1">Montant total que vous avez saisi à l'étape 2</p>
                  </div>
                </div>
              </div>
              {(() => {
                const totalAmount = parseFloat(amount) || 0;
                // Utiliser expectedParticipants si rempli, sinon utiliser le nombre réel de participants
                const expectedCount = expectedParticipants && parseInt(expectedParticipants) > 0 
                  ? parseInt(expectedParticipants) 
                  : null;
                const actualParticipantsCount = participants?.length || 1;
                // Utiliser le nombre prévu si disponible, sinon le nombre réel
                const participantsCount = expectedCount || actualParticipantsCount;
                const amountPerPerson = participantsCount > 0 ? totalAmount / participantsCount : 0;
                
                console.log('[EventCreation] Amount calculation:', {
                  totalAmount,
                  expectedParticipants,
                  expectedCount,
                  actualParticipantsCount: actualParticipantsCount,
                  participantsCountUsed: participantsCount,
                  amountPerPerson: amountPerPerson.toFixed(2),
                  calculation: `${totalAmount} / ${participantsCount} = ${amountPerPerson.toFixed(2)}`,
                  note: expectedCount ? 'Using expected participants count' : 'Using actual participants count'
                });
                
                return (
                  <div className="p-3 sm:p-4 rounded-lg neon-border bg-muted/30">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        <h3 className="font-semibold text-sm sm:text-base text-muted-foreground">Montant par personne</h3>
                        <Badge variant="outline" className="text-xs">Calculé</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <p className="font-semibold text-lg sm:text-xl text-foreground">
                            {amountPerPerson.toFixed(2)}€
                          </p>
                          <p className="text-sm text-muted-foreground">par personne</p>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          {totalAmount.toFixed(2)}€ ÷ {participantsCount} participant{participantsCount > 1 ? 's' : ''} = {amountPerPerson.toFixed(2)}€
                        </p>
                        {expectedCount && (
                          <p className="text-xs text-muted-foreground">
                            Basé sur le nombre prévu de {expectedCount} participant{expectedCount > 1 ? 's' : ''}
                          </p>
                        )}
                        {!expectedCount && (
                          <p className="text-xs text-muted-foreground">
                            Basé sur {actualParticipantsCount} participant{actualParticipantsCount > 1 ? 's' : ''} actuel{actualParticipantsCount > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
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
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
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
            {step === 5 && (() => {
              const canProceedVal = canProceed();
              console.log('[EventCreation] 🔍 RENDERING STEP 5 - Button state:', {
                step,
                canProceed: canProceedVal,
                disabled: !canProceedVal,
                title: title?.substring(0, 30) || 'empty',
                description: description?.substring(0, 30) || 'empty',
                amount: amount || 'empty',
                startDate: startDate || 'empty',
                participantsCount: participants?.length || 0,
                organizerId: organizerId ? 'present' : 'missing',
                titleExists: !!title,
                descriptionExists: !!description,
                amountExists: !!amount,
                startDateExists: !!startDate,
                participantsExist: participants && participants.length > 0
              });
              return null;
            })()}
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
                  console.log('[EventCreation] ===== SUBMIT BUTTON CLICKED =====');
                  console.log('[EventCreation] Button click event:', e);
                  console.log('[EventCreation] Current step:', step);
                  
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Log de l'état actuel
                  const currentCanProceed = canProceed();
                  console.log('[EventCreation] Current state:', {
                    step,
                    title,
                    description,
                    amount,
                    startDate,
                    participantsCount: participants?.length || 0,
                    organizerId,
                    canProceedResult: currentCanProceed
                  });
                  
                  // Appeler handleSubmit directement - la validation est déjà faite par le disabled
                  console.log('[EventCreation] ✅ Calling handleSubmit...');
                  try {
                    handleSubmit();
                    console.log('[EventCreation] ✅ handleSubmit completed');
                  } catch (error) {
                    console.error('[EventCreation] ❌ Error in handleSubmit:', error);
                    toast({
                      variant: "destructive",
                      title: "Erreur",
                      description: error.message || "Une erreur est survenue lors de la création de l'événement."
                    });
                  }
                  console.log('[EventCreation] ===== SUBMIT HANDLER END =====');
                }}
                disabled={!canProceed()}
                className="gap-2 button-glow w-full sm:w-auto"
                style={{
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  opacity: canProceed() ? 1 : 0.5
                }}
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