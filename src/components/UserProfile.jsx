import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventHistory } from '@/components/EventHistory';
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
import { UserCircle, History, LogOut, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export function UserProfile({ isOpen, onClose }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState(null);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('bonkont-user');
    if (stored) {
      const data = JSON.parse(stored);
      setUserData(data);
      setAvatar(data.avatar);
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
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historique
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

          <TabsContent value="history">
            <EventHistory />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}