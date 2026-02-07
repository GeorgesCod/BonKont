import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Mail, Lock, AlertCircle, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthApp } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';


export function AuthDialog({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Réinitialiser le formulaire quand le dialogue s'ouvre
  useEffect(() => {
    if (isOpen) {
      setActiveTab('login');
      setEmail('');
      setPassword('');
      setName('');
      setAvatar(null);
      setRememberMe(false);
      setIsLoading(false);
      setAcceptedTerms(false);
      setShowPassword(false);
      setForgotPasswordLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      toast({
        variant: "destructive",
        title: "Email requis",
        description: "Veuillez saisir votre adresse email.",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        variant: "destructive",
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide (ex. vous@exemple.fr).",
      });
      return;
    }
    if (!password.trim()) {
      toast({
        variant: "destructive",
        title: "Mot de passe requis",
        description: "Veuillez saisir votre mot de passe.",
      });
      return;
    }
    setIsLoading(true);
    console.log('[Auth] handleSubmit start', { activeTab, email: trimmedEmail, hasPassword: !!password?.length });

    try {
      const auth = getAuthApp();
      if (!auth) {
        console.error('[Auth] getAuthApp() returned null/undefined');
        throw new Error('Configuration Auth Firebase manquante.');
      }

      if (activeTab === 'login') {
        console.log('[Auth] signInWithEmailAndPassword...');
        const userCred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const user = userCred.user;
        console.log('[Auth] signIn OK', { uid: user?.uid, email: user?.email });
        const userData = {
          name: user.displayName || user.email?.split('@')[0] || '',
          email: user.email || trimmedEmail,
          avatar: null,
          createdAt: new Date(),
        };
        try {
          localStorage.setItem('bonkont-user', JSON.stringify(userData));
          console.log('[Auth] localStorage bonkont-user saved (login)');
        } catch (storageError) {
          console.error('[Auth] localStorage.setItem failed', storageError);
          toast({
            variant: "destructive",
            title: "Connexion impossible",
            description: "Le stockage local est indisponible (mode privé ou quota).",
          });
          setIsLoading(false);
          return;
        }
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur BONKONT !",
        });
      } else {
        if (!acceptedTerms) {
          toast({
            variant: "destructive",
            title: "CGU requises",
            description: "Vous devez accepter les conditions d'utilisation pour vous inscrire.",
          });
          setIsLoading(false);
          return;
        }

        console.log('[Auth] createUserWithEmailAndPassword...');
        const userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const user = userCred.user;
        console.log('[Auth] createUser OK', { uid: user?.uid, email: user?.email });
        try {
          await updateProfile(user, { displayName: name.trim() || trimmedEmail.split('@')[0] });
        } catch (profileErr) {
          console.warn('[Auth] updateProfile failed (non-blocking)', profileErr);
        }
        const userData = {
          name: name.trim() || user.email?.split('@')[0] || '',
          email: user.email || trimmedEmail,
          avatar: avatar || null,
          createdAt: new Date(),
          acceptedTerms: true,
          termsAcceptedAt: new Date(),
        };
        try {
          localStorage.setItem('bonkont-user', JSON.stringify(userData));
          console.log('[Auth] localStorage bonkont-user saved (register)');
        } catch (storageError) {
          console.error('[Auth] localStorage.setItem failed', storageError);
          toast({
            variant: "destructive",
            title: "Inscription impossible",
            description: "Le stockage local est indisponible (mode privé ou quota).",
          });
          setIsLoading(false);
          return;
        }
        toast({
          title: "Inscription réussie",
          description: "Votre compte a été créé avec succès.",
        });
      }

      console.log('[Auth] calling onSuccess()');
      if (typeof onSuccess === 'function') {
        try {
          onSuccess();
        } catch (onSuccessErr) {
          console.error('[Auth] onSuccess() threw', onSuccessErr);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Connexion réussie mais mise à jour de l'interface en échec. Rechargez la page.",
          });
        }
      } else {
        console.warn('[Auth] onSuccess is not a function', typeof onSuccess);
      }
    } catch (error) {
      console.error('[Auth] handleSubmit error', error?.code, error?.message, error);
      const code = error?.code || '';
      const msg =
        code === 'auth/user-not-found'
          ? "Aucun compte avec cet email. Créez un compte (onglet Inscription)."
          : code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials'
            ? "Email ou mot de passe incorrect. Vérifiez vos identifiants."
            : code === 'auth/invalid-email'
              ? "Adresse email invalide."
              : code === 'auth/email-already-in-use'
                ? "Cet email est déjà utilisé. Connectez-vous (onglet Connexion)."
                : code === 'auth/weak-password'
                  ? "Le mot de passe doit contenir au moins 6 caractères."
                  : code === 'auth/user-disabled'
                    ? "Ce compte a été désactivé. Contactez le support."
                    : code === 'auth/too-many-requests'
                      ? "Trop de tentatives. Réessayez plus tard."
                      : code === 'auth/operation-not-allowed'
                        ? "Connexion par email désactivée. L'administrateur doit activer « Email/Mot de passe » dans la console Firebase (Authentication > Sign-in method)."
                        : code === 'auth/network-request-failed'
                          ? "Erreur réseau. Vérifiez votre connexion et réessayez."
                          : error?.message || "Une erreur est survenue. Veuillez réessayer.";
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      toast({
        variant: "destructive",
        title: "Email requis",
        description: "Veuillez saisir votre email pour réinitialiser votre mot de passe.",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        variant: "destructive",
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide.",
      });
      return;
    }
    setForgotPasswordLoading(true);
    try {
      const auth = getAuthApp();
      await sendPasswordResetEmail(auth, trimmedEmail);
      toast({
        title: "Email envoyé",
        description: "Si un compte existe pour cet email, vous recevrez les instructions de réinitialisation. Vérifiez aussi les spams.",
      });
    } catch (err) {
      const code = err?.code || '';
      const msg =
        code === 'auth/user-not-found'
          ? "Aucun compte avec cet email. Vérifiez l'adresse ou créez un compte."
          : code === 'auth/invalid-email'
            ? "Adresse email invalide."
            : code === 'auth/too-many-requests'
              ? "Trop de tentatives. Réessayez plus tard."
              : err?.message || "Impossible d'envoyer l'email. Réessayez plus tard.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: msg,
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[400px] glass-morphism mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text text-center">
            {activeTab === 'login' ? 'Connexion' : 'Inscription'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {activeTab === 'login' ? 'Connectez-vous à votre compte' : 'Créez un nouveau compte'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Inscription</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {activeTab === 'register' && (
              <>
                <div className="flex justify-center mb-4">
                  <AvatarUpload
                    currentAvatar={avatar}
                    onAvatarChange={setAvatar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Votre nom"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 neon-border"
                      required
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 neon-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 neon-border"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {activeTab === 'login' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                  />
                  <Label htmlFor="remember" className="text-sm">
                    Se souvenir de moi
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm"
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? "Envoi en cours..." : "Mot de passe oublié ?"}
                </Button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full button-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Chargement...
                </div>
              ) : activeTab === 'login' ? (
                'Se connecter'
              ) : (
                "S'inscrire"
              )}
            </Button>

            {activeTab === 'register' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-muted-foreground cursor-pointer">
                    J'accepte les{' '}
                    <a
                      href="#/terms"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = '#/terms';
                        onClose();
                      }}
                      className="text-primary hover:underline"
                    >
                      conditions d'utilisation
                    </a>
                    {' '}et la{' '}
                    <a
                      href="#/privacy"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = '#/privacy';
                        onClose();
                      }}
                      className="text-primary hover:underline"
                    >
                      politique de confidentialité
                    </a>
                  </label>
                </div>
                {!acceptedTerms && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Vous devez accepter les CGU pour vous inscrire
                  </p>
                )}
              </div>
            )}
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}