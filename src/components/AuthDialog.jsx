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
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simuler une authentification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (activeTab === 'login') {
        // Récupérer les données existantes ou créer de nouvelles données
        const existingUserData = localStorage.getItem('bonkont-user');
        let userData;
        
        if (existingUserData) {
          // Si des données existent, les récupérer
          userData = JSON.parse(existingUserData);
          // Mettre à jour l'email si nécessaire
          userData.email = email;
        } else {
          // Sinon, créer de nouvelles données utilisateur
          userData = {
            name: email.split('@')[0], // Utiliser la partie avant @ comme nom par défaut
            email,
            avatar: null,
            createdAt: new Date()
          };
        }
        
        // Sauvegarder les données utilisateur
        localStorage.setItem('bonkont-user', JSON.stringify(userData));
        
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur BONKONT !",
        });
      } else {
        // Vérifier l'acceptation des CGU pour l'inscription
        if (!acceptedTerms) {
          toast({
            variant: "destructive",
            title: "CGU requises",
            description: "Vous devez accepter les conditions d'utilisation pour vous inscrire.",
          });
          setIsLoading(false);
          return;
        }
        
        // Sauvegarder les données utilisateur
        const userData = {
          name,
          email,
          avatar: avatar || null,
          createdAt: new Date(),
          acceptedTerms: true,
          termsAcceptedAt: new Date()
        };
        localStorage.setItem('bonkont-user', JSON.stringify(userData));
        
        toast({
          title: "Inscription réussie",
          description: "Votre compte a été créé avec succès.",
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (email.trim() === '') {
      toast({
        variant: "destructive",
        title: "Email requis",
        description: "Veuillez saisir votre email pour réinitialiser votre mot de passe.",
      });
      return;
    }

    toast({
      title: "Email envoyé",
      description: "Les instructions de réinitialisation ont été envoyées à votre adresse email.",
    });
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
                >
                  Mot de passe oublié ?
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