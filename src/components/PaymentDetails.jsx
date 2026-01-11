import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useEventStore } from '@/store/eventStore';
import { Euro, GripHorizontal, History } from 'lucide-react';



export function PaymentDetails({ eventId, onClose }) {
  const { toast } = useToast();
  const event = useEventStore((state) => state.events.find(e => e.id === eventId));
  const updateEvent = useEventStore((state) => state.updateEvent);

  const [position, setPosition] = useState({ x, y });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x, y });
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2,
      });
    }
  }, []);

  const handleMouseDown = (e.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x.clientX - rect.left,
          y.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));

      setPosition({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleAmountChange = async () => {
    if (!event) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Montant invalide",
        description: "Veuillez entrer un montant valide."
      });
      return;
    }

    const amountHistory = {
      date Date(),
      oldAmount.amount,
      newAmount,
      participants.participants.map(p => ({
        id.id,
        name.name,
        hasValidated
      }))
    };

    updateEvent(event.id, {
      amount,
      amountHistory: [...(event.amountHistory || []), amountHistory]
    });

    event.participants.forEach(participant => {
      toast({
        title: "Notification envoyée",
        description: `${participant.name} a été notifié de la modification du montant.`
      });
    });

    setIsAmountModalOpen(false);
    setNewAmount('');
  };

  if (!event) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-[95vw] sm:min-w-[600px] sm:max-w-2xl h-[80vh] rounded-lg neon-border bg-card"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor ? 'grabbing' : 'default'
      }}
    >
      <div
        className="h-12 flex items-center justify-center cursor-move drag-handle bg-card border-b border-border"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="w-6 h-6 text-muted-foreground" />
      </div>

      <ScrollArea className="h-[calc(80vh-3rem)] w-full">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start sticky top-0 bg-card/80 backdrop-blur-sm z-10 py-4">
            <div>
              <h2 className="text-2xl font-bold">{event.title}</h2>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAmountModalOpen} onOpenChange={setIsAmountModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Euro className="w-4 h-4" />
                    Modifier le montant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modifier le montant</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Montant actuel</Label>
                      <div className="p-2 rounded-lg bg-muted">
                        {event.amount}€
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nouveau montant</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Participants à notifier</Label>
                      <div className="space-y-2">
                        {event.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted"
                          >
                            <span>{participant.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {participant.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full gap-2"
                      onClick={handleAmountChange}
                    >
                      Confirmer la modification
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="gap-2">
                <History className="w-4 h-4" />
                Historique
              </Button>
            </div>
          </div>

          {/* Contenu des détails de paiement */}
          <div className="space-y-6">
            {/* Ajoutez ici le contenu des détails de paiement */}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}