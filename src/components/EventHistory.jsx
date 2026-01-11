import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { useEventStore } from '@/store/eventStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { Download, Filter, Search, SortAsc, SortDesc, Calendar, FileText } from 'lucide-react';

export function EventHistory() {
  const { toast } = useToast();
  const events = useEventStore((state) => state.events);
  const getTransactionsByEvent = useTransactionsStore((state) => state.getTransactionsByEvent);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    console.log('[EventHistory] Component mounted');
    console.log('[EventHistory] Total events:', events.length);
    console.log('[EventHistory] Events:', events.map(e => ({ id: e.id, title: e.title, status: e.status })));
  }, []);

  useEffect(() => {
    const filtered = events
      .filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                             (event.description && event.description.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    
    console.log('[EventHistory] Filter changed:', { search, statusFilter, sortField, sortOrder });
    console.log('[EventHistory] Filtered events count:', filtered.length);
  }, [search, statusFilter, sortField, sortOrder, events]);

  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                           (event.description && event.description.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const result = matchesSearch && matchesStatus;
      
      if (!result) {
        console.log('[EventHistory] Event filtered out:', {
          id: event.id,
          title: event.title,
          matchesSearch,
          matchesStatus,
          status: event.status,
          statusFilter
        });
      }
      
      return result;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime();
          break;
        case 'amount':
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
        case 'participants':
          comparison = (a.participants?.length || 0) - (b.participants?.length || 0);
          break;
        default:
          comparison = 0;
      }
      
      console.log('[EventHistory] Sorting:', {
        field: sortField,
        order: sortOrder,
        a: { title: a.title, value: sortField === 'date' ? a.startDate : sortField === 'amount' ? a.amount : a.participants?.length },
        b: { title: b.title, value: sortField === 'date' ? b.startDate : sortField === 'amount' ? b.amount : b.participants?.length },
        comparison: order * comparison
      });
      
      return order * comparison;
    });

  const handleExport = async () => {
    console.log('[EventHistory] ===== PDF EXPORT STARTED =====');
    console.log('[EventHistory] Exporting events to PDF:', filteredEvents.length);
    
    if (filteredEvents.length === 0) {
      console.warn('[EventHistory] No events to export');
      toast({
        variant: "destructive",
        title: "Aucun événement",
        description: "Il n'y a aucun événement à exporter."
      });
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      console.log('[EventHistory] Creating PDF document...');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;
      
      console.log('[EventHistory] PDF page dimensions:', { pageWidth, pageHeight, margin });

      // En-tête
      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241); // Couleur primary (indigo)
      doc.text('Historique des Événements', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.text(`Filtres appliqués: ${statusFilter === 'all' ? 'Tous' : statusFilter === 'completed' ? 'Terminés' : 'Actifs'}${search ? ` | Recherche: "${search}"` : ''}`, margin, yPosition);
      yPosition += 10;

      // Ligne de séparation
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Tableau des événements
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // En-têtes du tableau
      const headers = ['Date', 'Événement', 'Montant', 'Participants', 'Statut'];
      const colWidths = [30, 70, 25, 25, 25];
      const colPositions = [margin];
      
      for (let i = 1; i < colWidths.length; i++) {
        colPositions.push(colPositions[i - 1] + colWidths[i - 1]);
      }

      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(99, 102, 241);
      headers.forEach((header, index) => {
        doc.text(header, colPositions[index], yPosition);
      });
      yPosition += 8;

      // Ligne sous les en-têtes
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
      yPosition += 5;

      // Données des événements
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      filteredEvents.forEach((event, index) => {
        console.log('[EventHistory] Adding event to PDF:', { index: index + 1, title: event.title });

        // Vérifier si on doit créer une nouvelle page
        if (yPosition > pageHeight - 40) {
          console.log('[EventHistory] New page needed, creating...');
          doc.addPage();
          yPosition = margin;
        }

        const eventDate = event.startDate || event.createdAt;
        const dateStr = eventDate ? format(new Date(eventDate), 'dd/MM/yyyy', { locale: fr }) : 'N/A';
        const title = (event.title || 'Sans titre').substring(0, 40);
        const amount = `${(event.amount || 0).toFixed(2)}€`;
        const participants = `${event.participants?.length || 0}`;
        const status = event.status === 'completed' ? 'Terminé' : event.status === 'active' ? 'Actif' : 'En attente';

        // Couleur du statut
        if (event.status === 'completed') {
          doc.setTextColor(16, 185, 129); // Vert
        } else if (event.status === 'active') {
          doc.setTextColor(59, 130, 246); // Bleu
        } else {
          doc.setTextColor(234, 179, 8); // Jaune
        }

        doc.text(dateStr, colPositions[0], yPosition);
        doc.setTextColor(0, 0, 0);
        doc.text(title, colPositions[1], yPosition);
        doc.text(amount, colPositions[2], yPosition);
        doc.text(participants, colPositions[3], yPosition);
        
        doc.setTextColor(event.status === 'completed' ? 16 : event.status === 'active' ? 59 : 234, 
                        event.status === 'completed' ? 185 : event.status === 'active' ? 130 : 179, 
                        event.status === 'completed' ? 129 : event.status === 'active' ? 246 : 8);
        doc.text(status, colPositions[4], yPosition);
        doc.setTextColor(0, 0, 0);

        // Code de l'événement en petit sous le titre
        if (event.code) {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`Code: ${event.code}`, colPositions[1], yPosition + 4);
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
        }

        yPosition += 12;

        // Ajouter les transactions de l'événement
        const eventTransactions = getTransactionsByEvent(event.id);
        if (eventTransactions && eventTransactions.length > 0) {
          console.log('[EventHistory] Adding transactions for event:', { eventId: event.id, count: eventTransactions.length });
          
          // Vérifier si on doit créer une nouvelle page
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.setFont(undefined, 'bold');
          doc.text('Transactions:', margin + 5, yPosition);
          yPosition += 6;

          doc.setFont(undefined, 'normal');
          eventTransactions.forEach((transaction, txIndex) => {
            // Vérifier si on doit créer une nouvelle page
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = margin;
            }

            const txDate = transaction.date ? format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr }) : 'N/A';
            const txStore = (transaction.store || 'Magasin inconnu').substring(0, 25);
            const txAmount = `${(transaction.amount || 0).toFixed(2)}${transaction.currency === 'USD' ? '$' : transaction.currency === 'GBP' ? '£' : '€'}`;
            const txTime = transaction.time || 'N/A';
            const txParticipants = transaction.participants?.length || 0;

            doc.setTextColor(80, 80, 80);
            doc.text(`  • ${txStore}`, margin + 5, yPosition);
            doc.text(`${txAmount}`, pageWidth - margin - 30, yPosition);
            yPosition += 5;
            
            doc.setFontSize(6);
            doc.setTextColor(120, 120, 120);
            doc.text(`    ${txDate} ${txTime} | ${txParticipants} participant(s)`, margin + 5, yPosition);
            doc.setFontSize(7);
            yPosition += 5;
          });

          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          yPosition += 3;
        }

        // Ligne de séparation entre les événements
        if (index < filteredEvents.length - 1) {
          doc.setDrawColor(240, 240, 240);
          doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
          yPosition += 3;
        }
      });

      // Résumé en bas de la dernière page
      yPosition += 10;
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text('Résumé', margin, yPosition);
      yPosition += 8;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      const totalAmount = filteredEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalParticipants = filteredEvents.reduce((sum, e) => sum + (e.participants?.length || 0), 0);
      const completedCount = filteredEvents.filter(e => e.status === 'completed').length;
      const activeCount = filteredEvents.filter(e => e.status === 'active').length;
      
      // Calculer le total des transactions
      const allTransactions = filteredEvents.flatMap(e => getTransactionsByEvent(e.id));
      const totalTransactionsAmount = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalTransactionsCount = allTransactions.length;

      doc.text(`Total d'événements: ${filteredEvents.length}`, margin, yPosition);
      yPosition += 7;
      doc.text(`Montant total: ${totalAmount.toFixed(2)}€`, margin, yPosition);
      yPosition += 7;
      doc.text(`Total participants: ${totalParticipants}`, margin, yPosition);
      yPosition += 7;
      doc.text(`Terminés: ${completedCount} | Actifs: ${activeCount}`, margin, yPosition);
      yPosition += 7;
      doc.text(`Total transactions: ${totalTransactionsCount} (${totalTransactionsAmount.toFixed(2)}€)`, margin, yPosition);

      // Numéro de page
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      }

      console.log('[EventHistory] PDF generated successfully, pages:', pageCount);
      
      // Sauvegarder le PDF
      const fileName = `historique_evenements_${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      console.log('[EventHistory] Saving PDF as:', fileName);
      doc.save(fileName);
      
      console.log('[EventHistory] ✅ PDF export completed successfully');
      toast({
        title: "Export PDF réussi",
        description: `${filteredEvents.length} événement(s) exporté(s) en PDF avec succès.`
      });
    } catch (error) {
      console.error('[EventHistory] ❌ PDF export error:', error);
      toast({
        variant: "destructive",
        title: "Erreur d'export PDF",
        description: "Une erreur est survenue lors de la génération du PDF."
      });
    } finally {
      setIsGeneratingPDF(false);
      console.log('[EventHistory] ===== PDF EXPORT END =====');
    }
  };

  const handleSort = (field) => {
    console.log('[EventHistory] Sort clicked:', field);
    
    if (sortField === field) {
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      console.log('[EventHistory] Toggling sort order:', { field, oldOrder: sortOrder, newOrder });
      setSortOrder(newOrder);
    } else {
      console.log('[EventHistory] Changing sort field:', { oldField: sortField, newField: field });
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold gradient-text">Historique des Événements</h2>
        <Button 
          onClick={handleExport} 
          className="gap-2 w-full sm:w-auto"
          disabled={filteredEvents.length === 0 || isGeneratingPDF}
        >
          <Download className="w-4 h-4" />
          <span className="text-xs sm:text-sm">
            {isGeneratingPDF ? 'Génération...' : 'Exporter en PDF'}
          </span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un événement..."
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              console.log('[EventHistory] Search input changed:', value);
              setSearch(value);
            }}
            className="pl-10 neon-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className={`gap-2 text-xs sm:text-sm ${statusFilter === 'all' ? 'bg-primary/10' : ''}`}
            onClick={() => {
              console.log('[EventHistory] Status filter changed: all');
              setStatusFilter('all');
            }}
          >
            <Filter className="w-4 h-4" />
            Tous
          </Button>
          <Button
            variant="outline"
            className={`gap-2 text-xs sm:text-sm ${statusFilter === 'completed' ? 'bg-primary/10' : ''}`}
            onClick={() => {
              console.log('[EventHistory] Status filter changed: completed');
              setStatusFilter('completed');
            }}
          >
            Terminés
          </Button>
          <Button
            variant="outline"
            className={`gap-2 text-xs sm:text-sm ${statusFilter === 'active' ? 'bg-primary/10' : ''}`}
            onClick={() => {
              console.log('[EventHistory] Status filter changed: active');
              setStatusFilter('active');
            }}
          >
            Actifs
          </Button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Aucun événement trouvé</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            {search || statusFilter !== 'all' 
              ? "Aucun événement ne correspond à vos critères de recherche."
              : "Vous n'avez pas encore créé d'événement."}
          </p>
        </Card>
      ) : (
        <div className="rounded-lg neon-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs sm:text-sm"
                      onClick={() => handleSort('date')}
                    >
                      Date
                      {sortField === 'date' && (
                        sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">Événement</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs sm:text-sm"
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
                      className="gap-2 text-xs sm:text-sm"
                      onClick={() => handleSort('participants')}
                    >
                      Participants
                      {sortField === 'participants' && (
                        sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  console.log('[EventHistory] Rendering event row:', { id: event.id, title: event.title });
                  const eventDate = event.startDate || event.createdAt;
                  return (
                    <TableRow key={event.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs sm:text-sm">
                        {eventDate ? format(new Date(eventDate), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span className="break-words">{event.title || 'Sans titre'}</span>
                          {event.code && (
                            <span className="text-xs text-muted-foreground font-mono">{event.code}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {(event.amount || 0).toFixed(2)}€
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {event.participants?.length || 0}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.status === 'completed'
                              ? 'bg-green-500/20 text-green-500'
                              : event.status === 'active'
                              ? 'bg-blue-500/20 text-blue-500'
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}
                        >
                          {event.status === 'completed' ? 'Terminé' : event.status === 'active' ? 'En cours' : 'En attente'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      <div className="text-center text-xs sm:text-sm text-muted-foreground">
        {filteredEvents.length > 0 && (
          <p>
            {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} affiché{filteredEvents.length > 1 ? 's' : ''}
            {events.length !== filteredEvents.length && ` sur ${events.length} total`}
          </p>
        )}
      </div>
    </div>
  );
}