import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Mail, Share2, Copy, MessageSquare, Users } from 'lucide-react';

export function InviteFriends() {
  const { toast } = useToast();
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState(
    `Rejoignez-moi sur BONKONT, l'application qui simplifie le partage des dépenses entre amis !`
  );

  const handleSendInvitations = async () => {
    const emailList = emails.split(',').map(email => email.trim());
    
    // Simulation d'envoi d'invitations
    toast({
      title: "Invitations envoyées !",
      description: `${emailList.length} invitation(s) ont été envoyées avec succès.`
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BONKONT - Partage de dépenses',
          text: message,
          url: window.location.origin
        });
      } catch (error) {
        console.error('Erreur lors du partage:', error);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=invite`);
    toast({
      title: "Lien copié !",
      description: "Le lien d'invitation a été copié dans le presse-papier."
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 neon-border">
          <Users className="w-4 h-4" />
          Inviter des amis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-morphism">
        <DialogHeader>
          <DialogTitle className="gradient-text">Inviter des amis</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Adresses email</Label>
            <Input
              placeholder="email1@exemple.com, email2@exemple.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="neon-border"
            />
            <p className="text-sm text-muted-foreground">
              Séparez les adresses email par des virgules
            </p>
          </div>

          <div className="space-y-2">
            <Label>Message personnalisé</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] neon-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              className="gap-2 button-glow"
              onClick={handleSendInvitations}
            >
              <Mail className="w-4 h-4" />
              Envoyer par email
            </Button>
            <Button
              variant="outline"
              className="gap-2 neon-border"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="gap-2 neon-border"
              onClick={handleCopyLink}
            >
              <Copy className="w-4 h-4" />
              Copier le lien
            </Button>
            <Button
              variant="outline"
              className="gap-2 neon-border"
              onClick={() => {
                const message = encodeURIComponent(
                  `Rejoins-moi sur BONKONT : ${window.location.origin}?ref=sms`
                );
                window.location.href = `sms:?body=${message}`;
              }}
            >
              <MessageSquare className="w-4 h-4" />
              Envoyer par SMS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}