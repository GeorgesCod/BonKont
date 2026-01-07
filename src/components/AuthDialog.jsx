import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Mail, Lock, AlertCircle, User } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simuler une authentification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (activeTab === 'login') {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur BONKONT !",
        });
      } else {
        // Sauvegarder les données utilisateur
        const userData = {
          name,
          email,
          avatar: avatar || null,
          createdAt: new Date()
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
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 neon-border"
                  required
                />
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <p>
                  En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
                </p>
              </div>
            )}
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}