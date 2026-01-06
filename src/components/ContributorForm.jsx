import { User, Trash2, Check, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';



export function ContributorForm({ contributor, onRemove, onValidate, canRemove }) {
  return (
    <div className="space-y-4 p-6 rounded-xl bg-background/50 neon-border relative group">
      {canRemove && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute -top-3 -right-3 rounded-full w-8 h-8 p-0 shadow-lg opacity-0 group-hover-100 transition-opacity duration-200"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
          <User className="w-5 h-5" />
          Participant {contributor.id}
        </h3>
        <Button
          variant="outline"
          size="sm"
          className={`${contributor.hasValidated ? 'bg-green-500/20 text-green-500 border-green-500/50' : ''}`}
          onClick={onValidate}
        >
          <Check className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`firstName-${contributor.id}`}>Prénom</Label>
          <Input
            id={`firstName-${contributor.id}`}
            placeholder="Entrez le prénom"
            className="bg-background/50 border-primary/50 focus-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lastName-${contributor.id}`}>Nom</Label>
          <Input
            id={`lastName-${contributor.id}`}
            placeholder="Entrez le nom"
            className="bg-background/50 border-primary/50 focus-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`email-${contributor.id}`}>Email</Label>
          <Input
            id={`email-${contributor.id}`}
            type="email"
            placeholder="Entrez l'adresse email"
            className="bg-background/50 border-primary/50 focus-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`mobile-${contributor.id}`}>Mobile</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id={`mobile-${contributor.id}`}
              type="tel"
              placeholder="Entrez le numéro mobile"
              className="pl-10 bg-background/50 border-primary/50 focus-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}