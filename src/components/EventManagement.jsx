import { useState, useEffect } from 'react';
import { useEventStore } from '@/store/eventStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { useJoinRequestsStore } from '@/store/joinRequestsStore';
import { getJoinRequests, updateJoinRequest } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  MapPin, 
  Share2, 
  Users, 
  Star, 
  Calendar, 
  Euro,
  ExternalLink,
  Navigation,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Scan,
  AlertCircle,
  UserCircle,
  Bell,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Rocket,
  Plus,
  Mail,
  RotateCcw,
  Loader2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EventLocation } from '@/components/EventLocation';
import { EventTicketScanner } from '@/components/EventTicketScanner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { computeBalances, computeTransfers, formatBalance, getParticipantTransfers, getExpenseTraceability, getPaymentTraceability, getContributionToPot } from '@/utils/bonkontBalances';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function EventManagement({ eventId, onBack }) {
  console.log('[EventManagement] Component mounted:', { eventId, type: typeof eventId });
  
  const { toast } = useToast();
  const allEvents = useEventStore((state) => state.events);
  const updateEvent = useEventStore((state) => state.updateEvent);
  console.log('[EventManagement] All events:', allEvents.map(e => ({ id: e.id, title: e.title })));
  
  const event = allEvents.find(e => {
    const match = String(e.id) === String(eventId);
    if (match) console.log('[EventManagement] Event matched:', { eventId, foundId: e.id, title: e.title });
    return match;
  });
  
  const transactionsStore = useTransactionsStore();
  const transactions = transactionsStore.getTransactionsByEvent(eventId);
  const addTransaction = transactionsStore.addTransaction;
  
  console.log('[EventManagement] ⚠️ Transactions récupérées:', {
    eventId,
    count: transactions.length,
    transactions: transactions.map(t => ({
      id: t.id,
      source: t.source,
      participants: t.participants,
      payerId: t.payerId,
      amount: t.amount,
      type: t.type
    }))
  });
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerParticipantId, setScannerParticipantId] = useState(null);
  const [showHelpIncompleteDistribution, setShowHelpIncompleteDistribution] = useState(false);
  const [showBonkontRule, setShowBonkontRule] = useState(true);
  const [firestoreJoinRequests, setFirestoreJoinRequests] = useState([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  // Ouvrir la section participants par défaut pour les organisateurs
  const userData = typeof window !== 'undefined' ? localStorage.getItem('bonkont-user') : null;
  const currentUserIdForAccordion = userData ? (() => {
    try {
      const user = JSON.parse(userData);
      const userId = user.email || null;
      console.log('[EventManagement] 👤 Current user extracted:', { 
        email: user.email, 
        userId,
        organizerId: event?.organizerId,
        match: userId === event?.organizerId
      });
      return userId;
    } catch {
      return null;
    }
  })() : null;
  const isOrganizerForAccordion = currentUserIdForAccordion && event?.organizerId === currentUserIdForAccordion;
  
  console.log('[EventManagement] 🔍 Organizer check:', {
    currentUserIdForAccordion,
    organizerId: event?.organizerId,
    isOrganizerForAccordion,
    eventId: event?.id,
    eventTitle: event?.title
  });
  
  // Vérifier si l'utilisateur est un participant confirmé
  const isConfirmedParticipant = currentUserIdForAccordion && event?.participants?.some(p => 
    (p.email && p.email.toLowerCase() === currentUserIdForAccordion.toLowerCase()) ||
    (p.userId && p.userId.toLowerCase() === currentUserIdForAccordion.toLowerCase())
  ) && event?.participants?.find(p => 
    (p.email && p.email.toLowerCase() === currentUserIdForAccordion.toLowerCase()) ||
    (p.userId && p.userId.toLowerCase() === currentUserIdForAccordion.toLowerCase())
  )?.status === 'confirmed';
  
  const [accordionValue, setAccordionValue] = useState(() => {
    // Ouvrir participants pour les organisateurs ET les participants confirmés
    const shouldOpenParticipants = isOrganizerForAccordion || isConfirmedParticipant;
    const initialValue = shouldOpenParticipants
      ? ['event', 'bonkont-rule', 'participants'] // Ouvrir participants pour les organisateurs et participants confirmés
      : ['event', 'bonkont-rule']; // Par défaut, événement et règle Bonkont ouverts
    
    console.log('[EventManagement] 🎯 Initial accordion value:', {
      initialValue,
      isOrganizerForAccordion,
      isConfirmedParticipant,
      currentUserIdForAccordion,
      organizerId: event?.organizerId
    });
    
    return initialValue;
  });

  // Vérifier si l'utilisateur actuel est l'organisateur (réutiliser les valeurs calculées plus haut)
  const currentUserId = currentUserIdForAccordion;
  const isOrganizer = isOrganizerForAccordion;

  // Définir participants avant de l'utiliser
  const participants = Array.isArray(event.participants) ? event.participants : [];

  // Séparer les participants par statut (Confirmés / En attente / Refusés)
  // Pour la compatibilité avec les événements existants : si pas de status, considérer comme confirmé
  const confirmedParticipants = participants.filter(p => {
    // Si le participant a explicitement status === 'pending' ou 'rejected', exclure
    if (p.status === 'pending' || p.status === 'rejected') {
      return false;
    }
    // Si le participant a explicitement status === 'pending' et pas hasConfirmed, c'est en attente
    if (p.status === 'pending' && !p.hasConfirmed && !p.isOrganizer) {
      return false;
    }
    // Sinon, considérer comme confirmé (compatibilité avec anciens événements)
    return true;
  });
  const pendingParticipants = participants.filter(p => p.status === 'pending' && !p.hasConfirmed && !p.isOrganizer);
  const rejectedParticipants = participants.filter(p => p.status === 'rejected');
  
  console.log('[EventManagement] Participants status:', {
    total: participants.length,
    confirmed: confirmedParticipants.length,
    pending: pendingParticipants.length,
    rejected: rejectedParticipants.length,
    isOrganizer
  });

  // Fonction pour valider un participant
  const handleValidateParticipant = (participantId) => {
    const updatedParticipants = event.participants.map(p => 
      p.id === participantId 
        ? { ...p, status: 'confirmed', hasConfirmed: true }
        : p
    );
    updateEvent(eventId, { participants: updatedParticipants });
    toast({
      title: "Participant validé",
      description: "Le participant a été ajouté à l'événement."
    });
  };

  // Fonction pour rejeter un participant (changer le statut à 'rejected' au lieu de supprimer)
  const handleRejectParticipant = (participantId) => {
    console.log('[EventManagement] Rejecting participant:', participantId);
    const updatedParticipants = event.participants.map(p => 
      p.id === participantId 
        ? { ...p, status: 'rejected' }
        : p
    );
    updateEvent(eventId, { participants: updatedParticipants });
    toast({
      title: "Participant rejeté",
      description: "Le participant a été rejeté. Vous pouvez le réaccepter plus tard si besoin."
    });
  };

  // Fonction pour réaccepter un participant rejeté
  const handleReacceptParticipant = (participantId) => {
    console.log('[EventManagement] Reaccepting participant:', participantId);
    const updatedParticipants = event.participants.map(p => 
      p.id === participantId 
        ? { ...p, status: 'confirmed', hasConfirmed: true }
        : p
    );
    updateEvent(eventId, { participants: updatedParticipants });
    toast({
      title: "Participant réaccepté",
      description: "Le participant a été ajouté à l'événement."
    });
  };

  // Fonction pour ajouter manuellement un participant
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');

  const handleAddParticipantManually = () => {
    if (!newParticipantName.trim()) {
      toast({
        variant: "destructive",
        title: "Nom requis",
        description: "Veuillez entrer un nom pour le participant."
      });
      return;
    }

    if (!event) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "L'événement n'a pas été trouvé. Veuillez réessayer."
      });
      return;
    }

    console.log('[EventManagement] Adding participant manually:', {
      name: newParticipantName,
      email: newParticipantEmail,
      eventId,
      eventCode: event.code
    });

    // Vérifier si le participant existe déjà (par email ou nom)
    const existingParticipant = event.participants?.find(
      p => {
        const emailMatch = newParticipantEmail.trim() && p.email && 
          p.email.toLowerCase() === newParticipantEmail.trim().toLowerCase();
        const nameMatch = p.name && 
          p.name.toLowerCase() === newParticipantName.trim().toLowerCase();
        return emailMatch || nameMatch;
      }
    );

    if (existingParticipant) {
      toast({
        variant: "destructive",
        title: "Participant existant",
        description: "Ce participant est déjà dans la liste."
      });
      return;
    }

    // Créer un nouveau participant confirmé directement (ajout manuel = accepté)
    const currentParticipants = event.participants || [];
    const newParticipantId = currentParticipants.length > 0
      ? Math.max(...currentParticipants.map(p => Number(p.id) || 0)) + 1
      : 2;

    const newParticipant = {
      id: newParticipantId,
      name: newParticipantName.trim(),
      email: newParticipantEmail.trim() || '',
      hasConfirmed: true,
      hasValidatedAmount: false,
      hasValidatedDeadline: false,
      hasAcceptedCharter: false,
      status: 'confirmed', // Ajout manuel = confirmé directement
      hasPaid: false,
      paidAmount: 0
    };

    console.log('[EventManagement] Creating new participant:', newParticipant);
    console.log('[EventManagement] Current participants count:', currentParticipants.length);

    try {
      updateEvent(eventId, {
        participants: [...currentParticipants, newParticipant]
      });

      console.log('[EventManagement] ✅ Participant added successfully');

      toast({
        title: "Participant ajouté",
        description: `${newParticipantName} a été ajouté à l'événement.`
      });

      // Réinitialiser le formulaire
      setNewParticipantName('');
      setNewParticipantEmail('');
      setShowAddParticipantDialog(false);
    } catch (error) {
      console.error('[EventManagement] ❌ Error adding participant:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le participant. Veuillez réessayer."
      });
    }
  };

  // Fonction pour lancer l'événement officiellement
  const handleLaunchEvent = () => {
    if (confirmedParticipants.length < 1) {
      toast({
        variant: "destructive",
        title: "Impossible de lancer",
        description: "Il faut au moins un participant confirmé pour lancer l'événement."
      });
      return;
    }

    updateEvent(eventId, { 
      status: 'active',
      // Figer les paramètres
      frozenAt: new Date(),
      frozenParticipants: [...confirmedParticipants],
      frozenBudget: event.amount,
      frozenCurrency: event.currency
    });

    toast({
      title: "Événement lancé !",
      description: "L'événement est maintenant actif. Les paramètres sont figés."
    });
  };

  if (!event) {
    console.error('[EventManagement] Event not found:', { 
      eventId, 
      eventIdType: typeof eventId,
      availableEvents: allEvents.map(e => ({ id: e.id, idType: typeof e.id, title: e.title }))
    });
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground text-lg">Événement introuvable</p>
        <p className="text-sm text-muted-foreground">ID recherché: {String(eventId)}</p>
        <Button onClick={onBack} className="mt-4 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  // Ouvrir automatiquement la section participants pour les organisateurs
  useEffect(() => {
    console.log('[EventManagement] 🔄 Checking if should open participants section:', {
      hasEvent: !!event,
      eventId: event?.id,
      isOrganizer,
      currentUserId,
      organizerId: event?.organizerId,
      currentAccordionValue: accordionValue
    });
    
    if (event && isOrganizer) {
      console.log('[EventManagement] ✅ Opening participants section for organizer');
      setAccordionValue(prev => {
        if (!prev.includes('participants')) {
          const newValue = [...prev, 'participants'];
          console.log('[EventManagement] ✅ Updated accordion value:', newValue);
          return newValue;
        }
        console.log('[EventManagement] ℹ️ Participants section already open');
        return prev;
      });
    } else {
      console.log('[EventManagement] ⚠️ Cannot open participants section:', {
        hasEvent: !!event,
        isOrganizer,
        reason: !event ? 'No event' : !isOrganizer ? 'Not organizer' : 'Unknown'
      });
    }
  }, [event?.id, isOrganizer, currentUserId]);

  // Charger les demandes de participation depuis Firestore
  useEffect(() => {
    console.log('[EventManagement] 🔍 useEffect for loading join requests:', {
      hasEvent: !!event,
      eventId: event?.id,
      eventCode: event?.code,
      isOrganizer,
      currentUserId,
      organizerId: event?.organizerId,
      match: currentUserId === event?.organizerId
    });
    
    if (!event || !event.id || !event.code) {
      console.log('[EventManagement] ⚠️ Cannot load join requests: missing event, event.id, or event.code');
      return;
    }

    // IMPORTANT: Trouver l'ID Firestore réel de l'événement en utilisant le code
    // Car les demandes sont créées avec l'ID Firestore, pas l'ID local
    const loadJoinRequests = async () => {
      setLoadingJoinRequests(true);
      try {
        console.log('[EventManagement] 🔍 ===== LOADING JOIN REQUESTS =====');
        console.log('[EventManagement] 🔍 Event details:', {
          localEventId: event.id,
          eventCode: event.code,
          eventTitle: event.title,
          organizerId: event.organizerId
        });
        
        // Chercher l'événement dans Firestore par code pour obtenir le vrai ID Firestore
        const { findEventByCode } = await import('@/services/api');
        console.log('[EventManagement] 🔍 Searching event in Firestore with code:', event.code);
        let firestoreEvent = await findEventByCode(event.code);
        
        // Si pas trouvé, essayer de chercher directement par ID local (au cas où l'ID local = ID Firestore)
        if (!firestoreEvent && event.id) {
          console.log('[EventManagement] 🔍 Event not found by code, checking if local ID exists in Firestore:', event.id);
          try {
            const { doc, getDoc, collection, getDocs, query, where } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            
            // D'abord, vérifier si l'ID local existe directement
            const eventDocRef = doc(db, 'events', event.id);
            const eventDoc = await getDoc(eventDocRef);
            
            if (eventDoc.exists()) {
              const eventData = eventDoc.data();
              console.log('[EventManagement] ✅ Local ID exists in Firestore!', {
                eventId: event.id,
                code: eventData.code,
                title: eventData.title
              });
              
              // Utiliser cet événement même si le code ne correspond pas exactement
              // (le code peut avoir été modifié ou mal synchronisé)
              firestoreEvent = {
                id: event.id,
                code: eventData.code,
                title: eventData.title,
                organizerId: eventData.organizerId,
                organizerName: eventData.organizerName || '',
                participants: [] // Les participants seront chargés séparément si besoin
              };
              console.log('[EventManagement] ✅ Using event found by ID (code may differ)');
            } else {
              // Si l'ID local n'existe pas, chercher tous les événements de l'organisateur
              console.log('[EventManagement] 🔍 Local ID not found, searching all events by organizer...');
              if (event.organizerId) {
                const eventsRef = collection(db, 'events');
                const q = query(eventsRef, where('organizerId', '==', event.organizerId));
                const snapshot = await getDocs(q);
                
                console.log('[EventManagement] 📊 Found', snapshot.size, 'events for organizer');
                console.log('[EventManagement] 📊 Local event code:', event.code);
                console.log('[EventManagement] 📊 Local event code cleaned:', event.code?.toUpperCase()?.replace(/[^A-Z]/g, '') || '');
                
                // Chercher un événement avec le même code (même si l'ID diffère)
                const localCode = event.code?.toUpperCase()?.replace(/[^A-Z]/g, '') || '';
                console.log('[EventManagement] 🔍 Searching for code:', localCode);
                
                const allCodes = [];
                for (const docSnap of snapshot.docs) {
                  const eventData = docSnap.data();
                  const firestoreCode = eventData.code?.toUpperCase()?.replace(/[^A-Z]/g, '') || '';
                  allCodes.push({
                    id: docSnap.id,
                    code: eventData.code,
                    codeCleaned: firestoreCode,
                    title: eventData.title
                  });
                  
                  console.log('[EventManagement] 🔍 Comparing:', {
                    localCode,
                    firestoreCode,
                    match: localCode === firestoreCode,
                    eventId: docSnap.id,
                    eventTitle: eventData.title
                  });
                  
                  if (localCode === firestoreCode) {
                    console.log('[EventManagement] ✅✅✅ FOUND EVENT WITH MATCHING CODE!', {
                      firestoreId: docSnap.id,
                      localId: event.id,
                      code: eventData.code,
                      title: eventData.title
                    });
                    firestoreEvent = {
                      id: docSnap.id,
                      code: eventData.code,
                      title: eventData.title,
                      organizerId: eventData.organizerId,
                      organizerName: eventData.organizerName || '',
                      participants: []
                    };
                    break;
                  }
                }
                
                if (!firestoreEvent) {
                  console.error('[EventManagement] ❌ Event not found among organizer events');
                  console.error('[EventManagement] 📋 All codes found:', allCodes);
                  console.error('[EventManagement] 🔍 Looking for:', localCode);
                }
              }
            }
          } catch (error) {
            console.warn('[EventManagement] ⚠️ Error checking local ID in Firestore:', error);
          }
        }
        
        if (!firestoreEvent) {
          console.error('[EventManagement] ❌ Event not found in Firestore by code:', event.code);
          console.log('[EventManagement] 🔍 Trying alternative code formats...');
          
          // Essayer différentes variations du code
          const codeVariations = [
            event.code.trim().toUpperCase(),
            event.code.trim().toUpperCase().replace(/[^A-Z]/g, ''),
            event.code.trim()
          ];
          
          for (const variation of codeVariations) {
            if (variation && variation.length >= 8 && variation !== event.code) {
              console.log('[EventManagement] 🔍 Trying code variation:', variation);
              try {
                firestoreEvent = await findEventByCode(variation);
                if (firestoreEvent) {
                  console.log('[EventManagement] ✅ Event found with variation:', variation);
                  break;
                }
              } catch (err) {
                console.warn('[EventManagement] Variation failed:', variation, err);
              }
            }
          }
        }
        
        if (!firestoreEvent) {
          console.error('[EventManagement] ❌ Event still not found in Firestore after trying variations');
          console.log('[EventManagement] ⚠️ Will try with local eventId:', event.id);
          console.log('[EventManagement] 💡 This might mean:');
          console.log('[EventManagement] 💡 1. Event was created locally but not synced to Firestore');
          console.log('[EventManagement] 💡 2. Event code in Firestore is different from local code');
          console.log('[EventManagement] 💡 3. Event needs to be recreated in Firestore');
          console.log('[EventManagement] ⚠️ IMPORTANT: Join requests are created with Firestore ID, not local ID!');
          console.log('[EventManagement] ⚠️ If local ID != Firestore ID, join requests won\'t be found!');
          
          // Dernière tentative : chercher tous les événements de l'organisateur et trouver celui avec le même code
          if (event.organizerId && !firestoreEvent) {
            console.log('[EventManagement] 🔍 Last attempt: searching all events by organizer and matching by code...');
            try {
              const { collection, getDocs, query, where } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase');
              const eventsRef = collection(db, 'events');
              const q = query(eventsRef, where('organizerId', '==', event.organizerId));
              const snapshot = await getDocs(q);
              
              console.log('[EventManagement] 📊 Found', snapshot.size, 'events for organizer');
              
              // Chercher un événement avec le même code
              const localCode = event.code?.toUpperCase()?.replace(/[^A-Z]/g, '') || '';
              console.log('[EventManagement] 🔍 Searching for code:', localCode);
              console.log('[EventManagement] 🔍 Local event code (original):', event.code);
              
              const allCodes = [];
              for (const docSnap of snapshot.docs) {
                const eventData = docSnap.data();
                const firestoreCode = eventData.code?.toUpperCase()?.replace(/[^A-Z]/g, '') || '';
                allCodes.push({
                  id: docSnap.id,
                  code: eventData.code,
                  codeCleaned: firestoreCode,
                  title: eventData.title
                });
                
                console.log('[EventManagement] 🔍 Comparing:', {
                  localCode,
                  firestoreCode,
                  match: localCode === firestoreCode,
                  eventId: docSnap.id,
                  eventTitle: eventData.title,
                  originalCode: eventData.code
                });
                
                if (localCode === firestoreCode) {
                  console.log('[EventManagement] ✅✅✅ FOUND EVENT BY ORGANIZER + CODE!', {
                    firestoreId: docSnap.id,
                    localId: event.id,
                    code: eventData.code,
                    title: eventData.title
                  });
                  firestoreEvent = {
                    id: docSnap.id,
                    code: eventData.code,
                    title: eventData.title,
                    organizerId: eventData.organizerId,
                    organizerName: eventData.organizerName || '',
                    participants: []
                  };
                  break;
                }
              }
              
              if (!firestoreEvent) {
                console.error('[EventManagement] ❌ Event not found among organizer events');
                console.error('[EventManagement] 📋 All codes found in Firestore:', allCodes);
                console.error('[EventManagement] 🔍 Looking for code:', localCode);
                console.error('[EventManagement] 💡 Possible reasons:');
                console.error('[EventManagement] 💡 1. Event was never created in Firestore');
                console.error('[EventManagement] 💡 2. Event code in Firestore is different');
                console.error('[EventManagement] 💡 3. Event was created by a different organizer');
                
                // Afficher les codes trouvés pour débogage
                console.log('[EventManagement] 📋 Detailed codes found:');
                allCodes.forEach((c, index) => {
                  console.log(`[EventManagement]   ${index + 1}. ID: ${c.id}, Code: ${c.code}, Code cleaned: ${c.codeCleaned}, Title: ${c.title}`);
                });
              }
            } catch (error) {
              console.error('[EventManagement] ❌ Error searching by organizer:', error);
            }
          }
          
          // Fallback: utiliser l'ID local et vérifier s'il existe dans Firestore
          if (!firestoreEvent) {
            console.log('[EventManagement] 🔍 ===== CHECKING LOCAL EVENT ID =====');
            console.log('[EventManagement] 🔍 Local event ID:', event.id);
            console.log('[EventManagement] 🔍 Local event code:', event.code);
            try {
              // Vérifier d'abord si l'ID local existe dans Firestore
              console.log('[EventManagement] 🔍 Checking if local event ID exists in Firestore...');
              const { doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase');
              const eventDocRef = doc(db, 'events', event.id);
              const eventDoc = await getDoc(eventDocRef);
              console.log('[EventManagement] 🔍 Event document exists:', eventDoc.exists());
              
              if (eventDoc.exists()) {
                console.log('[EventManagement] ✅ Local eventId exists in Firestore, using it');
          const requests = await getJoinRequests(event.id, 'pending');
                console.log('[EventManagement] ⚠️ Using local eventId, found', requests.length, 'requests');
                setFirestoreJoinRequests(requests);
                setLoadingJoinRequests(false);
                return;
              } else {
                console.error('[EventManagement] ❌ Local eventId does NOT exist in Firestore!');
                console.error('[EventManagement] ❌ This means join requests cannot be found with this ID');
                console.error('[EventManagement] ❌ Join requests are stored with Firestore ID, not local ID');
                console.log('[EventManagement] 🔄 Attempting to sync local event to Firestore...');
                
                // Essayer de synchroniser l'événement local avec Firestore
                try {
                  const { createEvent } = await import('@/services/api');
                  
                  // Préparer les données de l'événement pour Firestore
                  const eventDataToSync = {
                    title: event.title,
                    description: event.description || '',
                    code: event.code,
                    location: event.location || null,
                    startDate: event.startDate instanceof Date ? event.startDate.toISOString().split('T')[0] : event.startDate,
                    endDate: event.endDate instanceof Date ? event.endDate.toISOString().split('T')[0] : event.endDate,
                    amount: event.amount || 0,
                    deadline: event.deadline || 30,
                    expectedParticipants: event.expectedParticipants || event.participants?.length || 1,
                    currency: event.currency || 'EUR',
                    organizerId: event.organizerId,
                    organizerName: event.organizerName || '',
                    participants: event.participants || []
                  };
                  
                  console.log('[EventManagement] 📝 Syncing event to Firestore:', {
                    code: eventDataToSync.code,
                    title: eventDataToSync.title,
                    organizerId: eventDataToSync.organizerId
                  });
                  
                  const syncResult = await createEvent(eventDataToSync);
                  
                  if (syncResult && syncResult.eventId) {
                    console.log('[EventManagement] ✅ Event synced to Firestore!', {
                      newFirestoreId: syncResult.eventId,
                      oldLocalId: event.id
                    });
                    
                    // Mettre à jour l'ID de l'événement local avec l'ID Firestore
                    const updateEvent = useEventStore.getState().updateEvent;
                    updateEvent(event.id, { id: syncResult.eventId });
                    
                    // Maintenant chercher les demandes avec le nouvel ID Firestore
                    const requests = await getJoinRequests(syncResult.eventId, 'pending');
                    console.log('[EventManagement] ✅ Found', requests.length, 'join requests after sync');
          setFirestoreJoinRequests(requests);
          setLoadingJoinRequests(false);
          return;
                  }
                } catch (syncError) {
                  console.error('[EventManagement] ❌ Error syncing event to Firestore:', syncError);
                  console.error('[EventManagement] ❌ Error details:', {
                    message: syncError.message,
                    name: syncError.name,
                    stack: syncError.stack
                  });
                  console.error('[EventManagement] ❌ This might mean the code already exists or there was a network error');
                  
                  // Si le code existe déjà, essayer de le trouver
                  if (syncError.message && (syncError.message.includes('existe déjà') || syncError.message.includes('already exists'))) {
                    console.log('[EventManagement] 🔍 Code already exists, trying to find it...');
                    try {
                      const { findEventByCode } = await import('@/services/api');
                      const existingEvent = await findEventByCode(event.code);
                      if (existingEvent) {
                        console.log('[EventManagement] ✅ Found existing event in Firestore!', {
                          firestoreId: existingEvent.id,
                          localId: event.id
                        });
                        const requests = await getJoinRequests(existingEvent.id, 'pending');
                        setFirestoreJoinRequests(requests);
                        setLoadingJoinRequests(false);
                        return;
                      } else {
                        console.error('[EventManagement] ❌ Code exists but event not found by code - this is strange');
                      }
                    } catch (findError) {
                      console.error('[EventManagement] ❌ Error finding existing event:', findError);
                    }
                  }
                  
                  // Afficher un toast pour informer l'utilisateur
                  toast({
                    variant: "destructive",
                    title: "Erreur de synchronisation",
                    description: "Impossible de synchroniser l'événement avec le serveur. Les demandes de participation ne peuvent pas être chargées.",
                    duration: 5000
                  });
                }
                
                // Si la synchronisation échoue, afficher un message d'erreur
                console.error('[EventManagement] ❌ Could not sync event to Firestore');
                setFirestoreJoinRequests([]);
                setLoadingJoinRequests(false);
                return;
              }
            } catch (error) {
              console.error('[EventManagement] ❌ Error checking/ fetching with local eventId:', error);
              console.error('[EventManagement] ❌ This confirms the event does not exist in Firestore');
              setFirestoreJoinRequests([]);
              setLoadingJoinRequests(false);
              return;
            }
          }
        }
        
        const firestoreEventId = firestoreEvent.id;
        console.log('[EventManagement] ✅ Firestore event found:', {
          firestoreEventId,
          localEventId: event.id,
          eventCode: event.code,
          match: firestoreEventId === event.id
        });
        
        if (firestoreEventId !== event.id) {
          console.warn('[EventManagement] ⚠️ Event ID mismatch!', {
            localId: event.id,
            firestoreId: firestoreEventId,
            eventCode: event.code
          });
          console.log('[EventManagement] ⚠️ IMPORTANT: Using Firestore ID for join requests (not local ID)');
          console.log('[EventManagement] ⚠️ This is correct - join requests are stored with Firestore ID');
          
          // Stocker l'ID Firestore dans l'événement local pour l'utiliser dans handleAccept
          const updateEvent = useEventStore.getState().updateEvent;
          if (!event.firestoreId || event.firestoreId !== firestoreEventId) {
            updateEvent(event.id, { firestoreId: firestoreEventId });
            console.log('[EventManagement] ✅ Firestore ID stored in event:', firestoreEventId);
          }
        }
        
        console.log('[EventManagement] 🔍 Calling getJoinRequests with Firestore eventId:', {
          firestoreEventId,
          localEventId: event.id,
          eventCode: event.code,
          eventTitle: event.title,
          status: 'pending',
          note: 'Using Firestore ID (not local ID) because join requests are created with Firestore ID'
        });
        
        const requests = await getJoinRequests(firestoreEventId, 'pending');
        
        console.log('[EventManagement] ✅ ===== JOIN REQUESTS LOADED =====');
        console.log('[EventManagement] ✅ Firestore Event ID used:', firestoreEventId);
        console.log('[EventManagement] ✅ Local Event ID:', event.id);
        console.log('[EventManagement] ✅ Count:', requests.length);
        console.log('[EventManagement] ✅ Requests:', requests.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          status: r.status,
          userId: r.userId,
          requestedAt: r.requestedAt
        })));
        
        setFirestoreJoinRequests(requests);
        
        if (requests.length > 0) {
          console.log('[EventManagement] 🔔 ===== NEW JOIN REQUESTS FOUND! =====');
          console.log('[EventManagement] 🔔 Organizer should see them in the UI now!');
          console.log('[EventManagement] 📋 Full request details:', JSON.stringify(requests, null, 2));
        } else {
          console.log('[EventManagement] ℹ️ No pending join requests found for this event');
          console.log('[EventManagement] ℹ️ This could mean:');
          console.log('[EventManagement] ℹ️ 1. No requests have been created yet');
          console.log('[EventManagement] ℹ️ 2. All requests have been processed');
          console.log('[EventManagement] ℹ️ 3. Requests exist but with different status');
        }
      } catch (error) {
        console.error('[EventManagement] ❌ ===== ERROR LOADING JOIN REQUESTS =====');
        console.error('[EventManagement] ❌ Error:', error);
        console.error('[EventManagement] ❌ Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          eventId: event.id
        });
        // En cas d'erreur, continuer avec les demandes locales
        setFirestoreJoinRequests([]);
      } finally {
        setLoadingJoinRequests(false);
        console.log('[EventManagement] ✅ Loading complete, loadingJoinRequests set to false');
      }
    };

    // Charger immédiatement
    console.log('[EventManagement] 🚀 Starting join requests loading...');
    loadJoinRequests();
    
    // Recharger les demandes toutes les 5 secondes pour détecter rapidement les nouvelles demandes
    console.log('[EventManagement] ⏰ Setting up interval to refresh every 5 seconds');
    const interval = setInterval(() => {
      console.log('[EventManagement] ⏰ Interval triggered - refreshing join requests');
      loadJoinRequests();
    }, 5000);
    
    return () => {
      console.log('[EventManagement] 🧹 Cleaning up join requests interval');
      clearInterval(interval);
    };
  }, [event?.id, event?.code, isOrganizer, currentUserId]);

  console.log('[EventManagement] Event loaded:', {
    id: event.id,
    code: event.code,
    title: event.title,
    participantsCount: event.participants?.length || 0
  });

  // Ne plus utiliser de fallback avec des points génériques
  // On utilise uniquement les points d'intérêt réels récupérés depuis l'API

  // Calculer la distance entre deux points GPS (formule de Haversine)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Utiliser UNIQUEMENT les points d'intérêt réels sauvegardés dans l'événement
  // Pas de fallback avec des points génériques
  const locationPOI = event.location?.pointsOfInterest || [];
  const eventCoords = event.location?.coordinates;
  
  // Trier par rating décroissant et limiter aux 3-5 meilleurs
  const spots = locationPOI
    .filter(poi => poi.rating && poi.rating >= 3.5) // Filtrer les points avec au moins 2 avis (rating >= 3.5)
    .sort((a, b) => {
      // Trier par rating décroissant, puis par nombre d'avis
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.totalReviews || 0) - (a.totalReviews || 0);
    })
    .slice(0, 5) // Limiter aux 5 meilleurs
    .map(poi => {
        let distance = 'N/A';
        if (poi.coordinates && eventCoords) {
          const dist = calculateDistance(
            eventCoords.lat,
            eventCoords.lng,
            poi.coordinates.lat,
            poi.coordinates.lng
          );
          distance = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`;
        }
        
        // Déterminer la catégorie depuis les types
        let category = 'Général';
        if (poi.types && poi.types.length > 0) {
          const typeMap = {
            'museum': 'Musée',
            'art_gallery': 'Art',
            'church': 'Religieux',
            'mosque': 'Religieux',
            'temple': 'Religieux',
            'park': 'Nature',
            'tourist_attraction': 'Tourisme',
            'landmark': 'Monument',
            'shopping_mall': 'Shopping',
            'zoo': 'Nature',
            'aquarium': 'Nature',
            'stadium': 'Sport',
            'amusement_park': 'Divertissement',
            'restaurant': 'Restaurant',
            'cafe': 'Café',
            'bar': 'Bar',
            'hotel': 'Hébergement',
            'lodging': 'Hébergement'
          };
          category = typeMap[poi.types[0]] || poi.types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Général';
        }
        
        return {
        name: poi.name,
        rating: poi.rating,
          category: category,
          distance: distance,
        totalReviews: poi.totalReviews || 0
        };
      });

  const handleShareLocation = () => {
    console.log('[EventManagement] Sharing location:', event.location);
    if (navigator.share && event.location) {
      navigator.share({
        title: `Lieu de l'événement: ${event.title}`,
        text: `Rejoignez-nous à: ${event.location}`,
        url: window.location.href
      }).catch(err => console.error('[EventManagement] Share error:', err));
    }
  };
const handleExportPDF = () => {
  console.log('[PDF] Exporting comprehensive event summary:', event.title);
  
  try {
    // Fonction helper pour obtenir le texte du lieu
    const getLocationText = (loc) => {
      if (!loc) return '';
      if (typeof loc === 'string') return loc;
      return loc.address || loc.displayName || '';
    };
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    
    // Fonction pour vérifier si nouvelle page nécessaire
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - margin - 15) { // Réserver 15px pour le footer
        doc.addPage();
        yPosition = margin + 10; // Espacement en haut de page
        return true;
      }
      return false;
    };
    
    // Fonction pour ajouter le footer sur chaque page
    const addFooter = () => {
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont(undefined, 'normal');
        
        // Numéro de page
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin - 20, pageHeight - 8);
        
        // Tagline Bonkont centré en bas
        const tagline = 'Bonkont fait les comptes, les Amis font le reste';
        const taglineWidth = doc.getTextWidth(tagline);
        doc.text(tagline, (pageWidth - taglineWidth) / 2, pageHeight - 8);
        
        // Code événement à gauche
        doc.text(`BONKONT - ${event.code}`, margin, pageHeight - 8);
        
        // Ligne de séparation fine
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      }
    };
    
    // ===== EN-TÊTE =====
    doc.setFontSize(24);
    doc.setTextColor(99, 102, 241); // Couleur primary
    doc.setFont(undefined, 'bold');
    doc.text('BILAN ÉVÉNEMENTIEL', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, 'italic');
    doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, margin, yPosition);
    yPosition += 12;
    
    // Message d'introduction rassurant
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const introText = 'Ce document présente une répartition équitable et transparente de vos dépenses partagées.';
    const introLines = doc.splitTextToSize(introText, pageWidth - 2 * margin);
    introLines.forEach((line, idx) => {
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'italic');
    const introSubText = 'Chaque contribution, chaque dépense, chaque remboursement est tracé et équilibré en temps réel.';
    const introSubLines = doc.splitTextToSize(introSubText, pageWidth - 2 * margin);
    introSubLines.forEach((line, idx) => {
      doc.text(line, margin, yPosition);
      yPosition += 4;
    });
    yPosition += 10;
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    // ===== INFORMATIONS GÉNÉRALES DE L'ÉVÉNEMENT =====
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Informations Générales', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    const infoLabels = [
      ['Nom de l\'événement:', event.title || 'N/A'],
      ['Code événement:', event.code || 'N/A'],
      ['Description:', event.description || 'Aucune description'],
      ['Lieu:', getLocationText(event.location) || 'Non spécifié'],
      ['Date de début:', event.startDate ? format(new Date(event.startDate), 'dd MMMM yyyy', { locale: fr }) : 'N/A'],
      ['Date limite:', event.deadline ? `${event.deadline} jours` : 'N/A'],
    ];
    
    infoLabels.forEach(([label, value]) => {
      checkNewPage(10);
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPosition);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + labelWidth + 5, yPosition);
      yPosition += 7;
    });
    
    yPosition += 5;
    
    // ===== BUDGET ET FINANCES =====
    checkNewPage(30);
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Budget et Finances', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    const totalBudget = event.amount || 0;
    const participantsCount = participants.length || 1;
    const montantParPersonne = totalBudget / participantsCount;
    
    // Calculer le total payé (utiliser getContributionToPot() comme source unique de vérité)
    let totalPaye = 0;
    participants.forEach(p => {
      totalPaye += getContributionToPot(p.id, event, transactions);
    });
    
    const resteAPayer = Math.max(0, totalBudget - totalPaye);
    const tauxCollecte = totalBudget > 0 ? (totalPaye / totalBudget * 100) : 0;
    
    // Calculer le délai restant
    let delaiRestant = 'N/A';
    if (event.startDate && event.deadline) {
      const startDate = new Date(event.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (event.deadline || 0));
      const today = new Date();
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        delaiRestant = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      } else if (diffDays === 0) {
        delaiRestant = 'Aujourd\'hui';
      } else {
        delaiRestant = `Dépassé de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
      }
    }
    
    const financeLabels = [
      ['Budget total:', `${totalBudget.toFixed(2)} €`],
      ['Montant par personne:', `${montantParPersonne.toFixed(2)} €`],
      ['Total payé:', `${totalPaye.toFixed(2)} €`],
      ['Reste à payer:', `${resteAPayer.toFixed(2)} €`],
      ['Taux de collecte:', `${tauxCollecte.toFixed(1)}%`],
      ['Délai restant:', delaiRestant],
    ];
    
    financeLabels.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPosition);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + labelWidth + 5, yPosition);
      yPosition += 7;
    });
    
    yPosition += 10;
    
    // ===== TABLEAU DES PARTICIPANTS =====
    checkNewPage(40);
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Participants', margin, yPosition);
    yPosition += 6;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'italic');
    doc.text('Un aperçu de la participation de chacun au budget de l\'événement.', margin, yPosition);
    yPosition += 8;
    
    const participantsTableData = participants.map((p) => {
      const stats = getParticipantStats(p);
      // Construire le nom du participant avec toutes les options possibles
      let participantName = 'Participant inconnu';
      if (p.name) {
        participantName = p.name;
      } else if (p.firstName && p.lastName) {
        participantName = `${p.firstName} ${p.lastName}`.trim();
      } else if (p.firstName) {
        participantName = p.firstName;
      } else if (p.lastName) {
        participantName = p.lastName;
      } else if (p.email) {
        participantName = p.email;
      } else if (p.mobile) {
        participantName = p.mobile;
      }
      return [
        participantName,
        `${stats.totalDue.toFixed(2)} €`,
        `${stats.paid.toFixed(2)} €`,
        `${stats.remaining.toFixed(2)} €`,
        stats.hasPaid ? 'Oui' : 'Non',
        `${stats.score}%`,
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Participant', 'Dû', 'Payé', 'Reste', 'Payé?', 'Score']],
      body: participantsTableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: margin, right: margin },
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
    
    // ===== DÉTAIL DES TRANSACTIONS PAR PARTICIPANT =====
    if (transactions && transactions.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Détail des Transactions', margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'italic');
      doc.text('Toutes les transactions validées collectivement, tracées et équilibrées.', margin, yPosition);
      yPosition += 10;
      
      // Grouper les transactions par participant
      const transactionsByParticipant = {};
      transactions.forEach(transaction => {
        if (transaction.participants && transaction.participants.length > 0) {
          transaction.participants.forEach(participantId => {
            if (!transactionsByParticipant[participantId]) {
              transactionsByParticipant[participantId] = [];
            }
            transactionsByParticipant[participantId].push(transaction);
          });
        }
      });
      
      // Pour chaque participant avec des transactions
      Object.keys(transactionsByParticipant).forEach(participantId => {
        // Chercher le participant avec comparaison flexible des IDs (string/number)
        const participant = participants.find(p => 
          String(p.id) === String(participantId) || 
          p.id === participantId ||
          String(p.id) === participantId ||
          p.id === String(participantId)
        );
        
        // Construire le nom du participant avec toutes les options possibles
        let participantName = 'Participant inconnu';
        if (participant) {
          if (participant.name) {
            participantName = participant.name;
          } else if (participant.firstName && participant.lastName) {
            participantName = `${participant.firstName} ${participant.lastName}`.trim();
          } else if (participant.firstName) {
            participantName = participant.firstName;
          } else if (participant.lastName) {
            participantName = participant.lastName;
          } else if (participant.email) {
            participantName = participant.email;
          } else if (participant.mobile) {
            participantName = participant.mobile;
          }
        }
        
        console.log('[EventManagement PDF] Participant found:', {
          participantId,
          participant,
          participantName,
          participantIds: participants.map(p => ({ id: p.id, name: p.name, type: typeof p.id }))
        });
        
        const participantTransactions = transactionsByParticipant[participantId];
        
        checkNewPage(30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text(`${participantName}`, margin, yPosition);
        yPosition += 8;
        
        const transactionsTableData = participantTransactions.map(t => {
          const date = t.date ? format(new Date(t.date), 'dd/MM/yyyy', { locale: fr }) : 'N/A';
          const time = t.time || '';
          const store = t.store || 'N/A';
          const amount = `${(t.amount || 0).toFixed(2)} €`;
          const currency = t.currency || 'EUR';
          return [date, time, store, amount, currency];
        });
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Date', 'Heure', 'Magasin', 'Montant', 'Devise']],
          body: transactionsTableData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          margin: { left: margin, right: margin },
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
      });
    } else {
      checkNewPage(10);
      doc.setFontSize(11);
      doc.setTextColor(150, 150, 150);
      doc.text('Aucune transaction enregistrée', margin, yPosition);
      yPosition += 10;
    }
    
    // ===== RÉPARTITION PROVISOIRE (QUI DOIT À QUI) =====
    checkNewPage(40);
    doc.setFontSize(18);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Répartition Équitable', margin, yPosition);
    yPosition += 8;
    
    // Message rassurant sur la répartition
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const repartText = 'Notre logique de répartition en direct : "Que je paie ou dépense, tu me rembourses équitablement, on est quittes".';
    const repartLines = doc.splitTextToSize(repartText, pageWidth - 2 * margin);
    repartLines.forEach((line, idx) => {
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 3;
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, 'italic');
    doc.text('Basée sur les transactions validées collectivement à ce jour', margin, yPosition);
    yPosition += 10;
    
    // Calculer les soldes
    const balancesResult = computeBalances(event, transactions);
    const { balances } = balancesResult;
    const transfersResult = computeTransfers(balancesResult);
    const transfers = transfersResult.transfers || [];
    
    // Afficher un avertissement si répartition incomplète
    if (transfersResult.warning) {
      checkNewPage(30);
      doc.setFontSize(11);
      doc.setTextColor(239, 68, 68); // Rouge
      doc.setFont(undefined, 'bold');
      doc.text('[ATTENTION] Répartition incomplète', margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, 'normal');
      const warningLines = doc.splitTextToSize(transfersResult.warning, pageWidth - 2 * margin);
      warningLines.forEach((line, idx) => {
        checkNewPage(5);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      
      // Message informatif sur les contributions réelles vs théoriques
      if (transfersResult.warning && transfersResult.warning.includes('contribution réelle')) {
        checkNewPage(15);
        yPosition += 5;
        doc.setFontSize(10);
        doc.setTextColor(59, 130, 246); // Bleu
        doc.setFont(undefined, 'bold');
        doc.text('[INFORMATION IMPORTANTE]', margin, yPosition);
        yPosition += 6;
        doc.setFontSize(9);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined, 'normal');
        const infoText = `Le budget théorique fixé au départ est UNIQUEMENT un repère indicatif à ne pas dépasser. ` +
                        `Seules les contributions RÉELLES (paiements en espèces, virements, etc.) doivent être enregistrées et prises en compte. ` +
                        `Un déséquilibre temporaire est normal tant que les contributions réelles n'ont pas encore été enregistrées.`;
        const infoLines = doc.splitTextToSize(infoText, pageWidth - 2 * margin);
        infoLines.forEach((line, idx) => {
          checkNewPage(5);
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
      }
      
      if (balancesResult.totalSolde && Math.abs(balancesResult.totalSolde) > 0.01) {
        checkNewPage(8);
        yPosition += 2;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont(undefined, 'italic');
        doc.text(`Écart détecté : ${balancesResult.totalSolde.toFixed(2)}€`, margin, yPosition);
        yPosition += 5;
      }
      checkNewPage(10);
      yPosition += 5;
    }
    
    // ===== MESSAGE RASSURANT SUR L'ÉQUILIBRE =====
    if (transfersResult.isBalanced) {
      checkNewPage(20);
      doc.setFontSize(10);
      doc.setTextColor(34, 197, 94); // Vert
      doc.setFont(undefined, 'bold');
      doc.text('[EQUILIBRE] Répartition équilibrée et transparente', margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const equilibreText = 'Tous les comptes sont équilibrés. La somme des soldes finaux est égale à 0€, ce qui garantit que chaque euro dépensé est correctement réparti entre tous les participants.';
      const equilibreLines = doc.splitTextToSize(equilibreText, pageWidth - 2 * margin);
      equilibreLines.forEach((line, idx) => {
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 8;
    } else if (transfersResult.warning) {
      checkNewPage(25);
      doc.setFontSize(10);
      doc.setTextColor(251, 146, 60); // Orange
      doc.setFont(undefined, 'bold');
      doc.text('[INFORMATION] Information importante', margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const infoText = 'Ce bilan est calculé en temps réel à partir des transactions validées. Les contributions vers la cagnotte et les dépenses partagées sont tracées avec précision pour garantir une répartition équitable.';
      const infoLines = doc.splitTextToSize(infoText, pageWidth - 2 * margin);
      infoLines.forEach((line, idx) => {
        checkNewPage(5);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      checkNewPage(10);
      yPosition += 8;
    }
    
    // ===== LA RÈGLE BONKONT =====
    checkNewPage(35);
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('La Règle Bonkont', margin, yPosition);
    yPosition += 8;
    
    // Phrase principale
    doc.setFontSize(11);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    const ruleText = '"Tu Valides, Tu consommes, Tu reçois ou Tu verses, Tu es Quittes"';
    const ruleLines = doc.splitTextToSize(ruleText, pageWidth - 2 * margin);
    ruleLines.forEach((line, idx) => {
      checkNewPage(6);
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'italic');
    checkNewPage(5);
    doc.text('C\'est Transparent, c\'est Equitable, c\'est Bonkont', margin, yPosition);
    yPosition += 8;
    
    // Explication de la double règle
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const explicationText1 = 'La règle Bonkont s\'applique à TOUTES les transactions validées :';
    const explicationLines1 = doc.splitTextToSize(explicationText1, pageWidth - 2 * margin);
    explicationLines1.forEach((line, idx) => {
      checkNewPage(5);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    checkNewPage(15);
    yPosition += 3;
    
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const typesText = '• Contributions au POT : Validées ET partagées équitablement (tous les participants concernés consomment leur part)\n• Dépenses/Avances : Validées ET partagées équitablement\n• Transferts directs : Validés pour traçabilité (paiement direct)\n• Remboursements POT : Validés pour traçabilité (remboursement direct)';
    const typesLines = doc.splitTextToSize(typesText, pageWidth - 2 * margin - 5);
    typesLines.forEach((line, idx) => {
      checkNewPage(5);
      doc.text(line, margin + 10, yPosition);
      yPosition += 5;
    });
    checkNewPage(10);
    yPosition += 3;
    
    doc.setFontSize(9);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('1. La Validation :', margin + 5, yPosition);
    yPosition += 5;
    
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const validationText = 'La validation de TOUTE transaction déclenche la règle Bonkont. Pour les dépenses/avances : seuls les participants qui valident sont concernés par la répartition équitable. La validation (complète ou partielle) détermine qui consomme et qui doit rembourser.';
    const validationLines = doc.splitTextToSize(validationText, pageWidth - 2 * margin - 5);
    validationLines.forEach((line, idx) => {
      checkNewPage(5);
      doc.text(line, margin + 10, yPosition);
      yPosition += 5;
    });
    checkNewPage(10);
    yPosition += 3;
    
    doc.setFontSize(9);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('2. Le Calcul Équitable :', margin + 5, yPosition);
    yPosition += 5;
    
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const calculText = 'Toute avance étant validée par les participants, le payeur consomme au prorata sa part, et les autres participants concernés consomment aussi au prorata leur part. C\'est la logique de calcul équitable : chacun consomme sa part, le payeur reçoit le remboursement des autres.';
    const calculLines = doc.splitTextToSize(calculText, pageWidth - 2 * margin - 5);
    calculLines.forEach((line, idx) => {
      checkNewPage(5);
      doc.text(line, margin + 10, yPosition);
      yPosition += 5;
    });
    checkNewPage(15);
    yPosition += 5;
    
    // Exemple concret
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Exemple concret :', margin, yPosition);
    yPosition += 6;
    
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    checkNewPage(5);
    doc.text('Scénario : 10 personnes participent à un événement. Alice effectue une dépense de 30€', margin + 5, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('pour un repas en ville. Alice, Bob et Charlie valident cette dépense. Les 7 autres', margin + 5, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('participants ne valident pas (ils sont restés sur site).', margin + 5, yPosition);
    yPosition += 6;
    
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94); // Vert
    doc.setFont(undefined, 'bold');
    checkNewPage(5);
    doc.text('Résultat selon la double règle Bonkont :', margin + 5, yPosition);
    yPosition += 5;
    
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    checkNewPage(5);
    doc.text('1. VALIDATION : Seuls Alice, Bob et Charlie sont concernés (ils ont validé)', margin + 10, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('2. CALCUL ÉQUITABLE : Chacun consomme sa part au prorata (30€ ÷ 3 = 10€)', margin + 10, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('• Alice a avancé 30€, elle consomme 10€ (sa part) → elle doit recevoir 20€', margin + 10, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('• Bob consomme 10€ (sa part) → il doit 10€ à Alice', margin + 10, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('• Charlie consomme 10€ (sa part) → il doit 10€ à Alice', margin + 10, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('• Les 7 autres participants sont exemptés (ils n\'ont pas validé)', margin + 10, yPosition);
    yPosition += 8;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'italic');
    checkNewPage(5);
    doc.text('Double règle Bonkont : La validation détermine qui est concerné, le calcul équitable garantit que chacun consomme sa part au prorata. C\'est transparent, équitable, et tout le monde est quitte !', margin, yPosition);
    checkNewPage(15);
    yPosition += 10;
    
    // Les 3 couches de vérité
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Les 3 couches de vérité Bonkont :', margin, yPosition);
    yPosition += 6;
    
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    checkNewPage(5);
    doc.text('• Contribution : Argent réellement versé dans la cagnotte (espèces, virement, CB)', margin + 5, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('• Avance : Dépenses payées pour le groupe (le payeur avance le montant total)', margin + 5, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('• Consommation : Votre part réelle au prorata des dépenses partagées (selon la validation)', margin + 5, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('  → Le payeur consomme sa part au prorata, comme tous les autres participants', margin + 10, yPosition);
    yPosition += 5;
    checkNewPage(5);
    doc.text('• Solde : Ce que vous devez recevoir ou verser pour être équitablement quittes', margin + 5, yPosition);
    checkNewPage(12);
    yPosition += 10;
    
    // Afficher les soldes détaillés par participant avec les 3 couches
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Soldes détaillés par participant', margin, yPosition);
    yPosition += 6;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'italic');
    doc.text('Chaque participant voit clairement sa contribution, ses avances, sa consommation et son solde équitable.', margin, yPosition);
    yPosition += 6;
    
    // Note importante sur la règle Bonkont
    doc.setFontSize(7);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('RÈGLE BONKONT - Consommation équitable:', margin, yPosition);
    yPosition += 4;
    
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const ruleNote = 'Quand un participant avance une dépense validée par d\'autres participants, le payeur consomme sa part au prorata, ET tous les autres participants concernés consomment aussi leur part au prorata. Exemple : Si A avance 36,61€ pour 8 participants, A consomme 4,58€ (sa part) et les 7 autres consomment aussi 4,58€ chacun.';
    const ruleNoteLines = doc.splitTextToSize(ruleNote, pageWidth - 2 * margin);
    ruleNoteLines.forEach((line, idx) => {
      doc.text(line, margin + 5, yPosition);
      yPosition += 4;
    });
    yPosition += 6;
    
    const detailedBalancesTableData = Object.values(balances).map(balance => {
      const formatted = formatBalance(balance);
      const solde = balance.solde || 0;
      const soldeText = formatted.status === 'doit_recevoir' 
        ? `+${solde.toFixed(2)} € (à recevoir)`
        : formatted.status === 'doit_verser'
          ? `${solde.toFixed(2)} € (à verser)`
          : '0,00 € (équilibré)';
      
      return [
        balance.participantName,
        `${(balance.contribution || 0).toFixed(2)} €`,
        `${(balance.avance || 0).toFixed(2)} €`,
        `${(balance.consomme || 0).toFixed(2)} €`,
        `${(balance.mise || 0).toFixed(2)} €`,
        soldeText
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Participant', 'Contribution', 'Avancé', 'Consommé', 'Mise', 'Solde']],
      body: detailedBalancesTableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 }
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
    
    // Afficher les transferts "qui verse à qui" - Vue globale
    // CORRECTION : Afficher même s'il y a des incohérences, mais avec un avertissement
    if (transfers.length > 0 || !transfersResult.isBalanced) {
      checkNewPage(30);
      doc.setFontSize(14);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Ajustements entre participants', margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const ajustementText = 'Pour équilibrer les comptes de manière juste et transparente, voici les transferts recommandés. Chaque montant est calculé pour garantir une répartition équitable.';
      const ajustementLines = doc.splitTextToSize(ajustementText, pageWidth - 2 * margin);
      ajustementLines.forEach((line, idx) => {
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
      
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, 'italic');
      doc.text('Basé sur les dépenses validées collectivement et les paiements enregistrés.', margin, yPosition);
      yPosition += 8;
      
      if (transfers.length > 0) {
        // Titre de la section des transferts
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
        doc.text('Qui verse à qui ?', margin, yPosition);
        yPosition += 8;
        
        const transfersTableData = transfers.map(t => [
          `${t.fromName}`,
          `${(t.amount || 0).toFixed(2)} €`,
          `${t.toName}`
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Qui verse', 'Montant', 'À qui']],
          body: transfersTableData,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 10 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold', textColor: [239, 68, 68] }, // Qui verse en rouge gras
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 60, fontStyle: 'bold', textColor: [34, 197, 94] } // À qui en vert gras
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
      } else {
        // Message rassurant même s'il n'y a pas de transferts
        checkNewPage(15);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'normal');
        const noTransfersText = 'Aucun transfert nécessaire pour le moment. Les comptes sont équilibrés ou en cours d\'équilibrage.';
        const noTransfersLines = doc.splitTextToSize(noTransfersText, pageWidth - 2 * margin);
        noTransfersLines.forEach((line, idx) => {
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
        yPosition += 8;
      }
      
      // Vue par participant - Transparence
      checkNewPage(25);
      doc.setFontSize(14);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Détail par participant', margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const detailText = 'Pour chaque participant, voici avec qui régulariser et les montants exacts. Tout est transparent et équitable.';
      const detailLines = doc.splitTextToSize(detailText, pageWidth - 2 * margin);
      detailLines.forEach((line, idx) => {
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 8;
      
      Object.values(balances).forEach((balance) => {
        const participantTransfers = getParticipantTransfers(balance.participantId, transfersResult);
        const solde = balance.solde || 0;
        const hasTransfers = participantTransfers.toReceive.length > 0 || participantTransfers.toPay.length > 0;
        
        // Toujours afficher le détail pour chaque participant
        checkNewPage(hasTransfers ? 25 : 20);
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
        doc.text(balance.participantName, margin, yPosition);
        yPosition += 6;
        
        // Détail financier
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'normal');
        doc.text(`Contribution: ${((balance.contribution || 0)).toFixed(2)}€ | Avancé: ${((balance.avance || 0)).toFixed(2)}€ | Consommé: ${((balance.consomme || 0)).toFixed(2)}€ | Mise: ${((balance.mise || 0)).toFixed(2)}€`, margin + 5, yPosition);
        yPosition += 5;
        
        // Solde avec explication
          doc.setFontSize(9);
        if (solde > 0.01) {
          doc.setTextColor(34, 197, 94); // Vert
          doc.setFont(undefined, 'bold');
          doc.text(`Solde: +${solde.toFixed(2)}€ (à recevoir)`, margin + 5, yPosition);
          yPosition += 5;
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.setFont(undefined, 'normal');
          doc.text(`Explication: Vous avez mis ${((balance.mise || 0)).toFixed(2)}€ et consommé ${((balance.consomme || 0)).toFixed(2)}€.`, margin + 5, yPosition);
          yPosition += 4;
          doc.text(`Vous devez donc recevoir ${solde.toFixed(2)}€ pour équilibrer votre compte.`, margin + 5, yPosition);
        } else if (solde < -0.01) {
          doc.setTextColor(239, 68, 68); // Rouge
          doc.setFont(undefined, 'bold');
          doc.text(`Solde: ${solde.toFixed(2)}€ (à verser)`, margin + 5, yPosition);
          yPosition += 5;
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.setFont(undefined, 'normal');
          doc.text(`Explication: Vous avez consommé ${((balance.consomme || 0)).toFixed(2)}€ alors que vous n'avez mis que ${((balance.mise || 0)).toFixed(2)}€.`, margin + 5, yPosition);
          yPosition += 4;
          doc.text(`Vous devez donc verser ${Math.abs(solde).toFixed(2)}€ pour équilibrer votre compte.`, margin + 5, yPosition);
        } else {
          doc.setTextColor(34, 197, 94); // Vert
          doc.setFont(undefined, 'bold');
          doc.text(`Solde: 0,00€ (équilibré)`, margin + 5, yPosition);
          yPosition += 5;
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.setFont(undefined, 'normal');
          doc.text(`Explication: Vous avez consommé exactement ce que vous avez mis (${((balance.mise || 0)).toFixed(2)}€).`, margin + 5, yPosition);
          yPosition += 4;
          doc.text(`Votre compte est équilibré, aucun ajustement n'est nécessaire.`, margin + 5, yPosition);
        }
        yPosition += 5;
        
        // ===== TRACABILITÉ DES DÉPENSES (RÈGLE BONKONT) =====
        // Montrer clairement que tous les participants concernés consomment leur part
        const traceability = getExpenseTraceability(balance.participantId, event, transactions);
        
        // Note importante sur la consommation totale
        checkNewPage(10);
        doc.setFontSize(7);
        doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
        const consommationTotal = (balance.consomme || 0).toFixed(2);
        const depensesAvanceesCount = traceability.depensesAvancees.length;
        const depensesConsommeesCount = traceability.depensesConsommees.length;
        doc.text(`Consommation totale: ${consommationTotal}€ = Votre part de vos avances (${depensesAvanceesCount}) + Votre part des avances des autres (${depensesConsommeesCount})`, margin + 5, yPosition);
        yPosition += 5;
        
        if (traceability.depensesAvancees.length > 0 || traceability.depensesConsommees.length > 0) {
        checkNewPage(15);
          doc.setFontSize(9);
          doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
          doc.text('Détail de la traçabilité (Règle Bonkont):', margin + 5, yPosition);
        yPosition += 6;
        
          // Dépenses avancées par ce participant
          if (traceability.depensesAvancees.length > 0) {
          doc.setFontSize(8);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'bold');
            doc.text('Dépenses avancées:', margin + 10, yPosition);
            yPosition += 5;
            
            traceability.depensesAvancees.forEach((dep) => {
              checkNewPage(8);
              doc.setFontSize(7);
              doc.setTextColor(60, 60, 60);
              doc.setFont(undefined, 'normal');
              const desc = dep.description || 'Dépense';
              const descShort = desc.length > 30 ? desc.substring(0, 27) + '...' : desc;
              doc.text(`• ${descShort}`, margin + 15, yPosition);
              yPosition += 4;
              
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);
              doc.setFont(undefined, 'italic');
              const totalAmount = dep.amount.toFixed(2);
              const shareAmount = dep.share.toFixed(2);
              const participantsCount = dep.participantsConcerned || 1;
              doc.text(`  Montant total: ${totalAmount}€ | Part par personne: ${shareAmount}€ | ${participantsCount} participant(s) concerné(s)`, margin + 20, yPosition);
              yPosition += 4;
              
              doc.setFontSize(7);
          doc.setTextColor(34, 197, 94);
          doc.setFont(undefined, 'normal');
              doc.text(`  → Vous consommez ${shareAmount}€ (votre part) | Les autres participants concernés consomment aussi ${shareAmount}€ chacun`, margin + 20, yPosition);
          yPosition += 5;
            });
            yPosition += 3;
          }
          
          // Dépenses consommées par ce participant (avancées par d'autres)
          if (traceability.depensesConsommees.length > 0) {
            checkNewPage(10);
            doc.setFontSize(8);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'bold');
            doc.text('Dépenses consommées (avancées par d\'autres):', margin + 10, yPosition);
            yPosition += 5;
            
            // Calculer le total de consommation des dépenses avancées par d'autres
            let totalConsommeAutres = 0;
            traceability.depensesConsommees.forEach((dep) => {
              totalConsommeAutres += dep.part || 0;
            });
            
            traceability.depensesConsommees.forEach((dep) => {
              checkNewPage(8);
              doc.setFontSize(7);
              doc.setTextColor(60, 60, 60);
              doc.setFont(undefined, 'normal');
              const desc = dep.description || 'Dépense';
              const descShort = desc.length > 30 ? desc.substring(0, 27) + '...' : desc;
              const payerName = dep.payerName || 'Inconnu';
              const participantsCount = dep.participantsConcerned || 1;
              doc.text(`• ${descShort} (avancée par ${payerName})`, margin + 15, yPosition);
            yPosition += 4;
              
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);
              doc.setFont(undefined, 'italic');
              const shareAmount = dep.part.toFixed(2);
              doc.text(`  Montant total: ${dep.amount.toFixed(2)}€ | Part par personne: ${shareAmount}€ | ${participantsCount} participant(s) concerné(s)`, margin + 20, yPosition);
              yPosition += 4;
              
              doc.setFontSize(7);
              doc.setTextColor(34, 197, 94);
              doc.setFont(undefined, 'normal');
              doc.text(`  → Vous consommez ${shareAmount}€ (votre part au prorata)`, margin + 20, yPosition);
              yPosition += 5;
            });
            
            // Afficher le total
            checkNewPage(5);
            doc.setFontSize(7);
            doc.setTextColor(99, 102, 241);
            doc.setFont(undefined, 'bold');
            doc.text(`Total consommé des avances des autres: ${totalConsommeAutres.toFixed(2)}€`, margin + 15, yPosition);
            yPosition += 5;
            
            // Calculer aussi le total de consommation de ses propres avances
            let totalConsommePropres = 0;
            traceability.depensesAvancees.forEach((dep) => {
              totalConsommePropres += dep.share || 0;
            });
            
            if (traceability.depensesAvancees.length > 0) {
              doc.setFontSize(7);
              doc.setTextColor(99, 102, 241);
              doc.setFont(undefined, 'bold');
              doc.text(`Total consommé de vos propres avances: ${totalConsommePropres.toFixed(2)}€`, margin + 15, yPosition);
              yPosition += 5;
              
              const totalCalcule = totalConsommePropres + totalConsommeAutres;
              doc.setFontSize(8);
              doc.setTextColor(34, 197, 94);
              doc.setFont(undefined, 'bold');
              doc.text(`Total consommation calculé: ${totalCalcule.toFixed(2)}€ | Total affiché: ${consommationTotal}€`, margin + 15, yPosition);
              yPosition += 3;
            }
            
            yPosition += 3;
          }
        }
        
        if (!hasTransfers) {
          yPosition += 3;
          return;
        }
        
        // Afficher les transferts de manière claire et visible avec "De Qui vers Qui"
        // IMPORTANT: Si le solde est négatif mais qu'il n'y a pas de transfert direct, 
        // il faut quand même indiquer à qui verser (redistribution équitable)
        if (participantTransfers.toReceive.length > 0 || participantTransfers.toPay.length > 0 || solde < -0.01) {
          checkNewPage(10);
          yPosition += 3;
        }
        
        if (participantTransfers.toReceive.length > 0) {
          checkNewPage(5 + participantTransfers.toReceive.length * 7);
          doc.setFontSize(9);
          doc.setTextColor(34, 197, 94);
          doc.setFont(undefined, 'bold');
          doc.text(`Reçoit de:`, margin + 5, yPosition);
          yPosition += 7;
          
          participantTransfers.toReceive.forEach((transfer) => {
            checkNewPage(7);
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'normal');
            // Format: "De [nom]" à gauche, montant aligné à droite pour éviter le chevauchement
            const fromName = transfer.fromName;
            const amount = (transfer.amount || 0).toFixed(2);
            const amountText = `${amount}€`;
            const amountWidth = doc.getTextWidth(amountText);
            // Aligner le montant à droite avec une marge suffisante
            const amountX = pageWidth - margin - amountWidth - 5;
            // Texte "De [nom]" à gauche
            doc.text(`De ${fromName}`, margin + 10, yPosition);
            // Montant aligné à droite
            doc.setFontSize(10);
            doc.setTextColor(34, 197, 94);
            doc.setFont(undefined, 'bold');
            doc.text(amountText, amountX, yPosition);
            yPosition += 7;
          });
        }
        
        // Afficher les versements à faire
        if (participantTransfers.toPay.length > 0) {
          checkNewPage(5 + participantTransfers.toPay.length * 7);
          doc.setFontSize(9);
          doc.setTextColor(239, 68, 68);
          doc.setFont(undefined, 'bold');
          doc.text(`Verse à:`, margin + 5, yPosition);
          yPosition += 7;
          
          participantTransfers.toPay.forEach((transfer) => {
            checkNewPage(7);
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'normal');
            // Format: "Vers [nom]" à gauche, montant aligné à droite pour éviter le chevauchement
            const toName = transfer.toName;
            const amount = (transfer.amount || 0).toFixed(2);
            const amountText = `${amount}€`;
            const amountWidth = doc.getTextWidth(amountText);
            // Aligner le montant à droite avec une marge suffisante
            const amountX = pageWidth - margin - amountWidth - 5;
            // Texte "Vers [nom]" à gauche
            doc.text(`Vers ${toName}`, margin + 10, yPosition);
            // Montant aligné à droite
            doc.setFontSize(10);
            doc.setTextColor(239, 68, 68);
            doc.setFont(undefined, 'bold');
            doc.text(amountText, amountX, yPosition);
            yPosition += 7;
          });
        } else if (solde < -0.01) {
          // Si solde négatif mais pas de transfert direct calculé, 
          // cela signifie que le système n'est pas équilibré ou que les transferts ne sont pas encore calculés
          // Dans ce cas, indiquer qu'il faut consulter la section globale
          checkNewPage(15);
          doc.setFontSize(9);
          doc.setTextColor(239, 68, 68);
          doc.setFont(undefined, 'bold');
          doc.text(`⚠️ Versement à effectuer:`, margin + 5, yPosition);
          yPosition += 6;
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.setFont(undefined, 'normal');
          const paymentText = `Vous devez verser ${Math.abs(solde).toFixed(2)}€ pour équilibrer votre compte. ` +
                             `Consultez la section "Ajustements entre participants" ci-dessus pour voir ` +
                             `à qui vous devez verser cette somme de manière nominative et équitable.`;
          const paymentLines = doc.splitTextToSize(paymentText, pageWidth - 2 * margin - 10);
          paymentLines.forEach((line, idx) => {
            checkNewPage(5);
            doc.text(line, margin + 10, yPosition);
            yPosition += 5;
          });
        }
        
        checkNewPage(5);
        yPosition += 3;
      });
      
    } else if (transfersResult.isBalanced) {
      // Message positif si équilibré
      checkNewPage(15);
      doc.setFontSize(11);
      doc.setTextColor(34, 197, 94);
      doc.setFont(undefined, 'bold');
      doc.text('[EQUILIBRE] Tous les comptes sont équilibrés', margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const equilibreMsg = 'Parfait ! Chacun a contribué équitablement et les dépenses sont réparties de manière juste. Aucun transfert supplémentaire n\'est nécessaire.';
      const equilibreMsgLines = doc.splitTextToSize(equilibreMsg, pageWidth - 2 * margin);
      equilibreMsgLines.forEach((line, idx) => {
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    } else {
      // Message informatif si incohérence détectée
      checkNewPage(20);
      doc.setFontSize(10);
      doc.setTextColor(251, 146, 60);
      doc.setFont(undefined, 'bold');
      doc.text('[EN COURS] Répartition en cours', margin, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const inProgressText = 'Les calculs sont en cours de mise à jour. Certaines transactions peuvent nécessiter une validation supplémentaire pour garantir une répartition complète et équitable.';
      const inProgressLines = doc.splitTextToSize(inProgressText, pageWidth - 2 * margin);
      inProgressLines.forEach((line, idx) => {
        checkNewPage(5);
        doc.text(line, margin, yPosition);
      yPosition += 5;
      });
      checkNewPage(10);
      yPosition += 5;
      if (transfersResult.warning) {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'italic');
        const warningLines = doc.splitTextToSize(transfersResult.warning, pageWidth - 2 * margin);
        warningLines.forEach((line, idx) => {
          doc.text(line, margin + 5, yPosition);
          yPosition += 4;
        });
      }
      yPosition += 8;
    }
    
    // ===== BILAN FINAL =====
    checkNewPage(40);
    doc.setFontSize(18);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Bilan Final', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    const bilanIntroText = 'Un récapitulatif complet de votre événement, avec toutes les informations nécessaires pour une transparence totale.';
    const bilanIntroLines = doc.splitTextToSize(bilanIntroText, pageWidth - 2 * margin);
    bilanIntroLines.forEach((line, idx) => {
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    const participantsPayes = participants.filter(p => getContributionToPot(p.id, event, transactions) >= montantParPersonne).length;
    const participantsEnRetard = participants.filter(p => {
      const stats = getParticipantStats(p);
      return stats.remaining > 0;
    }).length;
    
    const bilanLabels = [
      ['Nombre de participants:', `${participantsCount}`],
      ['Participants à jour:', `${participantsPayes}`],
      ['Participants en retard:', `${participantsEnRetard}`],
      ['Nombre de transactions:', `${transactions?.length || 0}`],
      ['Budget total:', `${totalBudget.toFixed(2)} €`],
      ['Montant collecté:', `${totalPaye.toFixed(2)} €`],
      ['Montant restant:', `${resteAPayer.toFixed(2)} €`],
      ['Taux de collecte:', `${tauxCollecte.toFixed(1)}%`],
    ];
    
    bilanLabels.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPosition);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + labelWidth + 5, yPosition);
      yPosition += 7;
    });
    
    // Ajouter le footer sur toutes les pages
    addFooter();
    
    // Télécharger le PDF et l'ouvrir dans un nouvel onglet
    const fileName = `BONKONT-${event.code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    // Créer un blob URL pour ouvrir le PDF
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Ouvrir le PDF dans un nouvel onglet
    const newWindow = window.open(pdfUrl, '_blank');
    if (newWindow) {
      newWindow.focus();
    }
    
    // Télécharger le PDF
    doc.save(fileName);
    
    // Nettoyer le blob URL après un délai
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
    
    console.log('[PDF] ✅ Export completed successfully, downloaded and opened:', fileName);
    toast({
      title: "✅ PDF généré avec succès",
      description: `Le bilan événementiel a été téléchargé et ouvert.`
    });
  } catch (error) {
    console.error('[PDF] ❌ Export error:', error);
    toast({
      variant: "destructive",
      title: "Erreur d'export PDF",
      description: "Une erreur est survenue lors de la génération du PDF. Veuillez réessayer."
    });
  }
};

  const getParticipantStats = (participant) => {
    const totalDue = event.amount / participants.length;
    // Utiliser getContributionToPot() comme source unique de vérité pour les contributions
    const paid = getContributionToPot(participant.id, event, transactions);
    const remaining = Math.max(0, totalDue - paid);
    const paymentProgress = totalDue > 0 ? (paid / totalDue) * 100 : 0;
    const hasPaid = paid >= totalDue - 0.01;
    
    // Calculer le score en temps réel en fonction de l'état actuel de la participation
    let score = 0;
    
    if (hasPaid && participant.paidDate) {
      // Score basé sur la ponctualité du paiement
      const eventStartDate = new Date(event.startDate);
      const paymentDate = new Date(participant.paidDate);
      const paymentDelay = Math.floor(
        (paymentDate.getTime() - eventStartDate.getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      
      // Score initial de 100, moins 5 points par jour de retard
      score = Math.max(0, 100 - (paymentDelay * 5));
      
      // Bonus si le paiement est fait avant la date de début de l'événement
      if (paymentDate < eventStartDate) {
        score = Math.min(100, score + 10); // Bonus de 10 points pour paiement anticipé
      }
    } else if (hasPaid && !participant.paidDate) {
      // Si payé mais pas de date, score de base de 70
      score = 70;
    } else {
      // Pas encore payé, score basé sur le pourcentage payé
      const paymentPercentage = totalDue > 0 ? (paid / totalDue) * 100 : 0;
      score = Math.floor(paymentPercentage * 0.5); // Score proportionnel jusqu'à 50 points max
    }
    
    return {
      totalDue,
      paid,
      remaining,
      paymentProgress,
      hasPaid,
      score: Math.round(score),
      paymentRank: participant.paymentRank || null
    };
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text truncate">{event.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">{event.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
  <Badge
    variant="outline"
    className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2"
  >
    Code: {event.code}
  </Badge>

  <Button
    variant="outline"
    className="gap-2"
    onClick={handleExportPDF}
  >
    📄 Export PDF
  </Button>
</div>

      </div>

      {/* Accordéon principal avec les 4 sections */}
      <Accordion 
        type="multiple" 
        value={accordionValue} 
        onValueChange={(newValue) => {
          console.log('[EventManagement] 🔘 Accordion value changed:', {
            oldValue: accordionValue,
            newValue,
            includesParticipants: newValue.includes('participants')
          });
          setAccordionValue(newValue);
        }} 
        className="w-full space-y-4"
      >
        
        {/* Section 1: L'événement */}
        <AccordionItem value="event" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">L'événement</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-6">
      {/* Localisation */}
      <Card className="p-6 neon-border">
        <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
            Localisation
                  </h3>
          <Button variant="outline" size="sm" onClick={handleShareLocation} className="gap-2">
            <Share2 className="w-4 h-4" />
            Partager le lieu
          </Button>
        </div>
        
        {event.location && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-medium mb-2">
                {typeof event.location === 'string' 
                  ? event.location 
                  : event.location.address || event.location.displayName || 'Localisation'}
              </p>
              <EventLocation initialLocation={event.location} />
            </div>
          </div>
        )}
      </Card>

      {/* Meilleurs spots à visiter */}
      <Card className="p-6 neon-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Meilleurs spots à visiter
        </h3>
        {spots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              Aucun point d'intérêt trouvé avec au moins 2 avis
            </p>
            <p className="text-sm text-muted-foreground">
              Les points d'intérêt seront affichés ici une fois la localisation complète avec coordonnées GPS.
            </p>
          </div>
        ) : (
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-4">
            {spots.map((spot, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  console.log('[EventManagement] Spot clicked:', spot);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name)}`, '_blank');
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{spot.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {spot.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{spot.rating}</span>
                      </div>
                      {spot.totalReviews >= 2 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">({spot.totalReviews} avis)</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Navigation className="w-4 h-4" />
                        <span>{spot.distance}</span>
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        )}
      </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: La Règle Bonkont */}
        <AccordionItem value="bonkont-rule" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">La Règle Bonkont</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
          <div className="space-y-4">
            {/* Phrase principale */}
            <div className="p-5 rounded-lg bg-primary/20 dark:bg-primary/10 border-2 border-primary/30">
              <p className="text-lg font-bold text-center text-primary dark:text-primary-foreground mb-2">
                "Tu Valides, Tu consommes, Tu reçois ou Tu verses, Tu es Quittes"
              </p>
              <p className="text-sm text-center text-muted-foreground">
                C'est Transparent, c'est Equitable, c'est Bonkont
              </p>
            </div>
            
            {/* Explication détaillée */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Comment ça fonctionne ?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                <strong>La validation de TOUTE transaction détermine et déclenche la règle Bonkont :</strong>
              </p>
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-2 ml-4 list-disc">
                  <li><strong>Contributions au POT</strong> : Validées ET partagées équitablement (tous les participants concernés consomment leur part)</li>
                  <li><strong>Dépenses/Avances</strong> : Validées ET partagées équitablement (qui consomme quoi)</li>
                  <li><strong>Transferts directs</strong> : Validés pour traçabilité (paiement direct, pas de partage)</li>
                  <li><strong>Remboursements POT</strong> : Validés pour traçabilité (remboursement direct, pas de partage)</li>
                </ul>
            </div>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Pour les <strong>dépenses/avances</strong> : seuls les participants qui valident sont redevables au payeur au prorata. 
                La validation (complète ou partielle) détermine la répartition et les transferts.
              </p>
              
              {/* Exemple concret */}
              <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-blue-300 dark:border-blue-700">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <UserCircle className="w-4 h-4" />
                  Exemple concret :
                </h4>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <p>
                    <strong>Scénario :</strong> 10 personnes participent à un événement validé collectivement.
                  </p>
                  <p>
                    <strong>Situation :</strong> Alice effectue une dépense de <strong>30€</strong> pour un repas en ville.
                  </p>
                  <div className="ml-4 space-y-1">
                    <p className="flex items-start gap-2">
                      <span className="text-primary font-bold">→</span>
                      <span>Alice valide sa dépense</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary font-bold">→</span>
                      <span>Bob et Charlie valident aussi cette dépense</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-primary font-bold">→</span>
                      <span>Les 7 autres participants ne valident pas (ils sont restés sur site)</span>
                  </p>
                </div>
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Résultat selon la règle Bonkont :
                    </p>
                    <ul className="text-xs text-green-800 dark:text-green-200 space-y-1 ml-4 list-disc">
                      <li>Seuls <strong>Alice, Bob et Charlie</strong> sont concernés par cette dépense</li>
                      <li>Chacun consomme <strong>10€</strong> (30€ ÷ 3 personnes)</li>
                      <li>Alice a avancé 30€, elle consomme 10€ → elle doit recevoir <strong>20€</strong></li>
                      <li>Bob et Charlie doivent chacun <strong>10€</strong> à Alice</li>
                      <li>Les 7 autres participants sont <strong>exemptés</strong> (ils n'ont pas validé)</li>
                    </ul>
              </div>
                  <p className="mt-3 text-xs italic text-blue-700 dark:text-blue-300">
                    💡 <strong>La validation détermine qui consomme et qui doit rembourser.</strong> C'est transparent, équitable, et tout le monde est quitte !
                  </p>
            </div>
              </div>
            </div>
          </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Les Participants */}
        <AccordionItem value="participants" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">
                Les Participants ({confirmedParticipants.length}
                {pendingParticipants.length > 0 && ` + ${pendingParticipants.length} en attente`})
                {firestoreJoinRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2 animate-pulse">
                    {firestoreJoinRequests.length} nouvelle{firestoreJoinRequests.length > 1 ? 's' : ''} demande{firestoreJoinRequests.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </h2>
              {event.status === 'draft' && isOrganizer && (
                <Badge variant="outline" className="ml-2">Brouillon</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            {/* Bouton de démarrage pour l'organisateur */}
            {event.status === 'draft' && isOrganizer && (
              <Card className="p-4 mb-4 neon-border bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Lancer l'événement</h3>
                    <p className="text-sm text-muted-foreground">
                      Une fois lancé, la liste des participants et le budget seront figés.
                    </p>
                  </div>
                  <Button
                    onClick={handleLaunchEvent}
                    className="gap-2 button-glow"
                    disabled={confirmedParticipants.length < 1}
                  >
                    <Rocket className="w-4 h-4" />
                    Lancer l'événement
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Interface Admin : Ajout manuel et gestion des participants */}
            {isOrganizer && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Gestion des participants
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddParticipantDialog(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter manuellement
                  </Button>
                </div>
                
                {/* Section Demandes de participation - TOUJOURS visible pour l'organisateur */}
                <div className="mb-4 p-4 rounded-lg border-2 border-primary/50 bg-primary/10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold flex items-center gap-2 text-lg">
                      <Bell className="w-5 h-5 text-primary" />
                      🔔 Demandes de participation
                      {loadingJoinRequests && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[EventManagement] 🔄 ===== MANUAL REFRESH BUTTON CLICKED =====');
                        console.log('[EventManagement] 🔄 Button clicked!');
                        console.log('[EventManagement] 🔄 Local Event ID:', event?.id);
                        console.log('[EventManagement] 🔄 Event Code:', event?.code);
                        console.log('[EventManagement] 🔄 Loading state:', loadingJoinRequests);
                        
                        if (!event?.id || !event?.code) {
                          console.error('[EventManagement] ❌ Cannot refresh: missing event.id or event.code');
                          toast({
                            variant: "destructive",
                            title: "Erreur",
                            description: "Impossible de rafraîchir : événement introuvable."
                          });
                          return;
                        }
                        
                        setLoadingJoinRequests(true);
                        toast({
                          title: "Actualisation en cours...",
                          description: "Recherche des nouvelles demandes de participation.",
                          duration: 2000
                        });
                        
                        try {
                          // Chercher l'événement dans Firestore par code pour obtenir le vrai ID Firestore
                          const { findEventByCode } = await import('@/services/api');
                          let firestoreEvent = await findEventByCode(event.code);
                          
                          if (!firestoreEvent) {
                            console.error('[EventManagement] ❌ Event not found in Firestore by code:', event.code);
                            console.log('[EventManagement] 🔍 Trying alternative code formats...');
                            
                            // Essayer différentes variations du code
                            const codeVariations = [
                              event.code.trim().toUpperCase(),
                              event.code.trim().toUpperCase().replace(/[^A-Z]/g, ''),
                              event.code.trim()
                            ];
                            
                            for (const variation of codeVariations) {
                              if (variation && variation.length >= 8 && variation !== event.code) {
                                console.log('[EventManagement] 🔍 Trying code variation:', variation);
                                try {
                                  firestoreEvent = await findEventByCode(variation);
                                  if (firestoreEvent) {
                                    console.log('[EventManagement] ✅ Event found with variation:', variation);
                                    break;
                                  }
                                } catch (err) {
                                  console.warn('[EventManagement] Variation failed:', variation, err);
                                }
                              }
                            }
                          }
                          
                          if (!firestoreEvent) {
                            console.error('[EventManagement] ❌ Event still not found, using local eventId:', event.id);
                            const requests = await getJoinRequests(event.id, 'pending');
                            setFirestoreJoinRequests(requests);
                            toast({
                              title: "Actualisation terminée",
                              description: `${requests.length} demande${requests.length > 1 ? 's' : ''} trouvée${requests.length > 1 ? 's' : ''}.`,
                              duration: 3000
                            });
                            setLoadingJoinRequests(false);
                            return;
                          }
                          
                          const firestoreEventId = firestoreEvent.id;
                          console.log('[EventManagement] 🔄 Using Firestore eventId:', firestoreEventId);
                          console.log('[EventManagement] 🔄 Local Event ID:', event.id);
                          console.log('[EventManagement] 🔄 ID Match:', firestoreEventId === event.id);
                          console.log('[EventManagement] 🔄 Calling getJoinRequests with Firestore eventId:', {
                            firestoreEventId,
                            localEventId: event.id,
                            eventCode: event.code,
                            note: 'Using Firestore ID (not local ID) because join requests are created with Firestore ID'
                          });
                          const requests = await getJoinRequests(firestoreEventId, 'pending');
                          console.log('[EventManagement] 🔄 Refreshed requests count:', requests.length);
                          console.log('[EventManagement] 🔄 Requests details:', requests.map(r => ({
                            id: r.id,
                            name: r.name,
                            email: r.email,
                            status: r.status,
                            userId: r.userId,
                            requestedAt: r.requestedAt
                          })));
                          setFirestoreJoinRequests(requests);
                          
                          if (requests.length > 0) {
                            console.log('[EventManagement] ✅ Requests found after refresh!');
                            toast({
                              title: "✅ Nouvelles demandes trouvées !",
                              description: `${requests.length} demande${requests.length > 1 ? 's' : ''} en attente de validation.`,
                              duration: 5000
                            });
                          } else {
                            console.log('[EventManagement] ⚠️ No requests found after refresh');
                            toast({
                              title: "Actualisation terminée",
                              description: "Aucune demande en attente pour le moment.",
                              duration: 3000
                            });
                          }
                        } catch (error) {
                          console.error('[EventManagement] ❌ Error refreshing requests:', error);
                          console.error('[EventManagement] ❌ Error details:', {
                            message: error.message,
                            code: error.code,
                            eventId: event?.id
                          });
                          toast({
                            variant: "destructive",
                            title: "Erreur",
                            description: `Impossible de rafraîchir les demandes : ${error.message}`
                          });
                        } finally {
                          setLoadingJoinRequests(false);
                        }
                      }}
                      className="gap-2 cursor-pointer"
                      disabled={loadingJoinRequests || !event?.id || !event?.code}
                      style={{ pointerEvents: loadingJoinRequests ? 'none' : 'auto' }}
                    >
                      <Loader2 className={`w-4 h-4 ${loadingJoinRequests ? 'animate-spin' : ''}`} />
                      {loadingJoinRequests ? 'Actualisation...' : 'Actualiser'}
                    </Button>
                  </div>
                  
                  {(() => {
                    if (!event || !event.code) {
                      return <p className="text-sm text-muted-foreground">Chargement...</p>;
                    }
                    
                    const localJoinRequests = useJoinRequestsStore.getState().getRequestsByEventCode(event.code);
                    const allJoinRequests = [...firestoreJoinRequests, ...localJoinRequests];
                    
                    console.log('[EventManagement] 📊 ===== JOIN REQUESTS DISPLAY =====');
                    console.log('[EventManagement] 📊 Event ID:', event.id);
                    console.log('[EventManagement] 📊 Event Code:', event.code);
                    console.log('[EventManagement] 📊 Total requests:', allJoinRequests.length);
                    console.log('[EventManagement] 📊 Firestore:', firestoreJoinRequests.length);
                    console.log('[EventManagement] 📊 Local:', localJoinRequests.length);
                    console.log('[EventManagement] 📊 Firestore requests details:', firestoreJoinRequests);
                    console.log('[EventManagement] 📊 Local requests details:', localJoinRequests);
                    
                    if (allJoinRequests.length > 0) {
                      return (
                        <>
                          <p className="text-sm text-muted-foreground mb-3 font-medium">
                            ⚠️ {allJoinRequests.length} demande{allJoinRequests.length > 1 ? 's' : ''} en attente de validation.
                          </p>
                          <div className="space-y-2">
                            {allJoinRequests.map((request) => {
                              const participant = request.participant || { name: request.name, email: request.email };
                              const requestId = request.id;
                              // ✅ Détection correcte : une demande Firestore a directement name/email, pas dans participant
                              const isFirestoreRequest = firestoreJoinRequests.some(fr => fr.id === requestId);
                              
                              // Fonction handleAccept - LOGIQUE SIMPLIFIÉE SELON LE GUIDE
                              const handleAccept = async (e) => {
                                console.log('═══════════════════════════════════════════════════════════');
                                console.log('[EventManagement] 🎯 ACCEPT BUTTON CLICKED');
                                console.log('[EventManagement] Request ID:', requestId);
                                console.log('[EventManagement] Participant:', participant);
                                console.log('[EventManagement] Event:', event?.id, event?.code);
                                console.log('[EventManagement] Is Firestore Request:', isFirestoreRequest);
                                console.log('═══════════════════════════════════════════════════════════');
                                
                                if (e) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                                
                                // Vérifications de base
                                if (!event || !event.id) {
                                  console.error('[EventManagement] ❌ No event');
                                  toast({ variant: "destructive", title: "Erreur", description: "L'événement n'est pas disponible." });
                                  return;
                                }
                                
                                if (!event.organizerId) {
                                  console.error('[EventManagement] ❌ No organizerId');
                                  toast({ variant: "destructive", title: "Erreur", description: "L'organisateur n'est pas défini." });
                                  return;
                                }
                                
                                if (!requestId) {
                                  console.error('[EventManagement] ❌ No requestId');
                                  toast({ variant: "destructive", title: "Erreur", description: "L'ID de la demande est invalide." });
                                  return;
                                }
                                
                                // ✅ Utiliser l'email du participant comme identifiant principal (plus fiable que userId)
                                const participantEmail = (participant.email || request.email || '').trim().toLowerCase();
                                const participantUserId = request.userId || participant.userId;
                                
                                // Pour événements "open", bypass authentification - SELON LE GUIDE
                                const isOpenEvent = (event.status || 'active') === 'open';
                                
                                console.log('[EventManagement] 🔐 Authentication check:', {
                                  eventStatus: event.status,
                                  isOpenEvent,
                                  participantUserId,
                                  participantEmail,
                                  organizerId: event.organizerId,
                                  requestEmail: request.email,
                                  participantEmailFromParticipant: participant.email
                                });
                                
                                // ✅ Vérifier que l'email du participant n'est pas celui de l'organisateur
                                if (participantEmail && event.organizerId && participantEmail === event.organizerId.toLowerCase()) {
                                  console.warn('[EventManagement] ⚠️ Cannot accept: participant email is organizer email');
                                  toast({
                                    variant: "destructive",
                                    title: "Erreur",
                                    description: "L'organisateur ne peut pas être ajouté comme participant."
                                  });
                                  return;
                                }
                                
                                // SELON LE GUIDE : Pour événements "open", on accepte SANS vérification
                                // Pour les autres, on vérifie que l'email est présent et différent de l'organisateur
                                if (!isOpenEvent) {
                                  if (!participantEmail) {
                                    console.warn('[EventManagement] ⚠️ Missing participant email');
                                    toast({
                                      variant: "destructive",
                                      title: "Email manquant",
                                      description: "L'email du participant est requis pour l'accepter."
                                    });
                                    return;
                                  }
                                  console.log('[EventManagement] ✅ Participant email validated for non-open event');
                                } else {
                                  // Pour événements "open" : on accepte directement, pas de vérification
                                  console.log('[EventManagement] ✅ Open event - authentication bypassed, accepting directly');
                                }
                                
                                try {
                                  if (isFirestoreRequest) {
                                    // ✅ TOUJOURS chercher le Firestore ID par code pour être sûr d'avoir le bon
                                    let firestoreEventId = null;
                                    
                                    if (!event.code) {
                                      throw new Error("Code événement manquant, impossible de trouver l'ID Firestore");
                                    }
                                    
                                    try {
                                      console.log('[EventManagement] 🔍 Looking up Firestore eventId by code:', event.code);
                                      const { findEventByCode } = await import('@/services/api');
                                      const firestoreEvent = await findEventByCode(event.code);
                                      
                                      if (!firestoreEvent || !firestoreEvent.id) {
                                        throw new Error(`Événement non trouvé dans Firestore avec le code ${event.code}`);
                                      }
                                      
                                      firestoreEventId = firestoreEvent.id;
                                      console.log('[EventManagement] ✅ Found Firestore eventId:', firestoreEventId);
                                      
                                      // Mettre à jour le store local avec le firestoreId
                                      if (event.firestoreId !== firestoreEventId) {
                                        useEventStore.getState().updateEvent(event.id, { firestoreId: firestoreEventId });
                                      }
                                    } catch (lookupError) {
                                      console.error('[EventManagement] ❌ Could not lookup Firestore ID:', lookupError);
                                      throw new Error(`Impossible de trouver l'événement dans Firestore : ${lookupError.message}`);
                                    }
                                    
                                    console.log('[EventManagement] 📞 Calling updateJoinRequest...', {
                                      firestoreEventId,
                                      requestId,
                                      action: 'approve',
                                      organizerId: event.organizerId
                                    });
                                    
                                    // APPEL PRINCIPAL : updateJoinRequest met à jour la demande ET ajoute le participant
                                    console.log('[EventManagement] 🚀 ABOUT TO CALL updateJoinRequest...');
                                    console.log('[EventManagement] Parameters check:', {
                                      firestoreEventId: String(firestoreEventId),
                                      requestId: String(requestId),
                                      requestIdType: typeof requestId,
                                      action: 'approve',
                                      organizerId: String(event.organizerId)
                                    });
                                    
                                    let result;
                                    try {
                                      result = await updateJoinRequest(firestoreEventId, requestId, 'approve', event.organizerId);
                                      console.log('[EventManagement] ✅✅✅ updateJoinRequest SUCCESS ✅✅✅');
                                      console.log('[EventManagement] Result:', result);
                                    } catch (updateError) {
                                      console.error('[EventManagement] ❌❌❌ updateJoinRequest FAILED ❌❌❌');
                                      console.error('[EventManagement] Error:', updateError);
                                      console.error('[EventManagement] Error message:', updateError.message);
                                      console.error('[EventManagement] Error stack:', updateError.stack);
                                      throw updateError; // Re-throw pour être capturé par le catch externe
                                    }
                                    
                                    // Rafraîchir la liste des demandes (la demande acceptée disparaît)
                                    const requests = await getJoinRequests(firestoreEventId, 'pending');
                                    setFirestoreJoinRequests(requests);
                                    console.log('[EventManagement] ✅ Requests refreshed:', requests.length);
                                    
                                    // Synchroniser les participants depuis Firestore
                                    console.log('[EventManagement] 🔄 Step 9: Syncing participants from Firestore...');
                                    try {
                                      const { findEventByCode } = await import('@/services/api');
                                      console.log('[EventManagement] 🔍 Fetching event from Firestore with code:', event.code);
                                      const updatedEvent = await findEventByCode(event.code);
                                      
                                      console.log('[EventManagement] 📋 Event fetched from Firestore:', {
                                        eventId: updatedEvent?.id,
                                        participantsCount: updatedEvent?.participants?.length || 0,
                                        participants: updatedEvent?.participants
                                      });
                                      
                                      if (updatedEvent?.participants) {
                                        const syncedParticipants = updatedEvent.participants.map((p, idx) => ({
                                          ...p,
                                          id: p.id || `p-${idx + 1}`,
                                          status: p.approved || p.status === 'confirmed' ? 'confirmed' : 'pending'
                                        }));
                                        
                                        // S'assurer que l'organisateur est toujours dans la liste
                                        const organizerExists = syncedParticipants.some(p => 
                                          (p.userId && p.userId.toLowerCase() === event.organizerId?.toLowerCase()) ||
                                          (p.email && p.email.toLowerCase() === event.organizerId?.toLowerCase()) ||
                                          p.role === 'organizer' ||
                                          p.isOrganizer === true
                                        );
                                        
                                        if (!organizerExists && event.organizerId && event.organizerName) {
                                          console.log('[EventManagement] ⚠️ Organizer not found in synced participants, adding it...');
                                          const organizerParticipant = {
                                            id: 'organizer-1',
                                            userId: event.organizerId,
                                            name: event.organizerName || 'Organisateur',
                                            email: event.organizerId,
                                            role: 'organizer',
                                            isOrganizer: true,
                                            status: 'confirmed',
                                            hasConfirmed: true,
                                            approved: true
                                          };
                                          syncedParticipants.unshift(organizerParticipant); // Ajouter au début
                                          console.log('[EventManagement] ✅ Organizer added to participants list');
                                        }
                                        
                                        console.log('[EventManagement] 📝 Syncing participants to local store:', {
                                          eventId: event.id,
                                          participantsCount: syncedParticipants.length,
                                          organizerIncluded: organizerExists || !organizerExists,
                                          participants: syncedParticipants.map(p => ({
                                            id: p.id,
                                            name: p.name,
                                            email: p.email,
                                            userId: p.userId,
                                            role: p.role,
                                            isOrganizer: p.isOrganizer,
                                            status: p.status
                                          }))
                                        });
                                        
                                        useEventStore.getState().updateEvent(event.id, { participants: syncedParticipants });
                                        console.log('[EventManagement] ✅✅✅ Participants synced successfully ✅✅✅');
                                        console.log('[EventManagement] Local event now has', syncedParticipants.length, 'participants');
                                      } else {
                                        console.warn('[EventManagement] ⚠️ No participants in Firestore event');
                                        // Si aucun participant dans Firestore, s'assurer que l'organisateur est présent
                                        if (event.organizerId && event.organizerName) {
                                          const organizerParticipant = {
                                            id: 'organizer-1',
                                            userId: event.organizerId,
                                            name: event.organizerName || 'Organisateur',
                                            email: event.organizerId,
                                            role: 'organizer',
                                            isOrganizer: true,
                                            status: 'confirmed',
                                            hasConfirmed: true,
                                            approved: true
                                          };
                                          useEventStore.getState().updateEvent(event.id, { participants: [organizerParticipant] });
                                          console.log('[EventManagement] ✅ Organizer added as only participant');
                                        }
                                      }
                                    } catch (syncErr) {
                                      console.error('[EventManagement] ❌ Sync error:', syncErr);
                                      console.error('[EventManagement] Sync error details:', {
                                        message: syncErr.message,
                                        stack: syncErr.stack
                                      });
                                    }
                                    
                                    toast({
                                      title: "✅ Participant ajouté",
                                      description: `${participant.name || 'Le participant'} a été ajouté à l'événement.`
                                    });
                                    
                                  } else {
                                    // Demande locale
                                    useJoinRequestsStore.getState().acceptRequest(requestId);
                                    const newParticipant = {
                                      ...participant,
                                      id: event.participants?.length ? Math.max(...event.participants.map(p => p.id || 0)) + 1 : 2,
                                      userId: request.userId || participant.email,
                                      status: 'confirmed',
                                      hasConfirmed: true,
                                      hasPaid: false,
                                      paidAmount: 0
                                    };
                                    updateEvent(event.id, {
                                      participants: [...(event.participants || []), newParticipant]
                                    });
                                    toast({
                                      title: "✅ Participant ajouté",
                                      description: `${participant.name || 'Le participant'} a été ajouté.`
                                    });
                                  }
                                  
                                  console.log('[EventManagement] ✅✅✅ ACCEPT SUCCESS ✅✅✅');
                                  
                                } catch (error) {
                                  console.error('[EventManagement] ❌❌❌ ACCEPT ERROR ❌❌❌');
                                  console.error('[EventManagement] Error:', error);
                                  console.error('[EventManagement] Stack:', error.stack);
                                  toast({
                                    variant: "destructive",
                                    title: "❌ Erreur",
                                    description: error.message || 'Erreur inconnue'
                                  });
                                }
                              };
                              
                              return (
                                <Card key={requestId} className="p-3 neon-border" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="font-medium">{participant.name || 'Sans nom'}</p>
                                      {participant.email && (
                                        <p className="text-xs text-muted-foreground">{participant.email}</p>
                                      )}
                                      {request.eventCode && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Code: {request.eventCode}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        disabled={false}
                                        style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative', cursor: 'pointer' }}
                                        onClick={(e) => {
                                          console.log('🔘🔘🔘 BUTTON ONCLICK TRIGGERED 🔘🔘🔘');
                                          console.log('[EventManagement] Request ID:', requestId);
                                          console.log('[EventManagement] Participant:', participant);
                                          
                                          if (e) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                          }
                                          
                                          // Appeler handleAccept directement - elle gère tout
                                          handleAccept(e).catch(err => {
                                            console.error('[EventManagement] ❌ Unhandled error in handleAccept:', err);
                                          });
                                        }}
                                        className="gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        Accepter
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            if (isFirestoreRequest) {
                                              await updateJoinRequest(event.id, requestId, 'reject', event.organizerId);
                                              const requests = await getJoinRequests(event.id, 'pending');
                                              setFirestoreJoinRequests(requests);
                                            } else {
                                              useJoinRequestsStore.getState().rejectRequest(requestId);
                                            }
                                            
                                            toast({
                                              title: "Demande rejetée",
                                              description: "La demande a été rejetée."
                                            });
                                          } catch (error) {
                                            console.error('[EventManagement] Error rejecting request:', error);
                                            toast({
                                              variant: "destructive",
                                              title: "Erreur",
                                              description: "Impossible de rejeter la demande. Veuillez réessayer."
                                            });
                                          }
                                        }}
                                        className="gap-1"
                                      >
                                        <X className="w-3 h-3" />
                                        Rejeter
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Aucune demande en attente pour le moment.
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            Event ID: {event.id} | Code: {event.code}
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            Vérifiez la console pour les détails de chargement.
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            )}

                {/* Participants en attente */}
                {pendingParticipants.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Bell className="w-4 h-4" />
                      Demandes en attente ({pendingParticipants.length})
                    </h4>
                              <div className="space-y-2">
                      {pendingParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5"
                        >
                          <div>
                            <p className="font-medium">{participant.name}</p>
                            {participant.email && (
                              <p className="text-sm text-muted-foreground">{participant.email}</p>
                            )}
                                    </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('[EventManagement] Rejecting pending participant:', participant.id);
                                handleRejectParticipant(participant.id);
                              }}
                              className="gap-1"
                            >
                              <X className="w-4 h-4" />
                              Rejeter
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                console.log('[EventManagement] Accepting pending participant:', participant.id);
                                handleValidateParticipant(participant.id);
                              }}
                              className="gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Accepter
                            </Button>
                          </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                {/* Participants refusés (peuvent être réacceptés) */}
                {rejectedParticipants.length > 0 && (
                            <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                      <X className="w-4 h-4" />
                      Participants refusés ({rejectedParticipants.length})
                    </h4>
                              <div className="space-y-2">
                      {rejectedParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5"
                        >
                          <div>
                            <p className="font-medium">{participant.name}</p>
                            {participant.email && (
                              <p className="text-sm text-muted-foreground">{participant.email}</p>
                            )}
                                    </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('[EventManagement] Reaccepting rejected participant:', participant.id);
                              handleReacceptParticipant(participant.id);
                            }}
                            className="gap-1"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Réaccepter
                          </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

      <Card className="p-6 neon-border">
        <ScrollArea className="h-96">
          <div className="space-y-3 pr-4">
                  {confirmedParticipants.map((participant) => {
              const stats = getParticipantStats(participant);
              
              return (
                <div
                  key={participant.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{participant.name}</h3>
                      <p className="text-sm text-muted-foreground">{participant.email}</p>
                    </div>
                    {stats.hasPaid && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Payé
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                          <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                              className="relative gap-2 scanner-ticket-btn animate-pulse-slow hover:animate-none hover:scale-105 transition-all duration-300 border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('[EventManagement] Scanner button clicked for participant:', {
                          participantId: participant.id,
                          participantName: participant.name,
                          eventId
                        });
                        setScannerParticipantId(participant.id);
                        setIsScannerOpen(true);
                      }}
                    >
                              <div className="relative">
                                <Scan className="w-4 h-4 relative z-10" />
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                              </div>
                              <span className="font-semibold">Scanner un ticket CB</span>
                    </Button>
                            <Badge 
                              variant="outline" 
                              className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-purple-600 text-white border-0 text-[10px] px-1.5 py-0.5 shadow-lg animate-bounce"
                              style={{ animation: 'bounce 2s infinite' }}
                            >
                              ✨ Innovation
                            </Badge>
                          </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            className="relative gap-2 mes-participations-btn animate-pulse-slow hover:animate-none hover:scale-105 transition-all duration-300"
                            onClick={() => {
                              console.log('[EventManagement] Participant clicked:', {
                                id: participant.id,
                                name: participant.name,
                                stats
                              });
                              setSelectedParticipant(participant);
                            }}
                          >
                            <div className="relative">
                              <UserCircle className="w-4 h-4" />
                              {/* Badge d'alerte animé */}
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                              </span>
                            </div>
                            <span className="font-semibold">Mes Participations</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-primary text-primary-foreground">
                          <p className="font-medium">Voir tout en détail</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Montant dû</p>
                      <p className="font-semibold">{stats.totalDue.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payé</p>
                      <p className="font-semibold text-green-500">{stats.paid.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reste à payer</p>
                      <p className="font-semibold text-destructive">{stats.remaining.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-semibold flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {stats.score}/100
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progression du paiement</span>
                      <span>{stats.paymentProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${stats.paymentProgress}%` }}
                      />
                    </div>
                  </div>

                  {stats.paymentRank && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Classement: {stats.paymentRank}ème participant à avoir payé
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Les Ajustements */}
        <AccordionItem value="adjustments" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Les Ajustements</h2>
              {(() => {
                const balancesResult = computeBalances(event, transactions);
                const transfersResult = computeTransfers(balancesResult);
                const transfers = transfersResult.transfers || [];
                return transfers.length > 0 ? (
                  <Badge variant="outline" className="text-sm ml-2">
                    {transfers.length} transfert{transfers.length > 1 ? 's' : ''}
                  </Badge>
                ) : null;
              })()}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
      {/* Transparence totale : Qui verse à qui / Qui reçoit de qui */}
      {(() => {
        const balancesResult = computeBalances(event, transactions);
        const { balances } = balancesResult;
        const transfersResult = computeTransfers(balancesResult);
        const transfers = transfersResult.transfers || [];
        
        return (
          <Card className="p-6 neon-border border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Ajustements entre participants
              </h2>
              <Badge variant="outline" className="text-sm">
                {transfers.length} transfert{transfers.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            {/* Explication succincte */}
            <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Comment ça marche ?
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Basé sur les dépenses <strong>validées</strong> et les paiements enregistrés.
                    Les transferts sont calculés uniquement à partir du <strong>solde final</strong> de chaque participant.
                    <span className="block mt-1 text-xs italic">Rappel : Seuls les participants qui valident consomment et doivent rembourser.</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Avertissement si répartition incomplète */}
            {transfersResult.warning && (
              <div className="mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      ⚠️ Répartition incomplète
                    </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100"
                        onClick={() => setShowHelpIncompleteDistribution(!showHelpIncompleteDistribution)}
                      >
                        <HelpCircle className="w-4 h-4 mr-1" />
                        {showHelpIncompleteDistribution ? (
                          <>
                            <span className="text-xs">Masquer l'aide</span>
                            <ChevronUp className="w-3 h-3 ml-1" />
                          </>
                        ) : (
                          <>
                            <span className="text-xs">Comment corriger ?</span>
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                      {transfersResult.warning}
                    </p>
                    {balancesResult.totalSolde && Math.abs(balancesResult.totalSolde) > 0.01 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2 italic">
                        Écart détecté : {balancesResult.totalSolde.toFixed(2)}€
                      </p>
                    )}
                    
                    {/* Section d'aide détaillée */}
                    {showHelpIncompleteDistribution && (
                      <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
                        <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                          📚 Qu'est-ce qu'une répartition incomplète ?
                        </h4>
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
                          Une répartition incomplète signifie que la somme des soldes de tous les participants et de la cagnotte n'est pas égale à 0€. 
                          En comptabilité, cette équation doit toujours être vraie : <strong>Σ soldes participants + solde POT = 0€</strong>
                        </p>
                        <div className="text-xs text-yellow-800 dark:text-yellow-200 mb-3 p-2 bg-yellow-200 dark:bg-yellow-800/50 rounded">
                          <strong>RÈGLE BONKONT :</strong> "Que je paie ou dépense, je consomme comme toi, cette avance tu dois me la rembourser, et vice versa, on est quittes". 
                          Si toutes les transactions sont <strong>validées collectivement</strong> et équilibrées, alors la répartition devrait être équilibrée automatiquement.
                  </div>
                        
                        <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 mt-3">
                          🔍 Causes possibles :
                        </h4>
                        <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1.5 mb-3 list-disc list-inside">
                          <li><strong>Dépenses partagées mal enregistrées</strong> : Si une dépense de 100€ est partagée entre 4 personnes mais que seule la personne qui a payé est dans la liste "participants", alors cette personne consomme 100€ au lieu de 25€ (100/4).</li>
                          <li><strong>Contributions manquantes</strong> : Si la cagnotte est déficitaire, il manque des contributions pour équilibrer les comptes.</li>
                          <li><strong>Transactions incomplètes</strong> : Certaines transactions peuvent avoir des informations manquantes (montant, participants, payeur).</li>
                        </ul>
                        
                        <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 mt-3">
                          ✅ Solutions pour corriger :
                        </h4>
                        <ol className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1.5 mb-2 list-decimal list-inside">
                          <li><strong>Vérifier les dépenses partagées</strong> : Pour chaque dépense partagée, ouvrez la transaction et assurez-vous que <strong>tous les participants concernés</strong> sont dans la liste "participants". Par exemple, si A paie 100€ pour A, B, C, D, la liste doit contenir [A, B, C, D], pas seulement [A].</li>
                          <li><strong>Ajouter des contributions</strong> : Si la cagnotte est déficitaire, enregistrez des contributions supplémentaires pour combler le déficit.</li>
                          <li><strong>Corriger les transactions suspectes</strong> : Bonkont détecte automatiquement les transactions où seul le payeur est dans la liste. Ouvrez ces transactions et ajoutez tous les participants concernés.</li>
                          <li><strong>Vérifier les montants</strong> : Assurez-vous que tous les montants sont corrects et que les devises sont cohérentes.</li>
                        </ol>
                        
                        <div className="mt-3 p-2 bg-yellow-200 dark:bg-yellow-800/50 rounded text-xs text-yellow-900 dark:text-yellow-100">
                          <strong>💡 Astuce</strong> : Bonkont applique automatiquement une correction pour les dépenses où seul le payeur est dans la liste, mais il est préférable de corriger manuellement les transactions pour garantir la précision des calculs.
                        </div>
                        
                        {/* Bouton pour enregistrer automatiquement les contributions théoriques */}
                        {transfersResult.autoCorrectionSuggestion && transfersResult.autoCorrectionSuggestion.type === 'missing_contributions' && (
                          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
                            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                              🚀 Correction automatique disponible
                            </p>
                            <p className="text-xs text-green-800 dark:text-green-200 mb-3">
                              Vous pouvez enregistrer automatiquement les contributions théoriques ({transfersResult.autoCorrectionSuggestion.theoreticalContributionPerParticipant.toFixed(2)}€ par participant) 
                              pour équilibrer les comptes.
                            </p>
                            <Button
                              onClick={handleRegisterTheoreticalContributions}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              Enregistrer les contributions théoriques ({transfersResult.autoCorrectionSuggestion.totalTheoreticalContributions.toFixed(2)}€ total)
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {transfers.length > 0 ? (
              <>
                {/* Vue globale des transferts */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-primary" />
                    Vue globale des transferts
                  </h3>
                  <div className="space-y-3">
                    {transfers.map((transfer, index) => (
                      <Card key={index} className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-lg text-destructive">{transfer.fromName}</span>
                              <span className="text-muted-foreground">verse</span>
                              <span className="font-semibold text-lg text-primary">{(transfer.amount || 0).toFixed(2)}€</span>
                              <span className="text-muted-foreground">à</span>
                              <span className="font-semibold text-lg text-green-600 dark:text-green-400">{transfer.toName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-auto p-1 text-muted-foreground hover:text-primary"
                              onClick={() => {
                                // Ouvrir le profil du participant pour voir le détail
                                const participant = event.participants.find(p => p.id === transfer.from);
                                if (participant) {
                                  setSelectedParticipant(participant);
                                }
                              }}
                            >
                              Voir le détail
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                
                {/* Vue par participant - Transparence totale */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Détail par participant : Avec qui régulariser ?
                  </h3>
                  <div className="space-y-3">
                    {Object.values(balances).map((balance) => {
                      const participantTransfers = getParticipantTransfers(balance.participantId, transfersResult);
                      const solde = balance.solde || 0;
                      const hasTransfers = participantTransfers.toReceive.length > 0 || participantTransfers.toPay.length > 0;
                      
                        return (
                        <Card key={balance.participantId} className="p-4 border-2">
                          <div className="mb-3">
                            <h4 className="font-semibold text-base mb-3">{balance.participantName}</h4>
                            
                            {/* Détail financier complet */}
                            <div className="mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                <div>
                                  <p className="text-muted-foreground mb-1">Contribution</p>
                                  <p className="font-semibold">{(balance.contribution || 0).toFixed(2)}€</p>
                              </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Avancé</p>
                                  <p className="font-semibold">{(balance.avance || 0).toFixed(2)}€</p>
                            </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Consommé</p>
                                  <p className="font-semibold">{(balance.consomme || 0).toFixed(2)}€</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Mise totale</p>
                                  <p className="font-semibold">{(balance.mise || 0).toFixed(2)}€</p>
                                </div>
                              </div>
                              <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-muted-foreground mb-1">Solde final</p>
                                <p className={`text-lg font-bold ${solde > 0.01 ? 'text-green-600 dark:text-green-400' : solde < -0.01 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                                  {solde >= 0 ? '+' : ''}{solde.toFixed(2)}€
                                  {solde > 0.01 && <span className="ml-2 text-sm font-normal">(à recevoir)</span>}
                                  {solde < -0.01 && <span className="ml-2 text-sm font-normal">(à verser)</span>}
                                  {Math.abs(solde) <= 0.01 && <span className="ml-2 text-sm font-normal">(équilibré)</span>}
                                </p>
                              </div>
                            </div>
                            
                            {/* Explication détaillée du solde */}
                            <div className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Explication du solde :</p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>
                                  <strong>Mise totale</strong> = Contribution ({((balance.contribution || 0)).toFixed(2)}€) + Avancé ({((balance.avance || 0)).toFixed(2)}€) = <strong>{((balance.mise || 0)).toFixed(2)}€</strong>
                                </p>
                                <p>
                                  <strong>Solde</strong> = Mise ({((balance.mise || 0)).toFixed(2)}€) - Consommé ({((balance.consomme || 0)).toFixed(2)}€) = <strong>{solde >= 0 ? '+' : ''}{solde.toFixed(2)}€</strong>
                                </p>
                                {Math.abs(solde) <= 0.01 ? (
                                  <p className="text-green-600 dark:text-green-400 font-medium mt-2">
                                    ✓ Votre compte est équilibré : vous avez consommé exactement ce que vous avez mis ({((balance.mise || 0)).toFixed(2)}€). Aucun ajustement n'est nécessaire.
                                  </p>
                                ) : solde > 0.01 ? (
                                  <p className="text-green-600 dark:text-green-400 font-medium mt-2">
                                    ✓ Vous devez recevoir {solde.toFixed(2)}€ car vous avez mis {((balance.mise || 0)).toFixed(2)}€ et consommé seulement {((balance.consomme || 0)).toFixed(2)}€.
                                  </p>
                                ) : (
                                  <p className="text-orange-600 dark:text-orange-400 font-medium mt-2">
                                    ⚠ Vous devez verser {Math.abs(solde).toFixed(2)}€ car vous avez consommé {((balance.consomme || 0)).toFixed(2)}€ alors que vous n'avez mis que {((balance.mise || 0)).toFixed(2)}€.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Transferts détaillés */}
                          {hasTransfers ? (
                            <>
                          {participantTransfers.toReceive.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 text-green-600 dark:text-green-400" />
                                Reçoit de :
                              </p>
                              <div className="space-y-2">
                                {participantTransfers.toReceive.map((transfer, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{transfer.fromName}</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                          {(transfer.amount || 0).toFixed(2)}€
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {participantTransfers.toPay.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 text-orange-600 dark:text-orange-400 rotate-180" />
                                Verse à :
                              </p>
                              <div className="space-y-2">
                                {participantTransfers.toPay.map((transfer, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{transfer.toName}</span>
                                    </div>
                                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                          {(transfer.amount || 0).toFixed(2)}€
                                    </span>
                                  </div>
                                ))}
                              </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                ✓ Aucun transfert nécessaire
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {Math.abs(solde) <= 0.01 
                                  ? "Votre compte est équilibré : vous avez consommé exactement ce que vous avez mis. Aucun ajustement n'est nécessaire."
                                  : solde > 0.01
                                    ? `Votre solde positif de ${solde.toFixed(2)}€ sera équilibré par les transferts des autres participants.`
                                    : `Votre solde négatif de ${Math.abs(solde).toFixed(2)}€ sera équilibré par les transferts vers les autres participants.`
                                }
                              </p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">
                  ✅ Tout est équilibré
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aucun transfert nécessaire. La liste sera mise à jour automatiquement dès qu'une transaction créera un déséquilibre.
                </p>
              </div>
            )}
          </Card>
        );
      })()}
            </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* Scanner de ticket */}
      <EventTicketScanner
        eventId={eventId}
        participantId={scannerParticipantId}
        isOpen={isScannerOpen}
        onClose={() => {
          console.log('[EventManagement] Closing scanner');
          setIsScannerOpen(false);
          setScannerParticipantId(null);
        }}
        onPaymentProcessed={() => {
          console.log('[EventManagement] Payment processed, refreshing view');
          // Le store se met à jour automatiquement, pas besoin de refresh manuel
        }}
      />

      {/* Dialog pour les détails du participant */}
      <Dialog open={selectedParticipant !== null} onOpenChange={() => setSelectedParticipant(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Profil du participant</DialogTitle>
            <DialogDescription>
              Consultez les détails et l'historique des transactions de ce participant
            </DialogDescription>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedParticipant.name}</h3>
                <p className="text-muted-foreground">{selectedParticipant.email}</p>
              </div>
              
              <div className="relative">
              <Button
                variant="outline"
                  className="relative w-full gap-2 scanner-ticket-btn animate-pulse-slow hover:animate-none hover:scale-105 transition-all duration-300 border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
                onClick={() => {
                  console.log('[EventManagement] Opening scanner from participant dialog');
                  setSelectedParticipant(null);
                  setScannerParticipantId(selectedParticipant.id);
                  setIsScannerOpen(true);
                }}
              >
                  <div className="relative">
                    <Scan className="w-4 h-4 relative z-10" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                  </div>
                  <span className="font-semibold">Scanner un ticket CB</span>
              </Button>
                <Badge 
                  variant="outline" 
                  className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-purple-600 text-white border-0 text-[10px] px-1.5 py-0.5 shadow-lg animate-bounce"
                  style={{ animation: 'bounce 2s infinite' }}
                >
                  ✨ Innovation
                </Badge>
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground italic">
                    Un simple scan de ton ticket CB, Tu valides collectivement, Tu partages les frais
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Participations</p>
                  <p className="text-2xl font-bold">{participants.length}</p>
                  <p className="text-xs text-muted-foreground">événements</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Score</p>
                  <p className="text-2xl font-bold">{getParticipantStats(selectedParticipant).score}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Notes et évaluations</h4>
                <div className="p-4 rounded-lg border border-border bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    {selectedParticipant.hasPaid 
                      ? 'Participant fiable et ponctuel dans ses paiements.'
                      : 'En attente de paiement.'}
                  </p>
                  {getParticipantStats(selectedParticipant).paymentRank && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Classé {getParticipantStats(selectedParticipant).paymentRank}ème pour la ponctualité
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Détails financiers</h4>
                
                {(() => {
                  const stats = getParticipantStats(selectedParticipant);
                  
                  // Calculer les soldes Bonkont
                  const balancesResult = computeBalances(event, transactions);
                  const { balances, potBalance } = balancesResult;
                  const transfersResult = computeTransfers(balancesResult);
                  const transfers = transfersResult.transfers || [];
                  const potTransfers = transfersResult.potTransfers || [];
                  const participantBalance = balances[selectedParticipant.id] || {
                    participantId: selectedParticipant.id,
                    participantName: selectedParticipant.name || selectedParticipant.firstName || selectedParticipant.email || 'Participant inconnu',
                    contribution: 0,
                    avance: 0,
                    consomme: 0,
                    mise: 0,
                    solde: 0,
                    paidOut: 0,
                    received: 0,
                    rembPot: 0
                  };
                  
                  // S'assurer que toutes les propriétés numériques sont définies
                  const safeBalance = {
                    ...participantBalance,
                    contribution: participantBalance.contribution ?? 0,
                    avance: participantBalance.avance ?? 0,
                    consomme: participantBalance.consomme ?? 0,
                    mise: participantBalance.mise ?? 0,
                    solde: participantBalance.solde ?? 0,
                    paidOut: participantBalance.paidOut ?? 0,
                    received: participantBalance.received ?? 0,
                    rembPot: participantBalance.rembPot ?? 0
                  };
                  
                  // Obtenir les transferts pour ce participant
                  const participantTransfers = getParticipantTransfers(selectedParticipant.id, transfersResult);
                  
                  // Obtenir la traçabilité des dépenses
                  const expenseTraceability = getExpenseTraceability(selectedParticipant.id, event, transactions);
                  
                  // Obtenir la traçabilité des paiements
                  const paymentTraceability = getPaymentTraceability(selectedParticipant.id, event, transactions);
                  
                  // Part cible (budget)
                  const partCible = event.amount / event.participants.length;
                  
                  // Contributions vers POT (source unique de vérité)
                  // Utilise la même fonction que dans computeBalances pour garantir la cohérence
                  const contributions = getContributionToPot(selectedParticipant.id, event, transactions);
                  
                  // Solde provisoire (répartition)
                  const soldeProvisoire = safeBalance.solde;
                  
                  return (
                    <>
                      {/* Bloc 1: Résumé du solde */}
                      <div className={`p-4 rounded-lg border-2 ${
                        soldeProvisoire > 0.01 
                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' 
                          : soldeProvisoire < -0.01
                            ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20'
                            : 'border-green-300 bg-green-50 dark:bg-green-950/20'
                      }`}>
                        <h5 className="font-semibold text-base mb-3">
                          {soldeProvisoire > 0.01 
                            ? '💰 Solde : À recevoir' 
                            : soldeProvisoire < -0.01
                              ? '💸 Solde : À verser'
                              : '✅ Solde : Équilibré'}
                        </h5>
                        <div className="text-center mb-3">
                          <span className={`text-3xl font-bold ${
                            soldeProvisoire > 0.01 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : soldeProvisoire < -0.01
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-green-600 dark:text-green-400'
                          }`}>
                            {soldeProvisoire >= 0 ? '+' : ''}{soldeProvisoire.toFixed(2)}€
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center italic">
                          Basé sur dépenses validées + paiements enregistrés
                        </p>
                      </div>
                      
                      {/* Bloc 2: Transferts nominatifs - Qui verse à qui */}
                      {participantTransfers.hasTransfers && (
                        <div className="p-4 rounded-lg border border-border bg-purple-50 dark:bg-purple-950/20">
                          <h5 className="font-semibold text-sm mb-3 text-purple-700 dark:text-purple-400">
                            🔄 Avec qui régulariser
                          </h5>
                          
                          {participantTransfers.toReceive.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Tu reçois :</p>
                              <div className="space-y-2">
                                {participantTransfers.toReceive.map((transfer, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      <span className="text-sm font-medium">{transfer.fromName}</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                      {(transfer.amount || 0).toFixed(2)}€
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {participantTransfers.toPay.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Tu verses :</p>
                              <div className="space-y-2">
                                {participantTransfers.toPay.map((transfer, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400 rotate-180" />
                                      <span className="text-sm font-medium">{transfer.toName}</span>
                                    </div>
                                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                      {(transfer.amount || 0).toFixed(2)}€
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!participantTransfers.hasTransfers && Math.abs(soldeProvisoire) < 0.01 && (
                        <div className="p-4 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20">
                          <p className="text-sm text-center text-green-700 dark:text-green-400">
                            ✅ Aucun transfert nécessaire - Participation équilibrée
                          </p>
                        </div>
                      )}
                      
                      {/* Bloc 3: Justification - Pourquoi mon solde est comme ça */}
                      <div className="p-4 rounded-lg border border-border bg-gray-50 dark:bg-gray-950/20">
                        <h5 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">
                          📊 Pourquoi mon solde est comme ça
                        </h5>
                        
                        {/* Mise de fonds réelle */}
                        <div className="mb-4">
                          <h6 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Mise de fonds réelle</h6>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span className="text-muted-foreground">Contribution (→ POT):</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                +{getContributionToPot(selectedParticipant.id, event, transactions).toFixed(2)}€
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span className="text-muted-foreground">Avancé (dépenses payées):</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                +{safeBalance.avance.toFixed(2)}€
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span className="text-muted-foreground">Paiements directs versés:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                +{safeBalance.paidOut.toFixed(2)}€
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span className="text-muted-foreground">Paiements directs reçus:</span>
                              <span className="font-medium text-orange-600 dark:text-orange-400">
                                -{safeBalance.received.toFixed(2)}€
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span className="text-muted-foreground">Remboursements POT:</span>
                              <span className="font-medium text-orange-600 dark:text-orange-400">
                                -{safeBalance.rembPot.toFixed(2)}€
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                              <span className="font-semibold">Mise totale:</span>
                              <span className={`font-bold ${
                                safeBalance.mise >= 0 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {safeBalance.mise >= 0 ? '+' : ''}
                                {safeBalance.mise.toFixed(2)}€
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Consommation réelle */}
                        <div className="mb-4">
                          <h6 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Consommation réelle</h6>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                              <span className="text-muted-foreground">Consommé (ma part):</span>
                              <span className="font-medium text-orange-600 dark:text-orange-400">
                                -{safeBalance.consomme.toFixed(2)}€
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Solde provisoire équitable */}
                        <div className="border-t pt-3">
                          <div className="flex justify-between p-2 bg-primary/10 rounded">
                            <span className="text-xs font-bold">Solde provisoire (Mise - Consommation):</span>
                            <span className={`text-sm font-bold ${
                              soldeProvisoire >= 0 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-orange-600 dark:text-orange-400'
                            }`}>
                              {soldeProvisoire >= 0 ? '+' : ''}{soldeProvisoire.toFixed(2)}€
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bloc 4: Traçabilité - Sur quelles dépenses ça se base */}
                      {(expenseTraceability.depensesAvancees.length > 0 || expenseTraceability.depensesConsommees.length > 0) && (
                        <div className="p-4 rounded-lg border border-border bg-indigo-50 dark:bg-indigo-950/20">
                          <h5 className="font-semibold text-sm mb-3 text-indigo-700 dark:text-indigo-400">
                            📋 Traçabilité des dépenses
                          </h5>
                          
                          {expenseTraceability.depensesAvancees.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Dépenses que tu as avancées :</p>
                              <ScrollArea className="h-32">
                                <div className="space-y-1">
                                  {expenseTraceability.depensesAvancees.map((dep, idx) => (
                                    <div key={idx} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <span className="font-medium">{dep.description}</span>
                                          <span className="text-muted-foreground ml-2">
                                            ({dep.participantsConcerned} participant{dep.participantsConcerned > 1 ? 's' : ''})
                                          </span>
                                        </div>
                                        <span className="font-bold text-green-600 dark:text-green-400 ml-2">
                                          {dep.amount.toFixed(2)}€
                                        </span>
                                      </div>
                                      <div className="text-muted-foreground text-xs mt-1">
                                        Part par personne : {((dep.partParPersonne || dep.share) || 0).toFixed(2)}€
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                          
                          {expenseTraceability.depensesConsommees.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Dépenses que tu as consommées :</p>
                              <ScrollArea className="h-32">
                                <div className="space-y-1">
                                  {expenseTraceability.depensesConsommees.map((dep, idx) => (
                                    <div key={idx} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <span className="font-medium">{dep.description}</span>
                                          {dep.payerName && (
                                            <span className="text-muted-foreground ml-2">
                                              (payé par {dep.payerName})
                                            </span>
                                          )}
                                        </div>
                                        <span className="font-bold text-blue-600 dark:text-blue-400 ml-2">
                                          {(dep.part || 0).toFixed(2)}€
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Bloc 4b: Traçabilité des paiements */}
                      {(paymentTraceability.paiementsVerses.length > 0 || paymentTraceability.paiementsRecus.length > 0) && (
                        <div className="p-4 rounded-lg border border-border bg-purple-50 dark:bg-purple-950/20">
                          <h5 className="font-semibold text-sm mb-3 text-purple-700 dark:text-purple-400">
                            💳 Traçabilité des paiements
                          </h5>
                          
                          {paymentTraceability.paiementsVerses.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Paiements que tu as versés :</p>
                              <ScrollArea className="h-32">
                                <div className="space-y-1">
                                  {paymentTraceability.paiementsVerses.map((paiement, idx) => (
                                    <div key={idx} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <span className="font-medium">{paiement.description}</span>
                                          <span className="text-muted-foreground ml-2">
                                            → {paiement.toName}
                                          </span>
                                        </div>
                                        <span className="font-bold text-green-600 dark:text-green-400 ml-2">
                                          {(paiement.amount || 0).toFixed(2)}€
                                        </span>
                                      </div>
                                      <div className="text-muted-foreground text-xs mt-1 space-y-1">
                                        <div>Méthode : {paiement.method}</div>
                                        {paiement.isCollectivelyValidated && (
                                          <div className="mt-1 p-1.5 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                                            <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                              <span className="font-medium text-xs">Validé collectivement</span>
                                            </div>
                                            {paiement.validators.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5 ml-4">
                                                Par : {paiement.validators.join(', ')}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                          
                          {paymentTraceability.paiementsRecus.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Paiements que tu as reçus :</p>
                              <ScrollArea className="h-32">
                                <div className="space-y-1">
                                  {paymentTraceability.paiementsRecus.map((paiement, idx) => (
                                    <div key={idx} className="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <span className="font-medium">{paiement.description}</span>
                                          <span className="text-muted-foreground ml-2">
                                            ← {paiement.fromName}
                                          </span>
                                        </div>
                                        <span className="font-bold text-blue-600 dark:text-blue-400 ml-2">
                                          {(paiement.amount || 0).toFixed(2)}€
                                        </span>
                                      </div>
                                      <div className="text-muted-foreground text-xs mt-1 space-y-1">
                                        <div>Méthode : {paiement.method}</div>
                                        {paiement.isCollectivelyValidated && (
                                          <div className="mt-1 p-1.5 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                                            <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                              <span className="font-medium text-xs">Validé collectivement</span>
                                            </div>
                                            {paiement.validators.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5 ml-4">
                                                Par : {paiement.validators.join(', ')}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Bloc 5: Budget (repère) - séparé pour ne pas confondre */}
                      <div className="p-4 rounded-lg border border-border bg-primary/5">
                        <h5 className="font-semibold text-sm mb-2 text-primary">📐 Budget (repère)</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Part cible</span>
                            <span className="font-semibold text-lg">{partCible.toFixed(2)}€</span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            Budget total / Nombre de participants (limite théorique)
                          </p>
                          <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Contributions versées:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {contributions.toFixed(2)}€
                              </span>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-muted-foreground">Écart vs part cible:</span>
                              <span className={`font-medium ${
                                contributions >= partCible 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {contributions >= partCible ? '+' : ''}{(contributions - partCible).toFixed(2)}€
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog pour ajouter manuellement un participant */}
      <Dialog open={showAddParticipantDialog} onOpenChange={setShowAddParticipantDialog}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Ajouter un participant
            </DialogTitle>
            <DialogDescription>
              Ajoutez manuellement un participant à l'événement. Il sera automatiquement confirmé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newParticipantName">Nom *</Label>
              <Input
                id="newParticipantName"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="neon-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newParticipantEmail">Email (optionnel)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="newParticipantEmail"
                  type="email"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  placeholder="jean.dupont@example.com"
                  className="pl-10 neon-border"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                L'email permettra d'envoyer une invitation pour rejoindre l'événement.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setNewParticipantName('');
                  setNewParticipantEmail('');
                  setShowAddParticipantDialog(false);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddParticipantManually}
                disabled={!newParticipantName.trim()}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

