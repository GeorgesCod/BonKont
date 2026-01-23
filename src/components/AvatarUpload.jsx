import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Trash2, Upload, UserCircle } from 'lucide-react';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];


export function AvatarUpload({ currentAvatar, onAvatarChange }) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || null);
  const [tempAvatar, setTempAvatar] = useState(currentAvatar || null); // Avatar temporaire avant sauvegarde
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Format non supporté",
        description: "Seuls les formats JPG et PNG sont acceptés."
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 2MB."
      });
      return;
    }

    // Prévisualisation (temporaire, pas encore sauvegardé)
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setPreviewUrl(result);
      setTempAvatar(result); // Sauvegarder temporairement
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    setTempAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    // Sauvegarder l'avatar temporaire
    onAvatarChange(tempAvatar);
    setPreviewUrl(tempAvatar);
    
    toast({
      title: "Avatar enregistré",
      description: "Votre avatar a été modifié avec succès.",
    });
    
    // Fermer le dialog
    setIsOpen(false);
  };

  const handleOpenChange = (open) => {
    setIsOpen(open);
    // Réinitialiser l'avatar temporaire à l'avatar actuel quand on ouvre
    if (open) {
      setTempAvatar(currentAvatar || null);
      setPreviewUrl(currentAvatar || null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="relative cursor-pointer group">
          <Avatar className="w-24 h-24 border-2 border-primary">
            <AvatarImage src={previewUrl || undefined} />
            <AvatarFallback>
              <UserCircle className="w-12 h-12" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="sm-w-md glass-morphism">
        <DialogHeader>
          <DialogTitle>Modifier votre avatar</DialogTitle>
          <DialogDescription>
            Sélectionnez ou téléchargez une image pour votre avatar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center">
            <Avatar className="w-32 h-32 border-2 border-primary">
              <AvatarImage src={previewUrl || undefined} />
              <AvatarFallback>
                <UserCircle className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="avatar">Choisir une image</Label>
              <Input
                id="avatar"
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="cursor-pointer neon-border"
              />
              <p className="text-sm text-muted-foreground">
                JPG ou PNG • Max 2MB
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ou choisir un avatar prédéfini</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  '👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓',
                  '👨‍🔬', '👩‍🔬', '👨‍⚕️', '👩‍⚕️', '👨‍🍳', '👩‍🍳', '👨‍🏫', '👩‍🏫'
                ].map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const emojiAvatar = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50" font-size="50">${emoji}</text></svg>`;
                      setPreviewUrl(emojiAvatar);
                      setTempAvatar(emojiAvatar); // Sauvegarder temporairement
                    }}
                    className="w-12 h-12 rounded-full border-2 border-border hover:border-primary transition-colors text-2xl flex items-center justify-center bg-background hover:bg-primary/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={!previewUrl}
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer l'avatar ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. L'avatar par défaut sera utilisé.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemoveAvatar}
                    className="bg-destructive text-destructive-foreground hover-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              className="gap-2 button-glow"
              onClick={handleSave}
            >
              <Upload className="w-4 h-4" />
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}