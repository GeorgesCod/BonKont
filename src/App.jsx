import { useState, useEffect } from 'react';
import { EventCreation } from '@/components/EventCreation';
import { EventDashboard } from '@/components/EventDashboard';
import { EventStatistics } from '@/components/EventStatistics';
import { EventManagement } from '@/components/EventManagement';
import { TransactionManagement } from '@/components/TransactionManagement';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthDialog } from '@/components/AuthDialog';
import { UserProfile } from '@/components/UserProfile';
import { InviteFriends } from '@/components/InviteFriends';
import { ScrollToTop } from '@/components/ScrollToTop';
import { TesseractTest } from '@/components/TesseractTest';
import { Wallet2, LogIn, UserCircle, BarChart as ChartBar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'event', 'transactions'
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [viewMode, setViewMode] = useState('management'); // 'management' or 'transactions'

  useEffect(() => {
    console.log('[App] Component mounted, setting up hash routing');
    console.log('[App] Screen size:', {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 640,
      isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
      isDesktop: window.innerWidth >= 1024
    });
    
    const handleResize = () => {
      console.log('[App] Window resized:', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('[App] Hash changed:', hash);
      
      if (hash.startsWith('#event/')) {
        const eventId = hash.replace('#event/', '').split('/')[0];
        const mode = hash.includes('/transactions') ? 'transactions' : 'management';
        console.log('[App] Navigating to event view:', { eventId, mode });
        setSelectedEventId(eventId);
        setViewMode(mode);
        setCurrentView('event');
      } else {
        console.log('[App] Navigating to dashboard');
        setCurrentView('dashboard');
        setSelectedEventId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-3 sm:py-6 border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Wallet2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary hover-glow flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold neon-glow bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary truncate">
                  BONKONT
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground italic hidden sm:block">
                  Les bons comptes font les bons amis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {!isLoggedIn ? (
                <>
                  <InviteFriends />
                  <Button
                    variant="outline"
                    className="neon-border gap-2"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden md:inline">Connexion</span>
                  </Button>
                  <ThemeToggle />
                </>
              ) : (
                <>
                  <InviteFriends />
                  <Button
                    variant="outline"
                    className="neon-border gap-2"
                    onClick={() => setShowStats(!showStats)}
                  >
                    <ChartBar className="w-4 h-4" />
                    <span className="hidden md:inline">
                      {showStats ? 'Tableau de bord' : 'Statistiques'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="neon-border"
                    onClick={() => setIsProfileOpen(true)}
                  >
                    <UserCircle className="w-5 h-5" />
                  </Button>
                  <ThemeToggle />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {isLoggedIn ? (
            currentView === 'event' && selectedEventId ? (
              <div className="space-y-4">
                <div className="flex gap-4 border-b border-border pb-4">
                  <Button
                    variant={viewMode === 'management' ? 'default' : 'outline'}
                    onClick={() => {
                      console.log('[App] Switching to management view');
                      setViewMode('management');
                      window.location.hash = `event/${selectedEventId}`;
                    }}
                    className="gap-2"
                  >
                    Gestion de l'événement
                  </Button>
                  <Button
                    variant={viewMode === 'transactions' ? 'default' : 'outline'}
                    onClick={() => {
                      console.log('[App] Switching to transactions view');
                      setViewMode('transactions');
                      window.location.hash = `event/${selectedEventId}/transactions`;
                    }}
                    className="gap-2"
                  >
                    Gestion des transactions
                  </Button>
                </div>
                {viewMode === 'management' ? (
                  <EventManagement
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard from event management');
                      window.location.hash = '';
                      setCurrentView('dashboard');
                    }}
                  />
                ) : (
                  <TransactionManagement
                    eventId={selectedEventId}
                    onBack={() => {
                      console.log('[App] Back to dashboard from transactions');
                      window.location.hash = '';
                      setCurrentView('dashboard');
                    }}
                  />
                )}
              </div>
            ) : showStats ? (
              <EventStatistics />
            ) : (
              <>
                <EventCreation />
                <EventDashboard />
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
              <TesseractTest />
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
        onClose={handleLogout}
      />

      <ScrollToTop />
    </div>
  );
}