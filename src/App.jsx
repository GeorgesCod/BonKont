import { useState, useEffect } from 'react';
import { EventCreation } from '@/components/EventCreation';
import { EventDashboard } from '@/components/EventDashboard';
import { EventStatistics } from '@/components/EventStatistics';
import { EventManagement } from '@/components/EventManagement';
import { TransactionManagement } from '@/components/TransactionManagement';
import { EventHistory } from '@/components/EventHistory';
import { EventClosure } from '@/components/EventClosure';
import { EventJoin } from '@/components/EventJoin';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthDialog } from '@/components/AuthDialog';
import { UserProfile } from '@/components/UserProfile';
import { InviteFriends } from '@/components/InviteFriends';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SettingsDialog } from '@/components/SettingsDialog';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import { TermsOfService } from '@/components/TermsOfService';
import { FAQ } from '@/components/FAQ';
import { Contact } from '@/components/Contact';
import { Wallet2, LogIn, UserCircle, BarChart as ChartBar, ArrowLeft, Settings, UserPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import { useI18nStore } from '@/lib/i18n';

export default function App() {
  const { toast } = useToast();
  const { t } = useI18nStore();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState('account');
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'event', 'transactions', 'history', 'privacy', 'terms', 'faq', 'contact', 'join'
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [viewMode, setViewMode] = useState('management'); // 'management', 'transactions', or 'closure'

   // Vérifier l'état d'authentification au chargement (PATCH 2)
  useEffect(() => {
    const checkAuthState = () => {
      const userData = localStorage.getItem('bonkont-user');
      const shouldBeLoggedIn = !!userData;
      
      console.log('[App] Checking auth state:', shouldBeLoggedIn ? 'LOGGED IN' : 'LOGGED OUT');
      
      if (shouldBeLoggedIn !== isLoggedIn) {
        console.log('[App] Auth state mismatch, correcting:', shouldBeLoggedIn);
        setIsLoggedIn(shouldBeLoggedIn);
      }
    };
    
    // Vérifier immédiatement
    checkAuthState();
    
    // Vérifier périodiquement (fallback)
    const interval = setInterval(checkAuthState, 1000);
    
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
  console.log('[App] Component mounted, setting up hash routing');
  const logScreenInfo = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;
    const isDesktop = width >= 1024;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // Vérifier les décalages au chargement
      const body = document.body;
      const root = document.getElementById('root');
      const bodyRect = body?.getBoundingClientRect();
      const rootRect = root?.getBoundingClientRect();
      
      const layoutInfo = {
        bodyWidth: bodyRect?.width,
        bodyLeft: bodyRect?.left,
        rootWidth: rootRect?.width,
        rootLeft: rootRect?.left,
        hasHorizontalScroll: document.documentElement.scrollWidth > width
      };
      
      console.log('[App] Screen size:', {
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        devicePixelRatio,
        orientation,
        breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
      });
      
      console.log('[App] Layout info:', layoutInfo);
      
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
    
    console.log('[App] Window resized:', {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
    });
    
    console.log('[App] Layout info:', layoutInfo);
    
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
    console.log('[App] ===== handleHashChange CALLED =====');
    console.log('[App] Hash changed:', hash);
    console.log('[App] Current state:', { 
      isLoggedIn, 
      currentView, 
      selectedEventId,
      hash 
    });

    // Si pas de hash ou hash vide, afficher le dashboard (page d'accueil)
    if (!hash || hash === '' || hash === '#') {
      console.log('[App] No hash, navigating to dashboard');
      setCurrentView('dashboard');
      setSelectedEventId(null);
      setViewMode('management');
      setShowHistory(false);
      // Ne pas réinitialiser showStats ici
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
    // Route pour rejoindre un événement (seulement si hash explicite #/join ou #/join/CODE)
    if (hash.startsWith('#/join/') || hash === '#/join') {
      console.log('[App] ✅✅✅ Navigating to JOIN view, hash:', hash);
      console.log('[App] Setting currentView to "join"');
      setCurrentView('join');
      setSelectedEventId(null);
      setShowHistory(false);
      setShowStats(false);
      console.log('[App] Navigation to join complete, currentView should be "join"');
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
      let mode = 'management';
      if (hash.includes('/transactions')) {
        mode = 'transactions';
      } else if (hash.includes('/closure')) {
        mode = 'closure';
      }
      console.log('[App] Navigating to event view:', { eventId, mode, hash });
      
      // Vérifier que l'événement existe
      const events = useEventStore.getState().events;
      const eventExists = events.some(e => String(e.id) === String(eventId));
      
      console.log('[App] Event check:', {
        eventId,
        eventExists,
        eventsCount: events.length,
        availableIds: events.map(e => e.id)
      });
      
      if (!eventExists && events.length > 0) {
        console.error('[App] Event not found:', eventId);
        console.log('[App] Available events:', events.map(e => ({ id: e.id, title: e.title })));
        window.location.hash = '';
        setCurrentView('dashboard');
        setSelectedEventId(null);
        return;
      }
      
      // Si l'utilisateur n'est pas connecté mais qu'un événement existe, on peut quand même naviguer
      // (pour permettre l'accès via lien partagé)
      if (!isLoggedIn && eventExists) {
        console.log('[App] User not logged in but event exists, allowing navigation');
        // Optionnel: on pourrait rediriger vers la connexion ici
        // setIsAuthOpen(true);
      }
      
      setSelectedEventId(eventId);
      setViewMode(mode);
      setCurrentView('event');
      setShowHistory(false);
      setShowStats(false);
    } else {
      // Pas d'événement spécifique dans l'URL, afficher le dashboard (page d'accueil)
      console.log('[App] Navigating to dashboard (home page)');
      setCurrentView('dashboard');
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
    console.log('[App] Auth success, setting logged in');
    setIsLoggedIn(true);
    setIsAuthOpen(false);
    // S'assurer qu'on est sur le dashboard après connexion
    setCurrentView('dashboard');
    setShowHistory(false);
    setShowStats(false);
    window.location.hash = '';
  };

  const handleLogout = async () => {
    console.log('[App] handleLogout called');
    
    try {
      // 1) Fermer tous les dialogs de manière synchrone et immédiate (PATCH 1)
      setIsProfileOpen(false);
      setIsSettingsOpen(false);
      console.log('[App] Dialogs closed');
      
      // 2) Laisser React appliquer le state (mini "yield")
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 3) Nettoyer les données utilisateur
      try {
        localStorage.removeItem('bonkont-user');
        console.log('[App] User data cleared');
      } catch (e) {
        console.warn('Erreur lors du nettoyage localStorage:', e);
      }
      
      // 4) Réinitialiser l'état de l'application (PATCH 2 - source de vérité)
      setIsLoggedIn(false); // CRITIQUE : doit être fait APRÈS la fermeture des dialogs
      setCurrentView('dashboard');
      setSelectedEventId(null);
      setShowStats(false);
      setShowHistory(false);
      setSettingsDefaultTab('account');
      console.log('[App] State reset, isLoggedIn = false');
      
      // 5) Réinitialiser le hash et rediriger (PATCH 3)
      try {
        window.location.hash = '';
        console.log('[App] Hash reset');
      } catch (e) {
        console.warn('Erreur lors de la réinitialisation du hash:', e);
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
        // Nettoyer localStorage même en cas d'erreur
        localStorage.removeItem('bonkont-user');
        
        // Forcer isLoggedIn à false (PATCH 2)
        setIsLoggedIn(false);
        setIsProfileOpen(false);
        setIsSettingsOpen(false);
        setCurrentView('dashboard');
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
    localStorage.removeItem('bonkont-currency');
    localStorage.removeItem('bonkont-language');
    localStorage.removeItem('bonkont-subscription');
    // Supprimer les événements (optionnel - selon les besoins)
    useEventStore.getState().events.forEach(event => {
      useEventStore.getState().removeEvent(event.id);
    });
    
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    setCurrentView('dashboard');
    setSelectedEventId(null);
    window.location.hash = '';
  };

  return (
     <div className="h-screen flex flex-col bg-background text-foreground" style={{ touchAction: 'pan-y' }}>
       <header className="shrink-0 py-3 sm:py-6 border-b border-border/50 backdrop-blur-sm bg-background/80 z-50 safe-top w-full">
        <div className="container mx-auto px-3 sm:px-4 max-w-full">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Wallet2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary hover-glow flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold neon-glow bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary truncate">
                  BONKONT
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground italic hidden sm:block">
                  Les bons comptes font les bons amis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
              {/* Bouton "Rejoindre un évènement" - TOUJOURS visible */}
              <Button
                variant="outline"
                className="neon-border gap-2 min-h-[44px] px-3 sm:px-4 border-primary/50 bg-background hover:bg-primary/10 hover:border-primary text-foreground"
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
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Rejoindre</span>
              </Button>
              
              {!isLoggedIn ? (
                <>
                  <InviteFriends eventCode={selectedEventId ? (() => {
                    const event = useEventStore.getState().events.find(e => e.id === selectedEventId);
                    return event?.code;
                  })() : null} />
                  <Button
                    variant="outline"
                    className="neon-border gap-2 min-h-[44px] px-3 sm:px-4"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Connexion</span>
                  </Button>
                  <ThemeToggle />
                </>
              ) : (
                <>
                  <InviteFriends eventCode={selectedEventId ? (() => {
                    const event = useEventStore.getState().events.find(e => e.id === selectedEventId);
                    return event?.code;
                  })() : null} />
                  <Button
                    variant="outline"
                    className="neon-border gap-2 min-h-[44px] px-3 sm:px-4 touch-manipulation"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[App] Statistics/Dashboard button clicked, current showStats:', showStats);
                      const newShowStats = !showStats;
                      
                      // Toujours s'assurer qu'on est au dashboard
                      setSelectedEventId(null);
                      setViewMode('management');
                      setShowHistory(false);
                      setCurrentView('dashboard');
                      setShowStats(newShowStats);
                      
                      // Changer le hash pour forcer la navigation
                      window.location.hash = '';
                      
                      // Force le re-render après un court délai
                      setTimeout(() => {
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                      }, 50);
                      
                      console.log('[App] showStats set to:', newShowStats, 'currentView:', 'dashboard');
                    }}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <ChartBar className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">
                      {showStats ? 'Tableau de bord' : 'Statistiques'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="neon-border min-h-[44px] min-w-[44px]"
                    onClick={() => setIsProfileOpen(true)}
                    title="Profil"
                  >
                    <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="neon-border min-h-[44px] min-w-[44px]"
                    onClick={() => setIsSettingsOpen(true)}
                    title="Paramètres"
                  >
                    <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                  <ThemeToggle />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 safe-bottom w-full max-w-full overflow-y-auto" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="max-w-4xl mx-auto w-full px-0">
          {(() => {
            console.log('[App] ===== RENDERING MAIN CONTENT =====');
            console.log('[App] currentView:', currentView);
            console.log('[App] window.location.hash:', window.location.hash);
            console.log('[App] Checking if currentView === "join":', currentView === 'join');
            return null;
          }
          )()}
          {/* Pages publiques */}
          {currentView === 'privacy' ? (
            <PrivacyPolicy onBack={() => {
              setCurrentView('dashboard');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'terms' ? (
            <TermsOfService onBack={() => {
              setCurrentView('dashboard');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'faq' ? (
            <FAQ onBack={() => {
              setCurrentView('dashboard');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'contact' ? (
            <Contact onBack={() => {
              setCurrentView('dashboard');
              window.location.hash = '';
              setSettingsDefaultTab('preferences');
              setIsSettingsOpen(true);
            }} />
          ) : currentView === 'join' ? (
            (() => {
              console.log('[App] ✅✅✅ RENDERING EventJoin component, currentView:', currentView);
              console.log('[App] EventJoin will be mounted now');
              return (
                <EventJoin onAuthRequired={() => {
                  console.log('[App] Auth required for joining event');
                  setIsAuthOpen(true);
                }} />
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
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-b border-border pb-4">
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
                {viewMode === 'management' ? (
                  <EventManagement
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard from event management');
                      setSelectedEventId(null);
                      setViewMode('management');
                      setShowHistory(false);
                      setShowStats(false);
                      setCurrentView('dashboard');
                      window.location.hash = '';
                      // Force le re-render
                      setTimeout(() => {
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                      }, 50);
                    }}
                  />
                ) : viewMode === 'transactions' ? (
                  <TransactionManagement
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard from transactions');
                      setSelectedEventId(null);
                      setViewMode('management');
                      setShowHistory(false);
                      setShowStats(false);
                      setCurrentView('dashboard');
                      window.location.hash = '';
                      // Force le re-render
                      setTimeout(() => {
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                      }, 50);
                    }}
                  />
                ) : (
                  <EventClosure
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard from closure');
                      setSelectedEventId(null);
                      setViewMode('management');
                      setShowHistory(false);
                      setShowStats(false);
                      setCurrentView('dashboard');
                      window.location.hash = '';
                      // Force le re-render
                      setTimeout(() => {
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                      }, 50);
                    }}
                  />
                )}
            </div>
          ) : currentView === 'dashboard' ? (
            isLoggedIn ? (
              showHistory ? (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('[App] Back to dashboard from history');
                      setShowHistory(false);
                    }}
                    className="gap-2 mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au tableau de bord
                  </Button>
                  <EventHistory />
                </div>
              ) : showStats ? (
                <EventStatistics />
              ) : (
                <>
                  <EventCreation />
                  <EventDashboard onShowHistory={() => {
                    console.log('[App] Opening history from dashboard');
                    setShowHistory(true);
                    setShowStats(false);
                  }} />
                </>
              )
            ) : (
              <div className="space-y-8">
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-4">Bienvenue sur BONKONT</h2>
                  <p className="text-muted-foreground mb-8">
                    Créez ou rejoignez un événement pour partager vos dépenses
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                  <Button
                    className="gap-2 button-glow"
                      onClick={() => {
                        console.log('[App] Create event button clicked from home');
                        setIsAuthOpen(true);
                        // Après connexion, l'utilisateur verra EventCreation
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Créer un événement
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 neon-border"
                      onClick={() => {
                        console.log('[App] ===== JOIN EVENT BUTTON CLICKED FROM HOME =====');
                        console.log('[App] Current view before:', currentView);
                        console.log('[App] Setting hash to: #/join');
                        window.location.hash = '#/join';
                        setCurrentView('join');
                        console.log('[App] Current view after setState:', currentView);
                        console.log('[App] Hash after setState:', window.location.hash);
                      }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Rejoindre un évènement
                    </Button>
                    <Button
                      variant="default"
                      className="gap-2"
                      onClick={() => {
                        console.log('[App] Login button clicked from home');
                        setIsAuthOpen(true);
                      }}
                  >
                    <LogIn className="w-4 h-4" />
                      Se connecter
                  </Button>
                  </div>
                </div>
                {/* Afficher EventCreation même si non connecté, mais avec un message d'auth */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Connectez-vous pour créer votre premier événement
                    </p>
                  </div>
                </div>
              </div>
            )
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

      <UserProfile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
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

      {/* Footer avec liens vers les pages publiques */}
      <footer className="border-t border-border/50 mt-12 py-6">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
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
            <p className="text-xs italic text-center sm:text-right">
              {t('taglineFooter')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}