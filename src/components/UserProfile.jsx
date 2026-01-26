import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarUpload } from '@/components/AvatarUpload';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UserCircle, UserPlus, Trash2, CheckCircle2, AlertCircle, Mail, Lock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export function UserProfile({ isOpen, onClose }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState(null);
  const [avatar, setAvatar] = useState(null);
  
  // États pour l'onglet Inscription
  const [pseudo, setPseudo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('bonkont-user');
    if (stored) {
      const data = JSON.parse(stored);
      setUserData(data);
      setAvatar(data.avatar);
      // Pré-remplir les champs d'inscription
      setPseudo(data.pseudo || data.name || '');
      setName(data.name || '');
      setEmail(data.email || '');
      setAcceptedTerms(data.acceptedTerms || false);
    }
  }, [isOpen]);

  const handleAvatarChange = (newAvatar) => {
    setAvatar(newAvatar);
    if (userData) {
      const updated = { ...userData, avatar: newAvatar };
      localStorage.setItem('bonkont-user', JSON.stringify(updated));
      setUserData(updated);
      toast({
        title: "Avatar mis à jour",
        description: "Votre avatar a été modifié avec succès.",
      });
    }
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Vérifier l'acceptation des CGU si ce n'est pas déjà fait
      if (!userData?.acceptedTerms && !acceptedTerms) {
        toast({
          variant: "destructive",
          title: "CGU requises",
          description: "Vous devez accepter les conditions d'utilisation pour finaliser votre inscription.",
        });
        setIsLoading(false);
        return;
      }
      
      // Mettre à jour les données utilisateur
      const updatedData = {
        ...userData,
        pseudo: pseudo || userData?.pseudo || userData?.name,
        name: name || userData?.name,
        email: email || userData?.email,
        avatar: avatar || userData?.avatar,
        acceptedTerms: acceptedTerms || userData?.acceptedTerms,
        termsAcceptedAt: acceptedTerms && !userData?.acceptedTerms ? new Date() : userData?.termsAcceptedAt,
        updatedAt: new Date()
      };
      
      localStorage.setItem('bonkont-user', JSON.stringify(updatedData));
      setUserData(updatedData);
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    // Supprimer les données utilisateur
    localStorage.removeItem('bonkont-user');
    // Optionnel : supprimer aussi les événements
    // localStorage.removeItem('bonkont-events');
    
    toast({
      title: "Compte supprimé",
      description: "Votre compte a été supprimé avec succès.",
    });
    
    onClose();
    // Rediriger vers la page d'accueil
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm-w-4xl glass-morphism">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text">Profil Utilisateur</DialogTitle>
          <DialogDescription>
            Gérez vos informations personnelles et vos préférences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <UserCircle className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="registration" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Inscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="flex flex-col items-center space-y-6">
              <AvatarUpload
                currentAvatar={avatar}
                onAvatarChange={handleAvatarChange}
              />
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">{userData?.name || 'Utilisateur'}</h2>
                <p className="text-sm text-muted-foreground">{userData?.email || ''}</p>
                {userData?.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Membre depuis {new Date(userData.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              
              <div className="w-full pt-4 border-t border-border">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer mon compte
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Toutes vos données seront supprimées définitivement.
                        Cette action supprimera votre compte et toutes les données associées.
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="registration">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <Label className="text-base font-semibold mb-4 block">Personnalisez votre avatar</Label>
                    <AvatarUpload
                      currentAvatar={avatar}
                      onAvatarChange={handleAvatarChange}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Cliquez sur l'avatar pour choisir une photo ou un avatar prédéfini
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pseudo">Pseudo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pseudo"
                      type="text"
                      placeholder="Votre pseudo"
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      className="pl-10 neon-border"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ce nom sera visible par les autres participants
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Votre nom complet (optionnel)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 neon-border"
                    />
                  </div>
                </div>
                
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
                      minLength={6}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Laissez vide pour ne pas modifier le mot de passe
                  </p>
                </div>
              </div>
              
              {/* Section CGU */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/50">
                <h3 className="text-lg font-semibold">Conditions d'utilisation</h3>
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
                {!acceptedTerms && !userData?.acceptedTerms && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Vous devez accepter les CGU pour finaliser votre inscription
                  </p>
                )}
                {userData?.acceptedTerms && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>CGU acceptées le {userData?.termsAcceptedAt ? new Date(userData.termsAcceptedAt).toLocaleDateString('fr-FR') : 'N/A'}</span>
                  </div>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full button-glow"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                    Enregistrement...
                  </div>
                ) : (
                  'Enregistrer les modifications'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}