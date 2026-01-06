import { Mail, Smartphone, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';




export function TransactionDetails({ 
  contributors, 
  totalAmount, 
  splitAmount,
  onRemoveContributor 
}) {
  const calculateTransactions = () => {
    const transactions = [];
    const amount = parseFloat(splitAmount);

    contributors.forEach((payer, i) => {
      contributors.forEach((receiver, j) => {
        if (i !== j) {
          transactions.push({
            from: `${payer.firstName} ${payer.lastName}`,
            to: `${receiver.firstName} ${receiver.lastName}`,
            amount / (contributors.length - 1)
          });
        }
      });
    });

    return transactions;
  };

  const handleShare = (type: 'email' | 'sms') => {
    const transactions = calculateTransactions();
    const message = `Détails des transactions pour l'événement:\n\n` +
      `Montant total: ${totalAmount}€\n` +
      `Montant par personne: ${splitAmount}€\n\n` +
      transactions.map(t => 
        `${t.from} doit ${t.amount.toFixed(2)}€ à ${t.to}`
      ).join('\n');

    if (type === 'email') {
      const mailtoLink = `mailto:${contributors.map(c => c.email).join(',')}?subject=Détails des transactions&body=${encodeURIComponent(message)}`;
      window.open(mailtoLink);
    } else {
      // Pour SMS, on utilise l'API Web Share si disponible
      if (navigator.share) {
        navigator.share({
          title: 'Détails des transactions',
          text
        });
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 neon-border">
          Voir les détails des transactions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Détails des transactions</DialogTitle>
          <DialogDescription>
            Récapitulatif des remboursements entre participants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg neon-border">
              <p className="text-sm text-muted-foreground">Montant total</p>
              <p className="text-2xl font-bold text-primary">{totalAmount}€</p>
            </div>
            <div className="p-4 rounded-lg neon-border">
              <p className="text-sm text-muted-foreground">Par personne</p>
              <p className="text-2xl font-bold text-secondary">{splitAmount}€</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Participants</h3>
            <div className="grid grid-cols-2 gap-2">
              {contributors.map((contributor) => (
                <div 
                  key={contributor.id}
                  className="flex items-center justify-between p-2 rounded-lg neon-border"
                >
                  <div>
                    <p className="font-medium">
                      {contributor.firstName} {contributor.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contributor.email}
                    </p>
                  </div>
                  {contributors.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover-destructive"
                      onClick={() => onRemoveContributor(contributor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Transactions</h3>
            <div className="rounded-lg neon-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>De</TableHead>
                    <TableHead>À</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculateTransactions().map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{transaction.from}</TableCell>
                      <TableCell>{transaction.to}</TableCell>
                      <TableCell className="text-right font-medium">
                        {transaction.amount.toFixed(2)}€
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => handleShare('email')}
            >
              <Mail className="w-4 h-4" />
              Envoyer par email
            </Button>
            <Button
              variant="secondary"
              className="flex-1 gap-2"
              onClick={() => handleShare('sms')}
            >
              <Smartphone className="w-4 h-4" />
              Partager par mobile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}