import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCode } from '@/components/QRCode';
import { useToast } from '@/hooks/use-toast';
import { useEventStore } from '@/store/eventStore';
import {
  Share2,
  Copy,
  Mail,
  MessageSquare,
  QrCode,
  Users,
  Clock,
  Euro,
  Calendar,
  Check,
  AlertTriangle,
  Settings,
  ArrowRight
} from 'lucide-react';


export function EventCode({ eventId }) {
  const { toast } = useToast();
  const event = useEventStore((state) => 
    state.events.find(e => e.id === eventId)
  );
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);

  if (!event) return null;

  // Vérifier si l'utilisateur actuel est l'organisateur
  const userData = typeof window !== 'undefined' ? localStorage.getItem('bonkont-user') : null;
  const currentUserId = userData ? (() => {
    try {
      const user = JSON.parse(userData);
      return user.email || null;
    } catch {
      return null;
    }
  })() : null;
  const isOrganizer = currentUserId && (
    event.organizerId === currentUserId || 
    event.organizerId === currentUserId?.toLowerCase() ||
    event.organizerId === currentUserId?.toUpperCase() ||
    event.participants?.some(p => 
      (p.userId === currentUserId || p.email === currentUserId || p.email?.toLowerCase() === currentUserId?.toLowerCase()) &&
      p.isOrganizer === true
    )
  );

  // URL pour rejoindre l'événement - utilisable depuis mobile via QR code
  // Le QR code doit toujours utiliser l'URL de production pour être accessible par tous
  const productionUrl = 'https://bonkont-48a2c.web.app';
  const joinUrl = `${productionUrl}/#/join/${event.code}`;
  const shareUrl = joinUrl; // Le QR code pointe directement vers la page de rejoindre en production

  const handleCopyCode = () => {
    navigator.clipboard.writeText(event.code);
    toast({
      title: "Code copié !",
      description: "Le code a été copié dans le presse-papier."
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Lien copié !",
      description: "Le lien a été copié dans le presse-papier."
    });
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Invitation à l'événement : ${event.title}`);
    const guideText = `📋 GUIDE POUR REJOINDRE L'ÉVÉNEMENT :

1️⃣ Méthode 1 - Par code :
   • Ouvrez l'application BONKONT (ou allez sur ${productionUrl})
   • Cliquez sur "Rejoindre un événement"
   • Saisissez le code COMPLET (8 lettres majuscules) : ${event.code}
   • Cliquez sur "Rechercher"

2️⃣ Méthode 2 - Par QR code :
   • Ouvrez l'application BONKONT
   • Cliquez sur "Rejoindre un événement"
   • Cliquez sur le bouton QR code
   • Scannez le QR code reçu dans cette invitation

3️⃣ Méthode 3 - Par lien direct :
   • Cliquez simplement sur ce lien : ${shareUrl}
   • L'application s'ouvrira avec le code pré-rempli

⚠️ IMPORTANT :
   • Vous devez être connecté(e) pour rejoindre
   • Votre demande sera envoyée à l'organisateur
   • Vous recevrez une notification une fois accepté(e)

💡 Besoin d'aide ? Consultez la FAQ dans l'application.`;

    const body = encodeURIComponent(
      `Bonjour,\n\n` +
      `Vous êtes invité(e) à participer à l'événement "${event.title}".\n\n` +
      `📅 DÉTAILS DE L'ÉVÉNEMENT :\n` +
      `Description : ${event.description}\n` +
      `Date : ${new Date(event.startDate).toLocaleDateString('fr-FR')}\n` +
      `Montant total : ${event.amount}€\n` +
      `Montant par personne : ${(event.amount / event.participants.length).toFixed(2)}€\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      guideText +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `À bientôt !\n` +
      `L'équipe BONKONT`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareSMS = () => {
    const shortGuide = `Rejoignez "${event.title}" sur BONKONT :

Code (8 lettres majuscules) : ${event.code}
Lien : ${shareUrl}

📋 Comment faire :
1. Ouvrez BONKONT
2. Cliquez "Rejoindre"
3. Saisissez le code ou scannez le QR
4. Connectez-vous si besoin
5. Attendez la validation de l'organisateur

💡 Besoin d'aide ? Consultez la FAQ dans l'app.`;

    const message = encodeURIComponent(shortGuide);
    if (navigator.share) {
      navigator.share({
        title: `Invitation à ${event.title}`,
        text: shortGuide,
        url: shareUrl
      });
    } else {
      window.location.href = `sms:?body=${message}`;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 neon-border">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Clock className="w-4 h-4" />
            {event.deadline} jours
          </Badge>
        </div>

        <div className="grid grid-cols-2 md-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg neon-border text-center">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-sm font-medium">
              {new Date(event.startDate).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">Date</div>
          </div>
          <div className="p-4 rounded-lg neon-border text-center">
            <Euro className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-sm font-medium">{event.amount}€</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-4 rounded-lg neon-border text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-sm font-medium">{event.participants.length}</div>
            <div className="text-xs text-muted-foreground">Participants</div>
          </div>
          <div className="p-4 rounded-lg neon-border text-center">
            <Euro className="w-5 h-5 mx-auto mb-2 text-primary" />
            <div className="text-sm font-medium">
              {(event.amount / event.participants.length).toFixed(2)}€
            </div>
            <div className="text-xs text-muted-foreground">Par personne</div>
          </div>
        </div>

        <div className="space-y-4">
          {isOrganizer ? (
          <div className="flex items-center justify-between p-4 rounded-lg neon-border">
            <div>
              <p className="font-medium">Code événement</p>
              <p className="text-2xl font-mono font-bold text-primary">{event.code}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="neon-border"
                onClick={handleCopyCode}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="neon-border"
                onClick={() => setIsQRDialogOpen(true)}
              >
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg neon-border bg-muted/50">
              <div>
                <p className="font-medium text-muted-foreground">Code événement</p>
                <p className="text-2xl font-mono font-bold text-muted-foreground">••••••••</p>
                <p className="text-xs text-muted-foreground mt-1">Visible uniquement pour l'organisateur</p>
              </div>
            </div>
          )}

          {isOrganizer && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="gap-2 neon-border"
              onClick={handleShareEmail}
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button
              variant="outline"
              className="gap-2 neon-border"
              onClick={handleShareSMS}
            >
              <MessageSquare className="w-4 h-4" />
              SMS
            </Button>
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
                if (navigator.share) {
                    const shareText = `Rejoignez l'événement "${event.title}" sur BONKONT

Code (8 lettres majuscules) : ${event.code}
Lien : ${shareUrl}

📋 Pour rejoindre :
1. Ouvrez BONKONT
2. Cliquez "Rejoindre un événement"
3. Saisissez le code ou scannez le QR code
4. Connectez-vous si nécessaire
5. Attendez la validation de l'organisateur

💡 Besoin d'aide ? Consultez la FAQ dans l'application.`;
                  navigator.share({
                    title: `Invitation à ${event.title}`,
                      text: shareText,
                      url: shareUrl
                  });
                }
              }}
            >
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          </div>
          )}
        </div>

        {isOrganizer && (
          <div className="mt-4 mb-4">
            <Button
              onClick={() => {
                window.location.hash = `#event/${eventId}`;
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }}
              className="w-full gap-2 button-glow"
            >
              <Settings className="w-4 h-4" />
              Gérer l'événement
              <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Accédez à la gestion des participants et des transactions
            </p>
          </div>
        )}

        <div className="mt-6 space-y-2">
          <h4 className="font-medium">Participants</h4>
          <div className="grid grid-cols-2 gap-2">
            {event.participants.map((participant) => {
              const isOrganizerParticipant = event.organizerId && ((participant.email || '').toLowerCase().trim() === (event.organizerId || '').toLowerCase().trim() || String(participant.id) === String(event.organizerId));
              return (
              <div
                key={participant.id}
                className="flex items-center justify-between p-2 rounded-lg neon-border"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{participant.name}</p>
                    {isOrganizerParticipant && (
                      <Badge variant="secondary" className="text-xs font-medium text-primary border-primary/50">Organisateur</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{participant.email}</p>
                </div>
                {participant.hasConfirmed ? (
                  <Badge variant="outline" className="gap-2">
                    <Check className="w-4 h-4" />
                    Confirmé
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    En attente
                  </Badge>
                )}
              </div>
            );
            })}
          </div>
        </div>
      </Card>

      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm-w-md">
          <DialogHeader>
            <DialogTitle>Code QR de l'événement</DialogTitle>
            <DialogDescription>
              Partagez ce QR code avec les participants. Ils peuvent le scanner avec leur téléphone pour rejoindre directement l'événement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-6 space-y-4">
            <QRCode value={shareUrl} size={250} />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Code événement : {event.code}</p>
              <p className="text-xs text-muted-foreground break-all">
                {shareUrl}
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                📱 Les participants scannent ce QR code avec leur téléphone pour rejoindre automatiquement l'événement
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}