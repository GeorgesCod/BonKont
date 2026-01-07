import { useState } from 'react';
import { CreditCard, Plus, Wallet, DollarSign, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CashPayment } from '@/components/CashPayment';


export function PaymentMethods({ eventId, participantId, amount, onPaymentComplete }) {
  const [selectedMethod, setSelectedMethod] = useState('card');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-secondary">Mode de paiement</h3>
        <RadioGroup
          value={selectedMethod}
          onValueChange={(value) => setSelectedMethod(value)}
          className="grid grid-cols-2 gap-4"
        >
          <div className={`p-4 rounded-xl neon-border cursor-pointer transition-all ${
            selectedMethod === 'card' ? 'bg-primary/10' : ''
          }`}>
            <RadioGroupItem value="card" id="card" className="peer sr-only" />
            <Label
              htmlFor="card"
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-6 h-6 text-primary" />
              <span className="font-medium">Carte bancaire</span>
              <span className="text-sm text-muted-foreground">
                Paiement sécurisé
              </span>
            </Label>
          </div>

          <div className={`p-4 rounded-xl neon-border cursor-pointer transition-all ${
            selectedMethod === 'cash' ? 'bg-primary/10' : ''
          }`}>
            <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
            <Label
              htmlFor="cash"
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <Receipt className="w-6 h-6 text-primary" />
              <span className="font-medium">Espèces</span>
              <span className="text-sm text-muted-foreground">
                Validation collective
              </span>
            </Label>
          </div>
        </RadioGroup>

        {selectedMethod === 'cash' ? (
          <CashPayment
            eventId={eventId}
            participantId={participantId}
            amount={amount}
            onValidated={onPaymentComplete}
          />
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">Cartes enregistrées</h3>
            <div className="p-6 rounded-xl neon-border">
              <RadioGroup defaultValue="card1" className="space-y-4">
                <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-primary/50 bg-background/50">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="card1" id="card1" />
                    <Label htmlFor="card1" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span>•••• •••• •••• 4242</span>
                    </Label>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover-primary/90">
                    Modifier
                  </Button>
                </div>
              </RadioGroup>
              <Button variant="outline" className="w-full mt-4 border-secondary hover-secondary hover-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une carte
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-secondary">Autres moyens de paiement</h3>
        <div className="grid grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 neon-border border-primary/50 hover-primary">
            <div className="w-10 h-10 rounded-full bg-[#0070BA] flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm">PayPal</span>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 neon-border border-primary/50 hover-primary">
            <div className="w-10 h-10 rounded-full bg-[#3396CD] flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm">Lydia</span>
          </Button>
          <Button variant="outline" className="h-auto py-6 flex flex-col gap-2 neon-border border-primary/50 hover-primary">
            <div className="w-10 h-10 rounded-full bg-[#00D54B] flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm">Virement</span>
          </Button>
        </div>
      </div>
    </div>
  );
}