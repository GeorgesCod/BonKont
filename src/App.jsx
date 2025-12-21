import { useState } from 'react';
import { EventCreation } from '@/components/EventCreation';
import { EventDashboard } from '@/components/EventDashboard';
import { EventStatistics } from '@/components/EventStatistics';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthDialog } from '@/components/AuthDialog';
import { UserProfile } from '@/components/UserProfile';
import { InviteFriends } from '@/components/InviteFriends';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Wallet2, LogIn, UserCircle, BarChart as ChartBar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

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
      <header className="py-6 border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet2 className="w-8 h-8 text-primary hover-glow" />
              <div>
                <h1 className="text-3xl font-bold neon-glow bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  BONKONT
                </h1>
                <p className="text-sm text-muted-foreground italic">
                  Les bons comptes font les bons amis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {isLoggedIn ? (
            showStats ? (
              <EventStatistics />
            ) : (
              <>
                <EventCreation />
                <EventDashboard />
              </>
            )
          ) : (
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