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
  AlertTriangle
} from 'lucide-react';


export function EventCode({ eventId }) {
  const { toast } = useToast();
  const event = useEventStore((state) => 
    state.events.find(e => e.id === eventId)
  );
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);

  if (!event) return null;

  const shareUrl = `${window.location.origin}/event/${event.code}`;

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
    const body = encodeURIComponent(
      `Bonjour,\n\n` +
      `Vous êtes invité(e) à participer à l'événement "${event.title}".\n\n` +
      `Description : ${event.description}\n` +
      `Date : ${new Date(event.startDate).toLocaleDateString()}\n` +
      `Montant total : ${event.amount}€\n` +
      `Montant par personne : ${(event.amount / event.participants.length).toFixed(2)}€\n\n` +
      `Pour rejoindre l'événement, utilisez ce code : ${event.code}\n` +
      `Ou cliquez sur ce lien : ${shareUrl}\n\n` +
      `À bientôt !`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareSMS = () => {
    const message = encodeURIComponent(
      `Rejoignez l'événement "${event.title}" sur BONKONT avec le code : ${event.code}\n` +
      `Lien : ${shareUrl}`
    );
    if (navigator.share) {
      navigator.share({
        title: `Invitation à ${event.title}`,
        text: `Rejoignez l'événement "${event.title}" sur BONKONT avec le code : ${event.code}\nLien : ${shareUrl}`,
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
                  navigator.share({
                    title: `Invitation à ${event.title}`,
                    text: `Rejoignez l'événement "${event.title}" sur BONKONT`,
                    url: shareUrl
                  });
                }
              }}
            >
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <h4 className="font-medium">Participants</h4>
          <div className="grid grid-cols-2 gap-2">
            {event.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-2 rounded-lg neon-border"
              >
                <div>
                  <p className="font-medium">{participant.name}</p>
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
            ))}
          </div>
        </div>
      </Card>

      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm-w-md">
          <DialogHeader>
            <DialogTitle>Code QR de l'événement</DialogTitle>
            <DialogDescription>
              Scannez ce code QR pour rejoindre l'événement
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-6">
            <QRCode value={shareUrl} size={200} />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Scannez ce code QR pour rejoindre l'événement
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}