import { Trash2, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';



export function ParticipantForm({
  participant,
  onUpdate,
  onRemove,
  canRemove
}) {
  return (
    <div className="p-4 rounded-lg neon-border relative group">
      {canRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-3 -right-3 rounded-full w-8 h-8 opacity-0 group-hover-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`name-${participant.id}`}>Nom</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`name-${participant.id}`}
              value={participant.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="pl-10 neon-border"
              placeholder="Nom du participant"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`email-${participant.id}`}>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`email-${participant.id}`}
              type="email"
              value={participant.email}
              onChange={(e) => onUpdate({ email: e.target.value })}
              className="pl-10 neon-border"
              placeholder="email@exemple.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}