import { useState, useEffect } from 'react';
import { EventCreation } from '@/components/EventCreation';
import { EventDashboard } from '@/components/EventDashboard';
import { EventManagement } from '@/components/EventManagement';
import { TransactionManagement } from '@/components/TransactionManagement';
import { EventHistory } from '@/components/EventHistory';
import { EventClosure } from '@/components/EventClosure';
import { EventJoin } from '@/components/EventJoin';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthDialog } from '@/components/AuthDialog';
import { InviteFriends } from '@/components/InviteFriends';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SettingsDialog } from '@/components/SettingsDialog';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import { TermsOfService } from '@/components/TermsOfService';
import { FAQ } from '@/components/FAQ';
import { Contact } from '@/components/Contact';
import { Wallet2, LogIn, ArrowLeft, Settings, UserPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import { useI18nStore } from '@/lib/i18n';
import { migrateLocalTransactionsToFirestore } from '@/utils/migrateLocalTransactions';
import { addTransactionToFirestore } from '@/services/api';

export default function App() {
  const { toast } = useToast();
  const { t } = useI18nStore();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return !!localStorage.getItem('bonkont-user');
    } catch {
      return false;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState('account');
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEventCreation, setShowEventCreation] = useState(false); // Contrôle l'affichage de EventCreation
  // Ouvrir BONKONT sur la page login (home) UNIQUEMENT si non connecté
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    const h = window.location.hash;
    if (h.startsWith('#/join') || h === '#/join') return 'join';
    if (h === '#/dashboard' || h === '#dashboard') {
      try {
        if (!localStorage.getItem('bonkont-user')) return 'home'; // non connecté → page login
      } catch (_) {}
      return 'dashboard-view';
    }
    if (h.startsWith('#event/')) {
      const segment = h.replace('#event/', '').split('/')[0] || '';
      if (/^[A-Z]{8}$/i.test(segment)) return 'join'; // code 8 lettres → formulaire
      return 'event';
    }
    return 'home';
  });
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [viewMode, setViewMode] = useState('management'); // 'management', 'transactions', or 'closure'
  const [showDashboardList, setShowDashboardList] = useState(false); // false = ouvrir sur EventManagement (1er événement)
  const events = useEventStore((state) => state.events);

  // Migration unique : anciennes transactions localStorage → Firestore (les données ne disparaissent pas)
  useEffect(() => {
    const t = setTimeout(() => {
      migrateLocalTransactionsToFirestore({
        getEvents: () => useEventStore.getState().events,
        addTransactionToFirestore,
      });
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // Fonction utilitaire pour rechercher et ouvrir un événement par code
  // Accessible depuis la console : window.findEventByCode('JELHFMFA')
  useEffect(() => {
    window.findEventByCode = async (code) => {
      console.log('[App] 🔍 Searching for event with code:', code);
      
      if (!code || !code.trim()) {
        console.error('[App] ❌ Code is required');
        return null;
      }
      
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '');
      console.log('[App] 🔍 Cleaned code:', cleanCode);
      
      // 1. Chercher dans le store local
      const events = useEventStore.getState().events;
      const localEvent = events.find(e => {
        const eventCode = e.code?.toUpperCase()?.replace(/[^A-Z]/g, '') || '';
        return eventCode === cleanCode;
      });
      
      if (localEvent) {
        console.log('[App] ✅ Event found in local store:', {
          id: localEvent.id,
          title: localEvent.title,
          code: localEvent.code
        });
        
        // Naviguer vers l'événement
        window.location.hash = `#event/${localEvent.id}`;
        setTimeout(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }, 100);
        
        return localEvent;
      }
      
      // 2. Chercher dans Firestore (version publique : pas de participants, utilisable par invité)
      console.log('[App] 🔍 Event not found locally, searching in Firestore...');
      try {
        const { findEventByCodePublic } = await import('@/services/api');
        const firestoreEvent = await findEventByCodePublic(cleanCode);
        
        if (firestoreEvent) {
          console.log('[App] ✅ Event found in Firestore:', {
            id: firestoreEvent.id,
            title: firestoreEvent.title,
            code: firestoreEvent.code
          });
          
          // Ajouter au store local
          const addEvent = useEventStore.getState().addEvent;
          addEvent(firestoreEvent);
          
          // Naviguer vers l'événement
          window.location.hash = `#event/${firestoreEvent.id}`;
          setTimeout(() => {
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }, 100);
          
          return firestoreEvent;
        } else {
          console.error('[App] ❌ Event not found in Firestore');
          console.log('[App] 💡 The event might not have been synced to Firestore');
          console.log('[App] 💡 Try syncing it manually or check if the code is correct');
          return null;
        }
      } catch (error) {
        console.error('[App] ❌ Error searching in Firestore:', error);
        return null;
      }
    };
    
    console.log('[App] ✅ Utility function window.findEventByCode() is now available');
    console.log('[App] 💡 Usage: window.findEventByCode("JELHFMFA")');
    
    // Exposer removeDuplicateParticipants dans la console pour supprimer les doublons
    window.removeDuplicateParticipants = async (code) => {
      const { removeDuplicateParticipants } = await import('@/services/firestoreService');
      return removeDuplicateParticipants(code);
    };
    console.log('[App] ✅ Utility function window.removeDuplicateParticipants() is now available');
    console.log('[App] 💡 Usage: window.removeDuplicateParticipants("AMDZQINI")');
  }, []);

  // Correctif molette : faire défiler le bon conteneur (body = scroll en prod)
  useEffect(() => {
    const isScrollableElement = (el) => {
      if (!el || el === document.documentElement || el === document.body) return false;
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY || style.overflow;
      return (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    };
    const getScrollableAncestor = (target) => {
      let node = target;
      while (node && node !== document.body) {
        if (isScrollableElement(node)) return node;
        node = node.parentElement;
      }
      return null;
    };
    const onWheel = (e) => {
      if (getScrollableAncestor(e.target)) return;
      // Scroll sur body (conteneur en prod) ou documentElement selon où le scroll est actif
      const body = document.body;
      const html = document.documentElement;
      const bodyScrollable = body.scrollHeight > body.clientHeight;
      const htmlScrollable = html.scrollHeight > html.clientHeight;
      if (bodyScrollable) {
        body.scrollTop += e.deltaY;
        e.preventDefault();
      } else if (htmlScrollable) {
        html.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Synchroniser l'état d'auth avec localStorage (sans polling)
  useEffect(() => {
    const readAuth = () => {
      let shouldBeLoggedIn = false;
      try {
        shouldBeLoggedIn = !!localStorage.getItem('bonkont-user');
      } catch {
        shouldBeLoggedIn = false;
      }

      console.log('[App] Checking auth state:', shouldBeLoggedIn ? 'LOGGED IN' : 'LOGGED OUT');
      setIsLoggedIn(shouldBeLoggedIn);
    };

    // Init
    readAuth();

    // Changement depuis un autre onglet
    const onStorage = (e) => {
      if (e.key === 'bonkont-user') {
        readAuth();
      }
    };
    window.addEventListener('storage', onStorage);

    // Re-vérifier au retour sur l’onglet (cas mobile / PWA)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        readAuth();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
  // Toujours ouvrir sur la homepage (Se connecter), jamais sur tableau de bord ni créer un événement
  const h = window.location.hash;
  if (!h || h === '' || h === '#') {
    window.location.hash = '';
    setCurrentView('home');
    setSelectedEventId(null);
    setShowEventCreation(false);
    setShowHistory(false);
    setShowStats(false);
  }
  const logScreenInfo = () => {
    const width = window.innerWidth;
    const layoutInfo = {
      hasHorizontalScroll: document.documentElement.scrollWidth > width
    };
    if (layoutInfo.hasHorizontalScroll) {
      console.warn('[App] ⚠️ DÉCALAGE DÉTECTÉ: Scroll horizontal présent!', {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        difference: document.documentElement.scrollWidth - document.documentElement.clientWidth
      });
    }
  };
  logScreenInfo();

  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;
    const isDesktop = width >= 1024;
    
    // Vérifier les décalages
    const body = document.body;
    const root = document.getElementById('root');
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    
    const bodyRect = body?.getBoundingClientRect();
    const rootRect = root?.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    const mainRect = main?.getBoundingClientRect();
    
    const layoutInfo = {
      bodyWidth: bodyRect?.width,
      bodyLeft: bodyRect?.left,
      rootWidth: rootRect?.width,
      rootLeft: rootRect?.left,
      headerWidth: headerRect?.width,
      headerLeft: headerRect?.left,
      mainWidth: mainRect?.width,
      mainLeft: mainRect?.left,
      hasHorizontalScroll: document.documentElement.scrollWidth > width,
      scrollbarWidth: window.innerWidth - document.documentElement.clientWidth
    };
    
    if (layoutInfo.hasHorizontalScroll) {
      console.warn('[App] ⚠️ DÉCALAGE DÉTECTÉ: Scroll horizontal présent!', {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        difference: document.documentElement.scrollWidth - document.documentElement.clientWidth
      });
    }
  };

  const handleHashChange = () => {
    const hash = window.location.hash;

    let userData = null;
    try {
      userData = typeof window !== 'undefined' ? localStorage.getItem('bonkont-user') : null;
    } catch {
      userData = null;
    }
    const isAuthenticated = !!userData;

    // Si pas de hash ou hash vide : donner du temps à l'invité en cours de rejoindre
    if (!hash || hash === '' || hash === '#') {
      try {
        const savedJoinHash = sessionStorage.getItem('bonkont-join-hash');
        if (savedJoinHash && (savedJoinHash.startsWith('#/join/') || savedJoinHash === '#/join')) {
          // L'utilisateur était en train de rejoindre : restaurer la page pour ne pas décrocher
          window.location.hash = savedJoinHash;
          setCurrentView('join');
          setSelectedEventId(null);
          setShowHistory(false);
          setShowStats(false);
          return;
        }
      } catch (_) {}
      try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
      setCurrentView('home');
      setSelectedEventId(null);
      setViewMode('management');
      setShowHistory(false);
      setShowStats(false);
      setShowEventCreation(false);
      return;
    }

    // Gérer les routes publiques
    if (hash === '#/privacy' || hash === '#privacy') {
      setCurrentView('privacy');
      setSelectedEventId(null);
      setShowHistory(false);
      setShowStats(false);
      return;
    }
    if (hash === '#/terms' || hash === '#terms') {
      setCurrentView('terms');
      setSelectedEventId(null);
      setShowHistory(false);
      setShowStats(false);
      return;
    }
    if (hash === '#/faq' || hash === '#faq') {
      setCurrentView('faq');
      setSelectedEventId(null);
      setShowHistory(false);
      setShowStats(false);
      return;
    }
    if (hash === '#/contact' || hash === '#contact') {
      setCurrentView('contact');
      setSelectedEventId(null);
      setShowHistory(false);
      setShowStats(false);
      return;
    }
    // Route pour le tableau de bord (nécessite une authentification)
    if (hash === '#/dashboard' || hash === '#dashboard') {
      const isAuthenticatedForDashboard = !!userData;
      if (!isAuthenticatedForDashboard) {
        try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
        window.location.hash = '';
        setCurrentView('home');
        setSelectedEventId(null);
        setShowEventCreation(false);
        setShowHistory(false);
        if (isLoggedIn) setIsLoggedIn(false);
        return;
      }
      try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
      if (!isLoggedIn) setIsLoggedIn(true);
      setCurrentView('dashboard-view');
      setSelectedEventId(null);
      setViewMode('management');
      setShowHistory(false);
      setShowStats(false);
      setShowEventCreation(false);
      setShowDashboardList(false); // ouvrir sur EventManagement (1er événement)
      return;
    }
    // Route pour rejoindre un événement (seulement si hash explicite #/join ou #/join/CODE)
    if (hash.startsWith('#/join/') || hash === '#/join') {
      try {
        sessionStorage.setItem('bonkont-join-hash', hash);
      } catch (_) {}
      console.log('[App] ✅✅✅ Navigating to JOIN view, hash:', hash);
      setCurrentView('join');
      setSelectedEventId(null);
      setShowHistory(false);
      setShowStats(false);
      return;
    }
    // Route pour rejoindre via code événement direct: /event/:code
    const eventCodeMatch = hash.match(/^#\/event\/([A-Z0-9-]+)$/);
    if (eventCodeMatch && !hash.includes('/transactions') && !hash.includes('/closure')) {
      const code = eventCodeMatch[1];
      // Vérifier si c'est un code (format court) ou un ID (format long)
      const events = useEventStore.getState().events;
      const eventByCode = events.find(e => e.code?.toUpperCase() === code.toUpperCase());
      if (eventByCode) {
        // C'est un code, rediriger vers la page de rejoindre
        window.location.hash = `#/join/${code}`;
        setCurrentView('join');
        setSelectedEventId(null);
        setShowHistory(false);
        setShowStats(false);
        return;
      }
    }

    if (hash.startsWith('#event/')) {
      const eventId = hash.replace('#event/', '').split('/')[0];
      // Si le segment est un code événement (8 lettres) : résoudre et ouvrir l'événement si invité confirmé, sinon formulaire rejoindre
      const looksLikeEventCode = /^[A-Z]{8}$/.test(String(eventId).toUpperCase());
      if (looksLikeEventCode && !hash.includes('/transactions') && !hash.includes('/closure')) {
        const code = String(eventId).toUpperCase();
        window.location.hash = `#/join/${code}`;
        setCurrentView('join');
        setSelectedEventId(null);
        setShowHistory(false);
        setShowStats(false);
        (async () => {
          try {
            const userData = typeof window !== 'undefined' ? localStorage.getItem('bonkont-user') : null;
            if (!userData) return;
            const { findEventByCodePublic, findEventByCode } = await import('@/services/api');
            const ev = await findEventByCodePublic(code);
            if (!ev?.id) return;
            const fullEvent = await findEventByCode(code);
            if (!fullEvent?.participants?.length) return;
            const user = JSON.parse(userData);
            const userEmail = (user.email || user.id || '').trim().toLowerCase() || null;
            if (!userEmail) return;
            const isOrganizer = (fullEvent.organizerId || '').toLowerCase().trim() === userEmail;
            const isConfirmed = fullEvent.participants.some(p =>
              ((p.email || '').toLowerCase().trim() === userEmail || (p.userId || '').toLowerCase().trim() === userEmail) &&
              (p.status === 'confirmed' || p.status === 'approved' || p.approved === true)
            );
            if (!isOrganizer && !isConfirmed) return;
            const addEventToStore = useEventStore.getState().addEvent;
            addEventToStore({ ...fullEvent, firestoreId: fullEvent.id });
            try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
            setSelectedEventId(fullEvent.id);
            setViewMode('management');
            setCurrentView('event');
            setShowHistory(false);
            setShowStats(false);
            window.location.hash = `#event/${fullEvent.id}`;
          } catch (_) {}
        })();
        return;
      }
      let mode = 'management';
      if (hash.includes('/transactions')) {
        mode = 'transactions';
      } else if (hash.includes('/closure')) {
        mode = 'closure';
      }
      console.log('[App] Navigating to event view:', { eventId, mode, hash });
      
      // Vérifier que l'événement existe (par ID ou firestoreId)
      const events = useEventStore.getState().events;
      const eventExists = events.some(e => 
        String(e.id) === String(eventId) || 
        String(e.firestoreId) === String(eventId) ||
        String(e.firestoreEventId) === String(eventId)
      );
      
      console.log('[App] Event check:', {
        eventId,
        eventExists,
        eventsCount: events.length,
        availableIds: events.map(e => ({ id: e.id, firestoreId: e.firestoreId, firestoreEventId: e.firestoreEventId }))
      });
      
      // Événement absent du store : charger par ID depuis Firestore, puis brancher selon le rôle
      if (!eventExists) {
        const idStr = String(eventId).trim();
        const looksLikeFirestoreId = idStr.length >= 15 && /^[a-zA-Z0-9]+$/.test(idStr);
        if (looksLikeFirestoreId) {
          (async () => {
            try {
              const { getEventById } = await import('@/services/api');
              const ev = await getEventById(eventId);
              const addEventToStore = useEventStore.getState().addEvent;
              if (!ev?.code) {
                window.location.hash = '#/join';
                setCurrentView('join');
                setSelectedEventId(null);
                setShowHistory(false);
                setShowStats(false);
                return;
              }
              addEventToStore({ ...ev, firestoreId: ev.id });
              // Branchement clair : si l'utilisateur est déjà organisateur ou participant confirmé → accès direct à l'événement
              let userEmail = null;
              try {
                const userData = localStorage.getItem('bonkont-user');
                if (userData) {
                  const user = JSON.parse(userData);
                  userEmail = (user.email || user.id || '').trim().toLowerCase() || null;
                }
              } catch (_) {}
              const isOrganizer = userEmail && (ev.organizerId || '').toLowerCase().trim() === userEmail;
              const isConfirmedParticipant = userEmail && ev.participants?.some(p =>
                ((p.email || '').toLowerCase().trim() === userEmail || (p.userId || '').toLowerCase().trim() === userEmail) &&
                (p.status === 'confirmed' || p.status === 'approved' || p.approved === true)
              );
              if (isOrganizer || isConfirmedParticipant) {
                try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
                setSelectedEventId(ev.id);
                setViewMode(mode);
                setCurrentView('event');
                setShowHistory(false);
                setShowStats(false);
                return;
              }
              // Sinon : invité non accepté → parcours Rejoindre
              window.location.hash = `#/join/${ev.code}`;
              setCurrentView('join');
              setSelectedEventId(null);
              setShowHistory(false);
              setShowStats(false);
            } catch (_) {
              window.location.hash = '#/join';
              setCurrentView('join');
              setSelectedEventId(null);
              setShowHistory(false);
              setShowStats(false);
            }
          })();
          return;
        }
        // Court délai au cas où l'événement serait en cours d'ajout (ex. juste après création)
        if (events.length > 0) {
          setTimeout(() => {
            const eventsAfterWait = useEventStore.getState().events;
            const existsAfter = eventsAfterWait.some(e => 
              String(e.id) === String(eventId) || 
              String(e.firestoreId) === String(eventId) ||
              String(e.firestoreEventId) === String(eventId)
            );
            if (existsAfter) {
              setSelectedEventId(eventId);
              setViewMode(mode);
              try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
              setCurrentView('event');
              setShowHistory(false);
              setShowStats(false);
            } else {
              window.location.hash = '#/join';
              setCurrentView('join');
              setSelectedEventId(null);
              setShowHistory(false);
              setShowStats(false);
            }
          }, 300);
          return;
        }
        window.location.hash = '#/join';
        setCurrentView('join');
        setSelectedEventId(null);
        setShowHistory(false);
        setShowStats(false);
        return;
      }
      
      // Vérifier si l'utilisateur est un participant confirmé de l'événement
      if (eventExists && isAuthenticated) {
        const foundEvent = events.find(e => 
          String(e.id) === String(eventId) || 
          String(e.firestoreId) === String(eventId) ||
          String(e.firestoreEventId) === String(eventId)
        );
        
        if (foundEvent && foundEvent.code) {
          const userEmail = (() => {
            try {
              const userData = localStorage.getItem('bonkont-user');
              if (!userData) return null;
              const user = JSON.parse(userData);
              return user.email || null;
            } catch {
              return null;
            }
          })();
          
          // Vérifier si l'utilisateur est un participant confirmé (confirmed ou approved)
          const part = foundEvent.participants?.find(p =>
            (p.email && p.email.toLowerCase() === userEmail.toLowerCase()) ||
            (p.userId && p.userId.toLowerCase() === userEmail.toLowerCase())
          );
          const isParticipant = userEmail && part && (part.status === 'confirmed' || part.status === 'approved' || part.approved === true);
          
          // Vérifier si l'utilisateur est l'organisateur
          const isOrganizer = userEmail && foundEvent.organizerId && 
            foundEvent.organizerId.toLowerCase() === userEmail.toLowerCase();
          
          if (!isParticipant && !isOrganizer) {
            console.log('[App] User is not a confirmed participant, redirecting to join page:', {
              userEmail,
              eventCode: foundEvent.code,
              isParticipant,
              isOrganizer
            });
            // Rediriger vers la page de rejoindre avec le code
            window.location.hash = `#/join/${foundEvent.code}`;
            setCurrentView('join');
            setSelectedEventId(null);
            setShowHistory(false);
            setShowStats(false);
            return;
          }
        }
      }
      
      // Si l'utilisateur n'est pas connecté mais qu'un événement existe, rediriger vers la page de rejoindre
      if (!isAuthenticated && eventExists) {
        const foundEvent = events.find(e => 
          String(e.id) === String(eventId) || 
          String(e.firestoreId) === String(eventId) ||
          String(e.firestoreEventId) === String(eventId)
        );
        
        if (foundEvent && foundEvent.code) {
          console.log('[App] User not logged in, redirecting to join page:', foundEvent.code);
          window.location.hash = `#/join/${foundEvent.code}`;
          setCurrentView('join');
          setSelectedEventId(null);
          setShowHistory(false);
          setShowStats(false);
          return;
        }
      }
      
      try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
      setSelectedEventId(eventId);
      setViewMode(mode);
      setCurrentView('event');
      setShowHistory(false);
      setShowStats(false);
    } else {
      // Pas d'événement spécifique dans l'URL, afficher la homepage
      console.log('[App] Navigating to home page');
      setCurrentView('home');
      setSelectedEventId(null);
      setViewMode('management');
      setShowHistory(false);
      // Ne pas réinitialiser showStats ici, il est géré par le bouton Statistiques
      // setShowStats(false);
      // S'assurer que showStats reste dans son état actuel si on vient du bouton
    }
  };

  // Init + listeners
  // Note: #/join (sans code) est maintenant autorisé - il affiche la page EventJoin où l'utilisateur peut saisir le code
  handleHashChange();
  window.addEventListener('resize', handleResize);
  window.addEventListener('hashchange', handleHashChange);

  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('hashchange', handleHashChange);
  };
}, []);


  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    setIsAuthOpen(false);
    
    // ✅ Si on est sur EventJoin, rester sur EventJoin pour la demande
    // Sinon : aller au tableau de bord et mettre à jour l’URL pour un routage correct
    setShowEventCreation(false);
    if (currentView === 'join') {
      const joinHash = window.location.hash;
      if (joinHash && (joinHash.startsWith('#/join/') || joinHash === '#/join')) {
        try { sessionStorage.setItem('bonkont-join-hash', joinHash); } catch (_) {}
      }
      toast({
        title: 'Vous êtes connecté(e)',
        description: "Remplissez le formulaire pour rejoindre ou cliquez sur « Accéder à mon tableau de bord » pour voir vos événements.",
        duration: 8000,
      });
      return;
    }
    {
      // Sur mobile : laisser le dialog se fermer avant de naviguer
      const goToDashboard = () => {
        setCurrentView('dashboard-view');
        setSelectedEventId(null);
        setViewMode('management');
        setShowHistory(false);
        setShowDashboardList(false);
        window.location.hash = '#/dashboard';
        requestAnimationFrame(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          // Retirer tout overlay résiduel (évite le "barrage" sur mobile)
          setTimeout(() => {
            document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]').forEach((el) => {
              try { el.remove(); } catch (_) {}
            });
          }, 50);
        });
      };
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => setTimeout(goToDashboard, 100));
      } else {
        setTimeout(goToDashboard, 150);
      }
    }
  };

  const handleLogout = async () => {
    console.log('[App] handleLogout called');
    
    try {
      // 1) Fermer tous les dialogs de manière synchrone et immédiate (PATCH 1)
      setIsSettingsOpen(false);
      console.log('[App] Dialogs closed');
      
      // 2) Laisser React appliquer le state (mini "yield")
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 3) Nettoyer les données utilisateur et le store d'événements (chaque utilisateur voit uniquement les siens)
      try {
        localStorage.removeItem('bonkont-user');
        localStorage.removeItem('bonkont-joined-codes');
        useEventStore.getState().clearEvents();
        console.log('[App] User data and event store cleared');
      } catch (e) {
        console.warn('Erreur lors du nettoyage localStorage / store:', e);
      }
      
      // 4) Réinitialiser l'état de l'application (PATCH 2 - source de vérité)
      setIsLoggedIn(false); // CRITIQUE : doit être fait APRÈS la fermeture des dialogs
      setCurrentView('home');
      setSelectedEventId(null);
      setShowStats(false);
      setShowHistory(false);
      setSettingsDefaultTab('account');
      console.log('[App] State reset, isLoggedIn = false');
      
      // 5) Réinitialiser le hash et rediriger vers la homepage (PATCH 3)
      try {
        window.location.hash = '';
        console.log('[App] Hash reset');
      } catch (e) {
        console.warn('Erreur lors de la réinitialisation du hash:', e);
      }

      // 5bis) Sécurité : ouvrir immédiatement l'écran de connexion après déconnexion
      try {
        console.log('[App] Forcing auth dialog open after logout for security');
        setIsAuthOpen(true);
      } catch (e) {
        console.warn('Erreur lors de l\'ouverture du dialog d\'authentification après logout:', e);
      }
      
      // 6) Forcer un re-render complet en utilisant requestAnimationFrame
      requestAnimationFrame(() => {
        // S'assurer que tous les overlays sont supprimés
        const overlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]');
        overlays.forEach(overlay => {
          try {
            overlay.remove();
          } catch (e) {
            console.warn('Erreur lors de la suppression d\'overlay:', e);
          }
        });
        
        // Afficher un toast de confirmation après un délai
        setTimeout(() => {
          try {
            toast({
              title: "Déconnexion réussie",
              description: "Vous avez été déconnecté avec succès.",
              duration: 3000,
            });
          } catch (e) {
            console.warn('Erreur lors de l\'affichage du toast:', e);
          }
        }, 100);
      });
    } catch (error) {
      console.error('[App] Erreur lors de la déconnexion:', error);
      
      // En cas d'erreur, forcer une réinitialisation complète
      try {
        localStorage.removeItem('bonkont-user');
        localStorage.removeItem('bonkont-joined-codes');
        
        // Forcer isLoggedIn à false (PATCH 2)
        setIsLoggedIn(false);
        setIsSettingsOpen(false);
        setCurrentView('home');
        setSelectedEventId(null);
        setShowStats(false);
        setShowHistory(false);
        
        // Supprimer tous les overlays bloquants
        const overlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]');
        overlays.forEach(overlay => overlay.remove());
        
        // Réinitialiser le hash
        window.location.hash = '';
        
        // Si vraiment bloqué, forcer un rechargement après 500ms
        setTimeout(() => {
          if (document.querySelector('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]')) {
            console.warn('[App] Overlays still present, forcing reload');
            window.location.reload();
          }
        }, 500);
      } catch (e) {
        console.error('[App] Erreur critique lors de la réinitialisation:', e);
        // Dernier recours : recharger la page
        setTimeout(() => window.location.reload(), 300);
      }
    }
  };

  const handleDeleteAccount = () => {
    // Supprimer toutes les données utilisateur
    localStorage.removeItem('bonkont-user');
    localStorage.removeItem('bonkont-joined-codes');
    localStorage.removeItem('bonkont-currency');
    localStorage.removeItem('bonkont-language');
    localStorage.removeItem('bonkont-subscription');
    useEventStore.getState().clearEvents();
    
    setIsLoggedIn(false);
    setIsSettingsOpen(false);
    setCurrentView('home');
    setSelectedEventId(null);
    window.location.hash = '';
  };

  return (
     <div className="min-h-screen flex flex-col bg-background text-foreground scroll-page-host" style={{ overflow: 'visible' }}>
       <header className="fixed top-0 left-0 right-0 py-2 sm:py-3 border-b border-border/50 backdrop-blur-sm bg-background z-50 safe-top w-full">
        <div className="container mx-auto px-3 sm:px-4 max-w-full">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Wallet2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary hover-glow flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold neon-glow bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary truncate">
                  BONKONT
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground italic hidden sm:block">
                  Les bons comptes font les bons amis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
              {/* Bouton "Rejoindre" - masqué sur homepage et sur toute page événement (event ou dashboard avec 1er événement) */}
              {(() => {
                const isEventPage = currentView === 'event' || (currentView === 'dashboard-view' && !showDashboardList && events.length > 0);
                return currentView !== 'home' && !isEventPage;
              })() && (
                <Button
                  variant="outline"
                  className="neon-border gap-2 h-9 sm:h-9 px-2 sm:px-3 border-primary/50 bg-background hover:bg-primary/10 hover:border-primary text-foreground text-sm"
                  onClick={() => {
                    console.log('[App] ===== JOIN EVENT BUTTON CLICKED =====');
                    console.log('[App] Current view before:', currentView);
                    console.log('[App] Setting hash to: #/join');
                    window.location.hash = '#/join';
                    setCurrentView('join');
                    console.log('[App] Current view after setState:', currentView);
                    console.log('[App] Hash after setState:', window.location.hash);
                  }}
                  title="Rejoindre un évènement"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Rejoindre</span>
                </Button>
              )}
              
              {!isLoggedIn ? (
                <>
                  {/* Bouton "Inviter des amis" - masqué sur homepage et sur toute page événement */}
                  {(() => {
                    const isEventPage = currentView === 'event' || (currentView === 'dashboard-view' && !showDashboardList && events.length > 0);
                    return currentView !== 'home' && !isEventPage;
                  })() && (
                    <InviteFriends eventCode={selectedEventId ? (() => {
                      const event = useEventStore.getState().events.find(e => e.id === selectedEventId);
                      return event?.code;
                    })() : null} />
                  )}
                  {/* Sur la homepage, pas de bouton Connexion dans le header (présent dans le contenu) */}
                  {currentView !== 'home' && (
                    <Button
                      variant="outline"
                      className="neon-border gap-2 h-9 sm:h-9 px-2 sm:px-3 text-sm"
                      onClick={() => setIsAuthOpen(true)}
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">Connexion</span>
                    </Button>
                  )}
                  <ThemeToggle />
                </>
              ) : (
                <>
                  {currentView === 'dashboard-view' && (
                    <Button
                      variant="outline"
                      className="neon-border gap-2 h-9 sm:h-9 px-2 sm:px-3 text-sm"
                      onClick={() => setShowEventCreation(true)}
                      title="Créer un évènement"
                      aria-label="Créer un évènement"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Créer un événement</span>
                    </Button>
                  )}
                  {/* Inviter des amis - masqué sur toute page événement (déjà dans le contenu) */}
                  {(() => {
                    const isEventPage = currentView === 'event' || (currentView === 'dashboard-view' && !showDashboardList && events.length > 0);
                    return currentView !== 'home' && !isEventPage;
                  })() && (
                    <InviteFriends eventCode={selectedEventId ? (() => {
                      const event = useEventStore.getState().events.find(e => e.id === selectedEventId);
                      return event?.code;
                    })() : null} />
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="neon-border h-9 w-9"
                    onClick={() => setIsSettingsOpen(true)}
                    title="Paramètres"
                  >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <ThemeToggle />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 safe-bottom w-full max-w-full pt-16 sm:pt-20 scroll-main pb-[10.5rem] shrink-0" style={{ marginTop: '70px', overflow: 'visible', position: 'relative' }}>
        <div className="max-w-4xl mx-auto w-full px-0">
          {/* Pages publiques */}
          {currentView === 'privacy' ? (
            <PrivacyPolicy onBack={() => {
              setCurrentView('home');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'terms' ? (
            <TermsOfService onBack={() => {
              setCurrentView('home');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'faq' ? (
            <FAQ onBack={() => {
              setCurrentView('home');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'contact' ? (
            <Contact onBack={() => {
              setCurrentView('home');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'join' ? (
            (() => {
              console.log('[App] ✅✅✅ RENDERING EventJoin component, currentView:', currentView);
              console.log('[App] EventJoin will be mounted now');
              const handleAuthRequired = () => {
                console.log('[App] 🔐 Auth required for joining event - opening dialog');
                console.log('[App] Current isAuthOpen state:', isAuthOpen);
                setIsAuthOpen(true);
                console.log('[App] ✅ setIsAuthOpen(true) called');
              };
              const handleNavigateToDashboard = () => {
                try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
                window.location.hash = '#/dashboard';
                setCurrentView('dashboard-view');
                setSelectedEventId(null);
                setShowEventCreation(false);
                setShowHistory(false);
                setShowStats(false);
                setShowDashboardList(false);
              };
              const handleOpenEvent = (eventId) => {
                try { sessionStorage.removeItem('bonkont-join-hash'); } catch (_) {}
                window.location.hash = `#event/${eventId}`;
                setSelectedEventId(eventId);
                setViewMode('management');
                setCurrentView('event');
                setShowHistory(false);
                setShowStats(false);
              };
              return (
                <EventJoin
                  onAuthRequired={handleAuthRequired}
                  onNavigateToDashboard={handleNavigateToDashboard}
                  onOpenEvent={handleOpenEvent}
                />
              );
            })()
          ) : currentView === 'event' && selectedEventId ? (
            <div className="space-y-4 animate-fade-in">
              {!isLoggedIn && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                  <p className="text-sm text-center">
                    <Button
                      variant="link"
                      className="text-primary underline"
                      onClick={() => setIsAuthOpen(true)}
                    >
                      Connectez-vous
                    </Button>
                    {' '}pour gérer cet événement
                  </p>
                </div>
              )}
              <Accordion type="single" collapsible defaultValue="gestion" className="border-b border-border pb-4">
                <AccordionItem value="gestion" className="border-0">
                  <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]]:pb-2">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      Gestion
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-2">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                      <Button
                        variant={viewMode === 'management' ? 'default' : 'outline'}
                        onClick={() => {
                          console.log('[App] Switching to management view');
                          setViewMode('management');
                          window.location.hash = `#event/${selectedEventId}`;
                        }}
                        className="gap-2 min-h-[44px] w-full sm:w-auto"
                      >
                        <span className="text-sm sm:text-base">Gestion de l'événement</span>
                      </Button>
                      <Button
                        variant={viewMode === 'transactions' ? 'default' : 'outline'}
                        onClick={() => {
                          console.log('[App] Switching to transactions view');
                          setViewMode('transactions');
                          window.location.hash = `#event/${selectedEventId}/transactions`;
                        }}
                        className="gap-2 min-h-[44px] w-full sm:w-auto"
                      >
                        <span className="text-sm sm:text-base">Gestion des transactions</span>
                      </Button>
                      <Button
                        variant={viewMode === 'closure' ? 'default' : 'outline'}
                        onClick={() => {
                          console.log('[App] Switching to closure view');
                          setViewMode('closure');
                          window.location.hash = `#event/${selectedEventId}/closure`;
                        }}
                        className="gap-2 min-h-[44px] w-full sm:w-auto"
                      >
                        <span className="text-sm sm:text-base">Gérer la fin Évènementielle</span>
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
                {viewMode === 'management' ? (
                  <EventManagement
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard-view from event management');
                      setSelectedEventId(null);
                      setViewMode('management');
                      setShowHistory(false);
                      setShowStats(false);
                      // Revenir au tableau de bord (vue interne), pas à la home publique
                      setCurrentView('dashboard-view');
                    }}
                  />
                ) : viewMode === 'transactions' ? (
                  <TransactionManagement
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard-view from transactions');
                      setSelectedEventId(null);
                      setViewMode('management');
                      setShowHistory(false);
                      setShowStats(false);
                      setCurrentView('dashboard-view');
                    }}
                  />
                ) : (
                  <EventClosure
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard-view from closure');
                      setSelectedEventId(null);
                      setViewMode('management');
                      setShowHistory(false);
                      setShowStats(false);
                      setCurrentView('dashboard-view');
                    }}
                  />
                )}
            </div>
          ) : currentView === 'dashboard-view' ? (
            (() => {
              let userData = null;
              try {
                userData = typeof window !== 'undefined' ? localStorage.getItem('bonkont-user') : null;
              } catch (_) {
                userData = null;
              }
              const isAuthenticated = !!userData;

              if (isAuthenticated && !isLoggedIn) setIsLoggedIn(true);
              else if (!isAuthenticated && isLoggedIn) setIsLoggedIn(false);
              
              if (!isAuthenticated) {
                return (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-4">Connexion requise</h2>
                    <p className="text-muted-foreground mb-8">
                      Vous devez être connecté pour accéder au tableau de bord
                    </p>
                    <Button
                      variant="default"
                      className="gap-2"
                      onClick={() => setIsAuthOpen(true)}
                    >
                      <LogIn className="w-4 h-4" />
                      Se connecter
                    </Button>
                  </div>
                );
              }
              
              if (showEventCreation) {
                return (
                  <EventCreation
                    onEventCreated={() => {
                      setShowEventCreation(false);
                    }}
                    onClose={() => setShowEventCreation(false)}
                  />
                );
              }
              if (showHistory) {
                return (
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowHistory(false)}
                      className="gap-2 mb-4"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Retour au tableau de bord
                    </Button>
                    <EventHistory />
                  </div>
                );
              }
              // Tableau de bord ouvre sur EventManagement (1er événement) avec tous les boutons de gestion
              if (!showDashboardList && events.length > 0) {
                const firstEventId = events[0].id;
                return (
                  <div className="space-y-4 animate-fade-in">
                    <Accordion type="single" collapsible defaultValue="gestion" className="border-b border-border pb-4">
                      <AccordionItem value="gestion" className="border-0">
                        <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]]:pb-2">
                          <span className="text-sm font-semibold flex items-center gap-2">
                            <Settings className="w-4 h-4 text-primary" />
                            Gestion
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-0 pb-2">
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                            <Button
                              variant={viewMode === 'management' ? 'default' : 'outline'}
                              onClick={() => {
                                setViewMode('management');
                                window.location.hash = `#event/${firstEventId}`;
                              }}
                              className="gap-2 min-h-[44px] w-full sm:w-auto"
                            >
                              <span className="text-sm sm:text-base">Gestion de l'événement</span>
                            </Button>
                            <Button
                              variant={viewMode === 'transactions' ? 'default' : 'outline'}
                              onClick={() => {
                                setViewMode('transactions');
                                window.location.hash = `#event/${firstEventId}/transactions`;
                              }}
                              className="gap-2 min-h-[44px] w-full sm:w-auto"
                            >
                              <span className="text-sm sm:text-base">Gestion des transactions</span>
                            </Button>
                            <Button
                              variant={viewMode === 'closure' ? 'default' : 'outline'}
                              onClick={() => {
                                setViewMode('closure');
                                window.location.hash = `#event/${firstEventId}/closure`;
                              }}
                              className="gap-2 min-h-[44px] w-full sm:w-auto"
                            >
                              <span className="text-sm sm:text-base">Gérer la fin Évènementielle</span>
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    {viewMode === 'management' ? (
                      <EventManagement
                        eventId={firstEventId}
                        onBack={() => {
                          setShowDashboardList(true);
                        }}
                      />
                    ) : viewMode === 'transactions' ? (
                      <TransactionManagement
                        eventId={firstEventId}
                        onBack={() => {
                          setShowDashboardList(true);
                        }}
                      />
                    ) : (
                      <EventClosure
                        eventId={firstEventId}
                        onBack={() => {
                          setShowDashboardList(true);
                        }}
                      />
                    )}
                  </div>
                );
              }
              return (
                <EventDashboard
                  onShowHistory={() => setShowHistory(true)}
                  onBack={() => setShowDashboardList(false)}
                />
              );
            })()
          ) : currentView === 'home' ? (
            /* Page d'accueil : uniquement le bouton "Tableau de bord". */
            <div className="space-y-8">
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">Bienvenue sur BONKONT</h2>
                <p className="text-muted-foreground mb-8">
                  {isLoggedIn
                    ? 'Accédez à votre tableau de bord ou créez un nouvel événement'
                    : 'Connectez-vous pour accéder à votre tableau de bord et créer des événements'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    variant="default"
                    className="gap-2 button-glow"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    <LogIn className="w-4 h-4" />
                    Se connecter
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 neon-border"
                    onClick={() => {
                      if (!isLoggedIn) {
                        setIsAuthOpen(true);
                        return;
                      }
                      window.location.hash = '#/dashboard';
                      setCurrentView('dashboard-view');
                      setShowEventCreation(true);
                      window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Créer un événement
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">Bienvenue sur BONKONT</h2>
                <p className="text-muted-foreground mb-8">
                  Connectez-vous pour gérer vos événements partagés
                </p>
                <Button
                  className="gap-2 button-glow"
                  onClick={() => setIsAuthOpen(true)}
                >
                  <LogIn className="w-4 h-4" />
                  Commencer
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <AuthDialog
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setSettingsDefaultTab('account'); // Réinitialiser à l'onglet par défaut
        }}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onNavigateToPublicPage={(page) => {
          setIsSettingsOpen(false);
          setCurrentView(page);
          window.location.hash = `#/${page}`;
        }}
        defaultTab={settingsDefaultTab}
      />

      <ScrollToTop />

      {/* Footer fixe en bas, compact */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-border/50 py-1 sm:py-1.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-2 sm:px-4 max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  setCurrentView('privacy');
                  window.location.hash = '#/privacy';
                }}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                {t('privacyPolicyShort')}
              </button>
              <button
                onClick={() => {
                  setCurrentView('terms');
                  window.location.hash = '#/terms';
                }}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                {t('termsOfServiceShort')}
              </button>
              <button
                onClick={() => {
                  setCurrentView('faq');
                  window.location.hash = '#/faq';
                }}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                {t('faqShort')}
              </button>
              <button
                onClick={() => {
                  setCurrentView('contact');
                  window.location.hash = '#/contact';
                }}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                {t('contact')}
              </button>
            </div>
            <p className="text-[9px] sm:text-[10px] italic text-center sm:text-right leading-tight">
              {t('taglineFooter')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}