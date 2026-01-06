import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Euro, Users, Clock, Plus, ArrowRight } from 'lucide-react';
import { ParticipantForm } from '@/components/ParticipantForm';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

export function EventCreation() {
  const { toast } = useToast();
  const addEvent = useEventStore((state) => state.addEvent);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState(30);
  const [participants, setParticipants] = useState([
    { id: 1, name: '', email: '', hasConfirmed: false, hasValidatedAmount: false, hasValidatedDeadline: false }
  ]);

  const addParticipant = () => {
    const newId = Math.max(...participants.map(p => p.id)) + 1;
    setParticipants([...participants, {
      id: newId,
      name: '',
      email: '',
      hasConfirmed: false,
      hasValidatedAmount: false,
      hasValidatedDeadline: false
    }]);
  };

  const removeParticipant = (id) => {
    if (participants.length > 1) {
      setParticipants(participants.filter(p => p.id !== id));
    }
  };

  const updateParticipant = (id, updates) => {
    setParticipants(participants.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return title.trim() !== '' && description.trim() !== '';
      case 2:
        return amount.trim() !== '' && !isNaN(parseFloat(amount));
      case 3:
        return participants.every(p => p.name.trim() !== '' && p.email.trim() !== '');
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    const newEvent = {
      title,
      description,
      amount: parseFloat(amount),
      deadline,
      startDate: new Date(),
      participants: participants.map(p => ({
        ...p,
        hasPaid: false,
        paidAmount: 0
      })),
      status: 'active',
      totalPaid: 0
    };

    addEvent(newEvent);

    // Effet de confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast({
      title: "Événement créé !",
      description: "L'événement a été ajouté avec succès."
    });

    // Réinitialiser le formulaire
    setStep(1);
    setTitle('');
    setDescription('');
    setAmount('');
    setDeadline(30);
    setParticipants([
      { id: 1, name: '', email: '', hasConfirmed: false, hasValidatedAmount: false, hasValidatedDeadline: false }
    ]);
  };

  return (
    <div className="space-y-6 mb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Créer un événement</h2>
        <Badge variant="outline" className="gap-2">
          Étape {step}/4
        </Badge>
      </div>

      <Progress value={step * 25} className="h-2" />

      <Card className="p-6 neon-border space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'événement</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Soirée restaurant"
                className="neon-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre événement..."
                className="neon-border min-h-[100px]"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant total à partager</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 neon-border"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Délai de remboursement (jours)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="deadline"
                  type="number"
                  min="1"
                  value={deadline}
                  onChange={(e) => setDeadline(parseInt(e.target.value))}
                  className="pl-10 neon-border"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Participants</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addParticipant}
                className="gap-2 neon-border"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>
            <div className="space-y-4">
              {participants.map((participant) => (
                <ParticipantForm
                  key={participant.id}
                  participant={participant}
                  onUpdate={(updates) => updateParticipant(participant.id, updates)}
                  onRemove={() => removeParticipant(participant.id)}
                  canRemove={participants.length > 1}
                />
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg neon-border space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Calendar className="w-5 h-5" />
                  <h3 className="font-semibold">Événement</h3>
                </div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="p-4 rounded-lg neon-border space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Euro className="w-5 h-5" />
                  <h3 className="font-semibold">Montant</h3>
                </div>
                <p className="font-medium">{amount}€</p>
                <p className="text-sm text-muted-foreground">
                  {(parseFloat(amount) / participants.length).toFixed(2)}€ par personne
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg neon-border space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Users className="w-5 h-5" />
                <h3 className="font-semibold">Participants ({participants.length})</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {participants.map((p) => (
                  <div key={p.id} className="text-sm">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-muted-foreground">{p.email}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg neon-border space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-5 h-5" />
                <h3 className="font-semibold">Délai</h3>
              </div>
              <p className="font-medium">{deadline} jours</p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-border">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="neon-border"
            >
              Retour
            </Button>
          )}
          <div className="ml-auto">
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-2 button-glow"
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="gap-2 button-glow"
              >
                Créer l'événement
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}