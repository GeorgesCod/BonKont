import { useState, useEffect, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QRCode } from '@/components/QRCode';
import { useToast } from '@/hooks/use-toast';
import { useEventStore } from '@/store/eventStore';
import { Mail, Share2, Copy, MessageSquare, Users, QrCode } from 'lucide-react';

export function InviteFriends({ eventCode: propEventCode }) {
  const { toast } = useToast();
  const events = useEventStore((state) => state.events);
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState(
    `Rejoignez-moi sur BONKONT, l'application qui simplifie le partage des dépenses entre amis !`
  );
  const currentEventCode = propEventCode || null;
  const lastActionRef = useRef(0);
  const DEBOUNCE_MS = 400;
  const handlersRef = useRef({});
  const buttonsContainerRef = useRef(null);

  const runOnce = (fn) => {
    const now = Date.now();
    if (now - lastActionRef.current < DEBOUNCE_MS) return;
    lastActionRef.current = now;
    fn();
  };

  // URL de production pour le QR code - toujours accessible depuis mobile
  const productionUrl = 'https://bonkont-48a2c.web.app';
  const joinUrl = currentEventCode ? `${productionUrl}/#/join/${currentEventCode}` : `${productionUrl}/#/join`;
  
  // Mettre à jour le message avec le lien quand le code change
  useEffect(() => {
    const baseMessage = `Rejoignez-moi sur BONKONT, l'application qui simplifie le partage des dépenses entre amis !`;
    if (currentEventCode) {
      const messageWithLink = `${baseMessage}\n\n${joinUrl}`;
      setMessage(messageWithLink);
    } else {
      setMessage(baseMessage);
    }
  }, [currentEventCode, joinUrl]);

  const handleSendInvitations = async () => {
    const emailList = emails.split(',').map(email => email.trim()).filter(email => email.length > 0);
    
    if (emailList.length === 0) {
      toast({
        variant: "destructive",
        title: "Aucune adresse email",
        description: "Veuillez entrer au moins une adresse email."
      });
      return;
    }

    // Valider les emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      toast({
        variant: "destructive",
        title: "Emails invalides",
        description: `Les adresses suivantes sont invalides : ${invalidEmails.join(', ')}`
      });
      return;
    }

    try {
    // Créer le message d'invitation avec guide
    const guideText = currentEventCode ? `📋 GUIDE POUR REJOINDRE L'ÉVÉNEMENT :

1️⃣ Méthode 1 - Par code :
   • Ouvrez l'application BONKONT (ou allez sur ${productionUrl})
   • Cliquez sur "Rejoindre un événement"
   • Saisissez le code COMPLET (8 lettres majuscules) : ${currentEventCode}
   • Cliquez sur "Rechercher"

2️⃣ Méthode 2 - Par QR code :
   • Ouvrez l'application BONKONT
   • Cliquez sur "Rejoindre un événement"
   • Cliquez sur le bouton QR code
   • Scannez le QR code reçu dans cette invitation

3️⃣ Méthode 3 - Par lien direct :
   • Cliquez simplement sur ce lien : ${joinUrl}
   • L'application s'ouvrira avec le code pré-rempli

⚠️ IMPORTANT :
   • Vous devez être connecté(e) pour rejoindre
   • Votre demande sera envoyée à l'organisateur
   • Vous recevrez une notification une fois accepté(e)

💡 Besoin d'aide ? Consultez la FAQ dans l'application.` : '';

    const emailBody = message + (guideText ? `\n\n${guideText}` : '');
    const emailSubject = currentEventCode 
      ? `Invitation à rejoindre un événement BONKONT (Code: ${currentEventCode})`
      : 'Invitation à rejoindre BONKONT';

    // Ouvrir le client email avec les destinataires
    const mailtoLink = `mailto:${emailList.join(',')}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;

    toast({
      title: "Email préparé !",
      description: `Le client email s'ouvre avec ${emailList.length} destinataire(s).`
    });
    } catch (err) {
      console.error('Send invitations failed:', err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ouvrir le client email. Vérifiez votre configuration."
      });
    }
  };

  const handleShare = async () => {
    const shareText = currentEventCode 
      ? `${message}\n\nCode événement (8 lettres majuscules): ${currentEventCode}\nLien: ${joinUrl}`
      : message;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentEventCode ? `Invitation BONKONT - Code: ${currentEventCode}` : 'BONKONT - Partage de dépenses',
          text: shareText,
          url: joinUrl
        });
        toast({
          title: "Partage réussi !",
          description: "L'invitation a été partagée."
        });
      } catch (error) {
        // L'utilisateur a annulé le partage, ne pas afficher d'erreur
        if (error.name !== 'AbortError') {
          console.error('Erreur lors du partage:', error);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de partager. Veuillez réessayer."
          });
        }
      }
    } else {
      // Fallback : copier le lien
      await handleCopyLink();
    }
  };

  const handleSms = async () => {
    const linkToShare = currentEventCode ? joinUrl : `${productionUrl}/#/join`;
    const shareText = `Rejoins-moi sur BONKONT : ${linkToShare}${currentEventCode ? `\n\nCode événement (8 lettres majuscules): ${currentEventCode}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Invitation BONKONT',
          text: shareText,
          url: linkToShare
        });
        toast({ title: "Partage réussi !", description: "L'invitation a été partagée." });
      } else {
        const message = encodeURIComponent(shareText);
        window.location.href = `sms:?body=${message}`;
        toast({ title: "SMS préparé", description: "L'application SMS s'ouvre avec le message." });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de partager." });
      }
    }
  };

  const handleCopyLink = async () => {
    const linkToCopy = currentEventCode ? joinUrl : `${productionUrl}/#/join`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(linkToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = linkToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast({
        title: "Lien copié !",
        description: "Le lien d'invitation a été copié dans le presse-papier."
      });
    } catch (err) {
      console.error('Copy failed:', err);
      toast({
        variant: "destructive",
        title: "Copie impossible",
        description: "Veuillez copier le lien manuellement : " + linkToCopy
      });
    }
  };

  // Refs à jour pour l'écouteur natif
  handlersRef.current.sendInvitations = handleSendInvitations;
  handlersRef.current.share = handleShare;

  // Écouteur DOM natif en phase capture pour contourner Radix/React
  useEffect(() => {
    const onCapture = (e) => {
      const container = e.target?.closest?.('[data-invite-buttons]');
      if (!container) return;
      const btn = e.target?.closest?.('button[data-invite-action]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const action = btn.getAttribute('data-invite-action');
      const h = handlersRef.current;
      if (action === 'email' && h.sendInvitations) runOnce(h.sendInvitations);
      else if (action === 'share' && h.share) runOnce(h.share);
    };
    document.addEventListener('click', onCapture, true);
    document.addEventListener('pointerdown', onCapture, true);
    return () => {
      document.removeEventListener('click', onCapture, true);
      document.removeEventListener('pointerdown', onCapture, true);
    };
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 neon-border min-h-[44px] w-full sm:w-auto touch-manipulation">
          <Users className="w-4 h-4" />
          Inviter des amis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm-w-md glass-morphism pointer-events-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">Inviter des amis</DialogTitle>
          <DialogDescription>
            Partagez le code de l'événement avec vos amis pour qu'ils puissent rejoindre
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {/* QR Code Section */}
          {currentEventCode && (
            <div className="flex flex-col items-center space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-center space-y-2">
                <Label className="text-base font-semibold flex items-center justify-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Scanner pour rejoindre l'événement
                </Label>
                <p className="text-sm text-muted-foreground">
                  Flashez ce code avec votre mobile pour accéder directement à l'événement
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-lg">
                <QRCode value={joinUrl} size={200} />
              </div>
              <div className="text-center">
                <p className="text-xs font-mono text-muted-foreground mb-2">Code: {currentEventCode}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.preventDefault(); handleCopyLink(); }}
                  className="gap-2 text-xs"
                >
                  <Copy className="w-3 h-3" />
                  Copier le lien
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

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

          <div ref={buttonsContainerRef} data-invite-buttons className="space-y-4">
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <button
                type="button"
                data-invite-action="email"
                className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'gap-2 button-glow')}
              >
                <Mail className="w-4 h-4" />
                Envoyer par email
              </button>
              <button
                type="button"
                data-invite-action="share"
                className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'gap-2 neon-border')}
              >
                <Share2 className="w-4 h-4" />
                Partager
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}