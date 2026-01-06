import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEventStore } from '@/store/eventStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Filter, Search, SortAsc, SortDesc } from 'lucide-react';

export function EventHistory() {
  const events = useEventStore((state) => state.events);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'date':
          return order * (new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        case 'amount':
          return order * (a.amount - b.amount);
        case 'participants':
          return order * (a.participants.length - b.participants.length);
        default:
          return 0;
      }
    });

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Événement', 'Montant', 'Participants', 'Statut'].join(','),
      ...filteredEvents.map(event => [
        format(new Date(event.startDate), 'dd/MM/yyyy'),
        event.title,
        event.amount.toFixed(2),
        event.participants.length,
        event.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_evenements_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold gradient-text">Historique des Événements</h2>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un événement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 neon-border"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={`gap-2 ${statusFilter === 'all' ? 'bg-primary/10' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <Filter className="w-4 h-4" />
            Tous
          </Button>
          <Button
            variant="outline"
            className={`gap-2 ${statusFilter === 'completed' ? 'bg-primary/10' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Terminés
          </Button>
          <Button
            variant="outline"
            className={`gap-2 ${statusFilter === 'pending' ? 'bg-primary/10' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            En cours
          </Button>
        </div>
      </div>

      <div className="rounded-lg neon-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Événement</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleSort('amount')}
                >
                  Montant
                  {sortField === 'amount' && (
                    sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleSort('participants')}
                >
                  Participants
                  {sortField === 'participants' && (
                    sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  {format(new Date(event.startDate), 'dd MMMM yyyy', { locale })}
                </TableCell>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>{event.amount.toFixed(2)}€</TableCell>
                <TableCell>{event.participants.length}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'completed'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}
                  >
                    {event.status === 'completed' ? 'Terminé' : 'En cours'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}