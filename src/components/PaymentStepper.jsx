import { Check, Clock, CreditCard } from 'lucide-react';

export function PaymentStepper() {
  return (
    <div className="flex items-center justify-between max-w-3xl mx-auto mb-12">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground neon-glow">
          <Check className="w-6 h-6" />
        </div>
        <span className="text-sm mt-2 text-primary">Détails</span>
      </div>
      <div className="flex-1 h-px bg-primary/30 mx-4" />
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground neon-glow">
          <Clock className="w-6 h-6" />
        </div>
        <span className="text-sm mt-2 text-secondary">Partage</span>
      </div>
      <div className="flex-1 h-px bg-primary/30 mx-4" />
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full border-2 border-muted flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-muted-foreground" />
        </div>
        <span className="text-sm mt-2 text-muted-foreground">Paiement</span>
      </div>
    </div>
  );
}