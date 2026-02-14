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
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  MessageCircle,
  HelpCircle,
  Shield,
  ExternalLink,
  Home,
  Info,
  LogOut
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useI18nStore } from '@/lib/i18n';
import { AboutDialog } from '@/components/AboutDialog';

export function SettingsDialog({ isOpen, onClose, onLogout, onDeleteAccount, onNavigateToPublicPage, defaultTab = 'account' }) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { currentLanguage, setLanguage: setI18nLanguage, t } = useI18nStore();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Mettre à jour l'onglet actif quand defaultTab change ou quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    } else {
      // Réinitialiser l'onglet quand le dialog se ferme
      setActiveTab('account');
    }
  }, [isOpen, defaultTab]);
  
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  // Charger les préférences au montage
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
    
    if (savedSubscription) {
      setSubscriptionPlan(savedSubscription);
    } else {
      setSubscriptionPlan('free');
      localStorage.setItem('bonkont-subscription', 'free');
    }
  }, []); // Dépendances vides pour ne s'exécuter qu'au montage
  
  // Synchroniser la langue locale avec le store i18n lorsque le dialog s'ouvre
  useEffect(() => {
    if (isOpen && currentLanguage?.code) {
      setLanguage(currentLanguage.code);
    }
  }, [isOpen, currentLanguage?.code]);

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

  const handleNavigateToPublicPage = (page) => {
    onClose();
    if (onNavigateToPublicPage) {
      onNavigateToPublicPage(page);
    } else {
      // Fallback: utiliser window.location.hash
      window.location.hash = `#/${page}`;
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-describedby="settings-desc"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              {t('settings')}
            </DialogTitle>
            <DialogDescription id="settings-desc">
              {t('settingsDescription')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account" className="text-xs sm:text-sm">
                <User className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('account')}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs sm:text-sm">
                <Globe className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('preferences')}</span>
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

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                      <LogOut className="w-5 h-5" />
                      Déconnexion
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Déconnectez-vous de votre compte BONKONT
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => {
                    if (onLogout) {
                      onLogout();
                      onClose();
                      toast({
                        title: "Déconnexion réussie",
                        description: "Vous avez été déconnecté de votre compte."
                      });
                    } else {
                      // Fallback : déconnexion manuelle
                      localStorage.removeItem('bonkont-user');
                      window.location.hash = '';
                      window.location.reload();
                    }
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </Button>
              </div>
            </TabsContent>

            {/* Onglet Préférences */}
            <TabsContent value="preferences" className="space-y-6 mt-4 pb-10">
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

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('publicPages')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('publicPagesDescription')}
                </p>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleNavigateToPublicPage('privacy')}
                  >
                    <Shield className="w-4 h-4" />
                    {t('privacyPolicy')}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleNavigateToPublicPage('terms')}
                  >
                    <FileText className="w-4 h-4" />
                    {t('termsOfService')}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleNavigateToPublicPage('faq')}
                  >
                    <HelpCircle className="w-4 h-4" />
                    {t('faq')}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleNavigateToPublicPage('contact')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('contact')}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setShowAboutDialog(true)}
                  >
                    <Info className="w-4 h-4" />
                    {t('about')}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => handleNavigateToPublicPage('manual')}
                  >
                    <FileText className="w-4 h-4" />
                    {t('manual')}
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Aide */}
            <TabsContent value="help" className="space-y-6 mt-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 mb-2">
                      <HelpCircle className="w-5 h-5" />
                      {currentLanguage?.code === 'en' ? 'Bonkont Rule Guide' : 'Guide de la Règle Bonkont'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {currentLanguage?.code === 'en' 
                        ? 'Understand how Bonkont ensures fair and transparent expense sharing'
                        : 'Comprenez comment Bonkont garantit un partage équitable et transparent des dépenses'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setShowAboutDialog(true)}
                  >
                    <Info className="w-4 h-4" />
                    {t('about')}
                  </Button>
                </div>

                {/* Guide de la Règle Bonkont */}
                <div className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
                  {/* Règle Fondamentale */}
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <h4 className="font-bold text-lg mb-2 text-primary">
                      {currentLanguage?.code === 'en' ? 'The Fundamental Rule' : '🎯 La Règle Fondamentale'}
                    </h4>
                    <p className="text-base font-semibold italic mb-2">
                      "{currentLanguage?.code === 'en' 
                        ? 'You Validate, You Consume, You Receive or You Pay, You are Even'
                        : 'Tu Valides, Tu consommes, Tu reçois ou Tu verses, Tu es Quittes'}"
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentLanguage?.code === 'en'
                        ? 'It\'s Transparent, it\'s Fair, it\'s Bonkont.'
                        : 'C\'est Transparent, c\'est Équitable, c\'est Bonkont.'}
                    </p>
                  </div>

                  {/* La Double Règle */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-base">
                      {currentLanguage?.code === 'en' ? '📋 The Double Bonkont Rule' : '📋 La Double Règle Bonkont'}
                    </h4>
                    <p className="text-sm">
                      {currentLanguage?.code === 'en'
                        ? 'The Bonkont rule applies to ALL validated transactions and is based on two fundamental principles:'
                        : 'La règle Bonkont s\'applique à TOUTES les transactions validées et repose sur deux principes fondamentaux :'}
                    </p>

                    {/* Types de transactions */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                      <h5 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                        {currentLanguage?.code === 'en' ? '📋 Transaction Types:' : '📋 Types de transactions :'}
                      </h5>
                      <ul className="text-xs space-y-1 ml-4 list-disc text-blue-800 dark:text-blue-200">
                        <li>
                          <strong>{currentLanguage?.code === 'en' ? 'POT Contributions' : 'Contributions au POT'}</strong>: {currentLanguage?.code === 'en' ? 'Validated AND fairly shared (all concerned participants consume their share)' : 'Validées ET partagées équitablement (tous les participants concernés consomment leur part)'}
                        </li>
                        <li>
                          <strong>{currentLanguage?.code === 'en' ? 'Expenses/Advances' : 'Dépenses/Avances'}</strong>: {currentLanguage?.code === 'en' ? 'Validated AND fairly shared (who consumes what)' : 'Validées ET partagées équitablement (qui consomme quoi)'}
                        </li>
                        <li>
                          <strong>{currentLanguage?.code === 'en' ? 'Direct Transfers' : 'Transferts directs'}</strong>: {currentLanguage?.code === 'en' ? 'Validated for traceability (direct payment, no sharing)' : 'Validés pour traçabilité (paiement direct, pas de partage)'}
                        </li>
                        <li>
                          <strong>{currentLanguage?.code === 'en' ? 'POT Reimbursements' : 'Remboursements POT'}</strong>: {currentLanguage?.code === 'en' ? 'Validated for traceability (direct reimbursement, no sharing)' : 'Validés pour traçabilité (remboursement direct, pas de partage)'}
                        </li>
                      </ul>
                    </div>

                    {/* 1. La Validation */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <h5 className="font-semibold text-sm">
                        {currentLanguage?.code === 'en' ? '1️⃣ Validation: Who is concerned?' : '1️⃣ La Validation : Qui est concerné ?'}
                      </h5>
                      <p className="text-sm">
                        <strong>{currentLanguage?.code === 'en' ? 'The validation of ANY transaction triggers the Bonkont rule. For expenses/advances: only participants who validate are concerned by the fair distribution.' : 'La validation de TOUTE transaction déclenche la règle Bonkont. Pour les dépenses/avances : seuls les participants qui valident sont concernés par la répartition équitable.'}</strong>
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>
                          {currentLanguage?.code === 'en'
                            ? '✅ Collective validation: If all participants validate → All are concerned'
                            : '✅ Validation collective : Si tous les participants valident → Tous sont concernés'}
                        </li>
                        <li>
                          {currentLanguage?.code === 'en'
                            ? '✅ Partial validation: If only some validate → Only these participants are concerned'
                            : '✅ Validation partielle : Si seulement certains valident → Seuls ces participants sont concernés'}
                        </li>
                        <li>
                          {currentLanguage?.code === 'en'
                            ? '✅ By default: If no explicit validation → All participants are concerned (fair distribution)'
                            : '✅ Par défaut : Si aucune validation explicite → Tous les participants sont concernés (répartition équitable)'}
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-background rounded border border-border">
                        <p className="text-xs font-semibold mb-1">
                          {currentLanguage?.code === 'en' ? 'Concrete example:' : 'Exemple concret :'}
                        </p>
                        <p className="text-xs">
                          {currentLanguage?.code === 'en'
                            ? '10 people participate in an event. Alice makes a 30€ expense for a meal in town. Alice, Bob and Charlie validate this expense. The 7 other participants do not validate (they stayed on site). Result: Only Alice, Bob and Charlie are concerned by this expense.'
                            : '10 personnes participent à un événement. Alice effectue une dépense de 30€ pour un repas en ville. Alice, Bob et Charlie valident cette dépense. Les 7 autres participants ne valident pas (ils sont restés sur site). Résultat : Seuls Alice, Bob et Charlie sont concernés par cette dépense.'}
                        </p>
                      </div>
                    </div>

                    {/* 2. Le Partage Équitable */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <h5 className="font-semibold text-sm">
                        {currentLanguage?.code === 'en' ? '2️⃣ Fair Sharing: How is the distribution done?' : '2️⃣ Le Partage Équitable : Comment se fait la répartition ?'}
                      </h5>
                      <p className="text-xs text-muted-foreground mb-2">
                        {currentLanguage?.code === 'en'
                          ? 'Fair sharing applies to CONTRIBUTIONS and EXPENSES/ADVANCES. Direct transfers and POT reimbursements are direct transactions that do not require sharing (but are always validated for traceability).'
                          : 'Le partage équitable s\'applique aux CONTRIBUTIONS et DÉPENSES/AVANCES. Les transferts directs et remboursements POT sont des transactions directes qui ne nécessitent pas de partage (mais sont toujours validées pour traçabilité).'}
                      </p>
                      <p className="text-sm">
                        <strong>
                          {currentLanguage?.code === 'en'
                            ? 'Any advance validated by participants means the payer consumes their share on a pro-rata basis, and the other concerned participants also consume their share on a pro-rata basis.'
                            : 'Toute avance étant validée par les participants, le payeur consomme sa part au prorata, et les autres participants concernés consomment aussi leur part au prorata.'}
                        </strong>
                      </p>
                      
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold">
                          {currentLanguage?.code === 'en' ? 'Basic principle:' : 'Principe de base :'}
                        </p>
                        <ul className="text-xs space-y-1 ml-4 list-disc">
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'The payer advances the TOTAL amount'
                              : 'Le payeur avance le montant TOTAL'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'The payer consumes their SHARE (amount ÷ number of concerned participants)'
                              : 'Le payeur consomme sa PART (montant ÷ nombre de participants concernés)'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'Each other concerned participant also consumes their SHARE (amount ÷ number of concerned participants)'
                              : 'Chaque autre participant concerné consomme aussi sa PART (montant ÷ nombre de participants concernés)'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'The payer receives reimbursement from the other concerned participants'
                              : 'Le payeur reçoit le remboursement des autres participants concernés'}
                          </li>
                        </ul>
                      </div>

                      <div className="mt-3 p-3 bg-background rounded border border-border">
                        <p className="text-xs font-semibold mb-1">
                          {currentLanguage?.code === 'en' ? 'Concrete example with 8 participants:' : 'Exemple concret avec 8 participants :'}
                        </p>
                        <p className="text-xs mb-2">
                          <strong>{currentLanguage?.code === 'en' ? 'Scenario:' : 'Scénario :'}</strong> {currentLanguage?.code === 'en'
                            ? 'kalopic advances 36.61€ for an expense validated by all participants'
                            : 'kalopic avance 36,61€ pour une dépense validée par tous les participants'}
                        </p>
                        <p className="text-xs mb-2">
                          <strong>{currentLanguage?.code === 'en' ? 'Calculation:' : 'Calcul :'}</strong>
                        </p>
                        <ul className="text-xs space-y-1 ml-4 list-disc">
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'Total amount: 36.61€'
                              : 'Montant total : 36,61€'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'Number of concerned participants: 8'
                              : 'Nombre de participants concernés : 8'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'Share per person: 36.61€ ÷ 8 = 4.58€'
                              : 'Part par personne : 36,61€ ÷ 8 = 4,58€'}
                          </li>
                        </ul>
                        <p className="text-xs mt-2">
                          <strong>{currentLanguage?.code === 'en' ? 'Distribution:' : 'Répartition :'}</strong>
                        </p>
                        <ul className="text-xs space-y-1 ml-4 list-disc">
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'kalopic advances: 36.61€'
                              : 'kalopic avance : 36,61€'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'kalopic consumes: 4.58€ (their share)'
                              : 'kalopic consomme : 4,58€ (sa part)'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'Each other participant consumes: 4.58€ (their share)'
                              : 'Chaque autre participant consomme : 4,58€ (sa part)'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'kalopic must receive: 36.61€ - 4.58€ = 32.03€ from the 7 other participants'
                              : 'kalopic doit recevoir : 36,61€ - 4,58€ = 32,03€ des 7 autres participants'}
                          </li>
                        </ul>
                        <p className="text-xs mt-2 font-semibold text-primary">
                          {currentLanguage?.code === 'en'
                            ? '⚠️ But note! kalopic also consumes their share of all other expenses advanced by other participants. So:'
                            : '⚠️ Mais attention ! kalopic consomme aussi sa part de toutes les autres dépenses avancées par les autres participants. Donc :'}
                        </p>
                        <ul className="text-xs space-y-1 ml-4 list-disc">
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'kalopic advances: 36.61€'
                              : 'kalopic avance : 36,61€'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'kalopic consumes their share of their own advance: 4.58€'
                              : 'kalopic consomme sa part de sa propre avance : 4,58€'}
                          </li>
                          <li>
                            {currentLanguage?.code === 'en'
                              ? 'kalopic consumes their share of other advances: 47.75€'
                              : 'kalopic consomme sa part des autres avances : 47,75€'}
                          </li>
                          <li>
                            <strong>
                              {currentLanguage?.code === 'en'
                                ? 'Total consumed by kalopic: 52.33€'
                                : 'Total consommé par kalopic : 52,33€'}
                            </strong>
                          </li>
                          <li>
                            <strong>
                              {currentLanguage?.code === 'en'
                                ? 'kalopic\'s balance: 36.61€ - 52.33€ = -15.72€ (to pay)'
                                : 'Solde de kalopic : 36,61€ - 52,33€ = -15,72€ (à verser)'}
                            </strong>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Résumé */}
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <h4 className="font-bold text-base mb-3">
                      {currentLanguage?.code === 'en' ? '📊 Summary in 3 Points' : '📊 Résumé en 3 Points'}
                    </h4>
                    <ol className="text-sm space-y-2 ml-4 list-decimal">
                      <li>
                        <strong>{currentLanguage?.code === 'en' ? 'Validation:' : 'Validation :'}</strong> {currentLanguage?.code === 'en'
                          ? 'As soon as you validate, you are concerned by the fair distribution'
                          : 'Dès que tu valides, tu es concerné par la répartition équitable'}
                      </li>
                      <li>
                        <strong>{currentLanguage?.code === 'en' ? 'Sharing:' : 'Partage :'}</strong> {currentLanguage?.code === 'en'
                          ? 'Each person consumes their share on a pro-rata basis of the number of concerned participants'
                          : 'Chacun consomme sa part au prorata du nombre de participants concernés'}
                      </li>
                      <li>
                        <strong>{currentLanguage?.code === 'en' ? 'Balance:' : 'Équilibre :'}</strong> {currentLanguage?.code === 'en'
                          ? 'The payer advances the total, consumes their share, and receives reimbursement from the others'
                          : 'Le payeur avance le total, consomme sa part, et reçoit le remboursement des autres'}
                      </li>
                    </ol>
                  </div>

                  {/* La Promesse Bonkont */}
                  <div className="bg-muted/30 p-4 rounded-lg border border-border text-center">
                    <h4 className="font-bold text-base mb-2">
                      {currentLanguage?.code === 'en' ? '🎉 The Bonkont Promise' : '🎉 La Promesse Bonkont'}
                    </h4>
                    <p className="text-sm font-semibold italic mb-3">
                      "{currentLanguage?.code === 'en'
                        ? 'Bonkont does the accounting, Friends do the rest'
                        : 'Bonkont fait les comptes, les Amis font le reste'}"
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentLanguage?.code === 'en'
                        ? 'With the double Bonkont rule: No more disputes about who owes what, no more complicated calculations to do, no more doubts about the distribution, just fair and transparent sharing.'
                        : 'Avec la double règle Bonkont : Plus de disputes sur qui doit quoi, plus de calculs compliqués à faire, plus de doutes sur la répartition, juste du partage équitable et transparent.'}
                    </p>
                    <p className="text-xs font-semibold text-primary mt-2">
                      {currentLanguage?.code === 'en'
                        ? 'It\'s Transparent, it\'s Fair, it\'s Bonkont.'
                        : 'C\'est Transparent, c\'est Équitable, c\'est Bonkont.'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          {/* Actions de compte */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => {
                console.log("CLICK RETURN HOME");
                onClose();
                // Rediriger vers la page d'accueil
                window.location.hash = '';
                // Forcer un scroll en haut de page
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Home className="w-4 h-4" />
              Retour à l'accueil
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

      {/* Dialog À Propos */}
      <AboutDialog isOpen={showAboutDialog} onClose={() => setShowAboutDialog(false)} />
    </>
  );
}

