import { useState, useEffect } from 'react';
import { EventCreation } from '@/components/EventCreation';
import { EventDashboard } from '@/components/EventDashboard';
import { EventStatistics } from '@/components/EventStatistics';
import { EventManagement } from '@/components/EventManagement';
import { TransactionManagement } from '@/components/TransactionManagement';
import { EventHistory } from '@/components/EventHistory';
import { EventClosure } from '@/components/EventClosure';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthDialog } from '@/components/AuthDialog';
import { UserProfile } from '@/components/UserProfile';
import { InviteFriends } from '@/components/InviteFriends';
import { ScrollToTop } from '@/components/ScrollToTop';
import { TesseractTest } from '@/components/TesseractTest';
import { SettingsDialog } from '@/components/SettingsDialog';
import { Wallet2, LogIn, UserCircle, BarChart as ChartBar, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';

export default function App() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'event', 'transactions', 'history'
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [viewMode, setViewMode] = useState('management'); // 'management', 'transactions', or 'closure'

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
    console.log('[App] Hash changed:', hash);
    console.log('[App] Current state:', { 
      isLoggedIn, 
      currentView, 
      selectedEventId,
      hash 
    });

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
      console.log('[App] Navigating to dashboard');
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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    // Nettoyer les données utilisateur
    localStorage.removeItem('bonkont-user');
    setCurrentView('dashboard');
    setSelectedEventId(null);
    setShowStats(false);
    setShowHistory(false);
    window.location.hash = '';
    // Afficher un toast de confirmation
    toast({
      title: "Déconnexion réussie",
      description: "Vous avez été déconnecté avec succès.",
      duration: 3000,
    });
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
    <div className="min-h-screen bg-background text-foreground" style={{ touchAction: 'pan-y' }}>
      <header className="py-3 sm:py-6 border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50 safe-top w-full">
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
              {!isLoggedIn ? (
                <>
                  <InviteFriends />
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
                  <InviteFriends />
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
          {/* Permettre l'accès à la vue événement même sans connexion (pour liens partagés) */}
          {currentView === 'event' && selectedEventId ? (
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
                <TesseractTest showEventSelection={true} />
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
              <TesseractTest showEventSelection={true} />
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
        onClose={() => setIsSettingsOpen(false)}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
      />

      <ScrollToTop />
    </div>
  );
}