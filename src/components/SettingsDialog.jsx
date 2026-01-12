import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  User,
  CreditCard,
  Globe,
  Moon,
  Sun,
  Lock,
  HelpCircle,
  Shield,
  LogOut,
  Trash2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useI18nStore } from '@/lib/i18n';

export function SettingsDialog({ isOpen, onClose, onLogout, onDeleteAccount }) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { currentLanguage, setLanguage: setI18nLanguage, t } = useI18nStore();
  
  // État pour les préférences
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('bonkont-currency');
    const value = (saved && (saved === 'EUR' || saved === 'USD' || saved === 'GBP')) ? saved : 'EUR';
    if (!saved || (saved !== 'EUR' && saved !== 'USD' && saved !== 'GBP')) {
      localStorage.setItem('bonkont-currency', 'EUR');
    }
    return value;
  });
  const [language, setLanguage] = useState(() => {
    // Utiliser directement le code de langue du store i18n
    return currentLanguage?.code || 'fr';
  });
  const [subscriptionPlan, setSubscriptionPlan] = useState(() => {
    const saved = localStorage.getItem('bonkont-subscription');
    return saved || 'free';
  });
  
  // État pour les dialogs de confirmation
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);

  // Charger les préférences au montage et forcer le retour en français
  useEffect(() => {
    const savedCurrency = localStorage.getItem('bonkont-currency');
    const savedSubscription = localStorage.getItem('bonkont-subscription');
    
    // Valider et définir la devise
    if (savedCurrency && (savedCurrency === 'EUR' || savedCurrency === 'USD' || savedCurrency === 'GBP')) {
      setCurrency(savedCurrency);
    } else {
      setCurrency('EUR');
      localStorage.setItem('bonkont-currency', 'EUR');
    }
    
    // FORCER LE RETOUR EN FRANÇAIS
    setLanguage('fr');
    setI18nLanguage('fr');
    
    if (savedSubscription) {
      setSubscriptionPlan(savedSubscription);
    } else {
      setSubscriptionPlan('free');
      localStorage.setItem('bonkont-subscription', 'free');
    }
  }, [currentLanguage, setI18nLanguage]);

  // Sauvegarder les préférences
  const handleCurrencyChange = (value) => {
    setCurrency(value);
    localStorage.setItem('bonkont-currency', value);
    const currencyLabel = value === 'EUR' ? t('eur') : value === 'USD' ? t('usd') : t('gbp');
    toast({
      title: t('currencyUpdated'),
      description: `${t('currencyChanged')} ${currencyLabel}`,
      duration: 3000,
    });
  };

  const handleLanguageChange = (value) => {
    setLanguage(value);
    setI18nLanguage(value); // Mettre à jour le store i18n (qui persiste automatiquement)
    
    toast({
      title: t('languageUpdated'),
      description: `${t('languageChanged')} ${value === 'fr' ? 'Français' : 'English'}`,
      duration: 3000,
    });
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    toast({
      title: t('themeUpdated'),
      description: `${t('themeChanged')} ${newTheme === 'light' ? t('light') : t('dark')}`,
    });
  };

  const handleSubscriptionChange = (plan) => {
    setSubscriptionPlan(plan);
    localStorage.setItem('bonkont-subscription', plan);
    const planName = plan === 'free' ? t('free') : plan === 'premium' ? t('premium') : t('pro');
    toast({
      title: t('planUpdated'),
      description: `${t('planSubscribed')} ${planName}`,
    });
  };

  const handleResetPassword = () => {
    const userData = JSON.parse(localStorage.getItem('bonkont-user') || '{}');
    const email = userData.email || '';
    
    if (!email) {
      toast({
        variant: "destructive",
        title: t('emailSent'),
        description: t('resetPasswordSent'),
      });
      setShowResetPasswordDialog(false);
      return;
    }

    // Simuler l'envoi d'email
    toast({
      title: t('emailSent'),
      description: `${t('resetPasswordSent')} ${email}`,
    });
    setShowResetPasswordDialog(false);
  };

  const handleLogout = () => {
    // Fermer le dialog de confirmation d'abord
    setShowLogoutDialog(false);
    // Utiliser setTimeout pour s'assurer que le dialog se ferme avant de déconnecter
    setTimeout(() => {
      onClose();
      onLogout();
    }, 50);
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(false);
    onDeleteAccount();
    onClose();
    toast({
      title: t('accountDeleted'),
      description: t('accountDeletedMessage'),
      variant: "destructive",
    });
  };

  const handleHelpCenter = () => {
    window.open('https://help.bonkont.com', '_blank');
    toast({
      title: t('helpCenter'),
      description: t('helpCenter'),
    });
  };

  const handlePrivacyPolicy = () => {
    window.open('https://bonkont.com/privacy', '_blank');
    toast({
      title: t('privacyPolicy'),
      description: t('privacyPolicy'),
    });
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              {t('settings')}
            </DialogTitle>
            <DialogDescription>
              {t('settingsDescription')}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4">
              <TabsTrigger value="account" className="text-xs sm:text-sm">
                <User className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('account')}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs sm:text-sm">
                <Globe className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('preferences')}</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs sm:text-sm">
                <Shield className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('privacy')}</span>
              </TabsTrigger>
              <TabsTrigger value="help" className="text-xs sm:text-sm">
                <HelpCircle className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('help')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Onglet Compte */}
            <TabsContent value="account" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {t('subscriptionPlan')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('subscriptionDescription')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      subscriptionPlan === 'free'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSubscriptionChange('free')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{t('free')}</h4>
                      {subscriptionPlan === 'free' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-1">0€</p>
                    <p className="text-xs text-muted-foreground mb-3">{t('perMonth')}</p>
                    <ul className="text-xs space-y-1">
                      <li>• {t('upTo3Events')}</li>
                      <li>• {t('basicSupport')}</li>
                      <li>• {t('essentialFeatures')}</li>
                    </ul>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      subscriptionPlan === 'premium'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSubscriptionChange('premium')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{t('premium')}</h4>
                      {subscriptionPlan === 'premium' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                      <Badge variant="outline" className="text-xs">{t('popular')}</Badge>
                    </div>
                    <p className="text-2xl font-bold mb-1">9.99€</p>
                    <p className="text-xs text-muted-foreground mb-3">{t('perMonth')}</p>
                    <ul className="text-xs space-y-1">
                      <li>• {t('unlimitedEvents')}</li>
                      <li>• {t('prioritySupport')}</li>
                      <li>• {t('advancedPdfExport')}</li>
                      <li>• {t('detailedStats')}</li>
                    </ul>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      subscriptionPlan === 'pro'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSubscriptionChange('pro')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{t('pro')}</h4>
                      {subscriptionPlan === 'pro' && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-1">19.99€</p>
                    <p className="text-xs text-muted-foreground mb-3">{t('perMonth')}</p>
                    <ul className="text-xs space-y-1">
                      <li>• {t('allPremium')}</li>
                      <li>• {t('customApi')}</li>
                      <li>• {t('dedicatedSupport')}</li>
                      <li>• {t('advancedFeatures')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      {t('security')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('securityDescription')}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowResetPasswordDialog(true)}
                >
                  <Lock className="w-4 h-4" />
                  {t('resetPassword')}
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Préférences */}
            <TabsContent value="preferences" className="space-y-6 mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {t('generalPreferences')}
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t('currency')}</Label>
                    <Select 
                      value={currency || 'EUR'} 
                      onValueChange={handleCurrencyChange}
                    >
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue placeholder={t('currency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">{t('eur')}</SelectItem>
                        <SelectItem value="USD">{t('usd')}</SelectItem>
                        <SelectItem value="GBP">{t('gbp')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">{t('language')}</Label>
                    <Select 
                      value={language || currentLanguage?.code || 'fr'} 
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger id="language" className="w-full">
                        <SelectValue placeholder={t('language')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('languageDescription')}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                  {t('appearance')}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">{t('theme')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('themeDescription')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleThemeChange('light')}
                      className="gap-2"
                    >
                      <Sun className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('light')}</span>
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleThemeChange('dark')}
                      className="gap-2"
                    >
                      <Moon className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('dark')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Confidentialité */}
            <TabsContent value="privacy" className="space-y-6 mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t('privacySecurity')}
                </h3>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handlePrivacyPolicy}
                >
                  <Shield className="w-4 h-4" />
                  {t('privacyPolicy')}
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Aide */}
            <TabsContent value="help" className="space-y-6 mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  {t('support')}
                </h3>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleHelpCenter}
                >
                  <HelpCircle className="w-4 h-4" />
                  {t('helpCenter')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          {/* Actions de compte */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </Button>
            <Button
              variant="destructive"
              className="gap-2 w-full sm:w-auto"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              {t('deleteAccount')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation - Réinitialisation mot de passe */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe</AlertDialogTitle>
            <AlertDialogDescription>
              Un email contenant les instructions de réinitialisation sera envoyé à votre adresse email.
              Êtes-vous sûr de vouloir continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>Envoyer l'email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation - Déconnexion */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Déconnexion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation - Suppression de compte */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer mon compte</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes vos données seront définitivement supprimées.
              Êtes-vous absolument sûr de vouloir supprimer votre compte ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

