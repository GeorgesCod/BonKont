import { useState } from 'react';
import { useEventStore } from '@/store/eventStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  MapPin, 
  Share2, 
  Users, 
  Star, 
  Calendar, 
  Euro,
  ExternalLink,
  Navigation,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Scan,
  AlertCircle
} from 'lucide-react';
import { EventLocation } from '@/components/EventLocation';
import { EventTicketScanner } from '@/components/EventTicketScanner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { computeBalances, computeTransfers, formatBalance } from '@/utils/bonkontBalances';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EventManagement({ eventId, onBack }) {
  console.log('[EventManagement] Component mounted:', { eventId, type: typeof eventId });
  
  const { toast } = useToast();
  const allEvents = useEventStore((state) => state.events);
  console.log('[EventManagement] All events:', allEvents.map(e => ({ id: e.id, title: e.title })));
  
  const event = allEvents.find(e => {
    const match = String(e.id) === String(eventId);
    if (match) console.log('[EventManagement] Event matched:', { eventId, foundId: e.id, title: e.title });
    return match;
  });
  
  const transactions = useTransactionsStore((state) => state.getTransactionsByEvent(eventId));
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerParticipantId, setScannerParticipantId] = useState(null);

  if (!event) {
    console.error('[EventManagement] Event not found:', { 
      eventId, 
      eventIdType: typeof eventId,
      availableEvents: allEvents.map(e => ({ id: e.id, idType: typeof e.id, title: e.title }))
    });
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground text-lg">Événement introuvable</p>
        <p className="text-sm text-muted-foreground">ID recherché: {String(eventId)}</p>
        <Button onClick={onBack} className="mt-4 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  console.log('[EventManagement] Event loaded:', {
    id: event.id,
    code: event.code,
    title: event.title,
    participantsCount: event.participants?.length || 0
  });

  // Liste des meilleurs spots (exemple - à adapter selon le lieu)
  const getSpotsForLocation = (location) => {
    const spotsByLocation = {
      'marrakech': [
        { name: 'Place Jemaa el-Fnaa', rating: 4.8, category: 'Culture', distance: '0.5 km' },
        { name: 'Palais de la Bahia', rating: 4.6, category: 'Histoire', distance: '1.2 km' },
        { name: 'Jardin Majorelle', rating: 4.7, category: 'Nature', distance: '2.5 km' },
        { name: 'Souk de Marrakech', rating: 4.5, category: 'Shopping', distance: '0.8 km' },
        { name: 'Mosquée Koutoubia', rating: 4.9, category: 'Architecture', distance: '1.0 km' }
      ],
      'essaouira': [
        { name: 'Médina d\'Essaouira', rating: 4.7, category: 'Culture', distance: '0.3 km' },
        { name: 'Port d\'Essaouira', rating: 4.6, category: 'Port', distance: '0.5 km' },
        { name: 'Plage d\'Essaouira', rating: 4.8, category: 'Plage', distance: '0.8 km' },
        { name: 'Skala de la Kasbah', rating: 4.5, category: 'Histoire', distance: '0.4 km' }
      ]
    };

     const normalizeText = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const getLocationText = (loc) => {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return loc.address || loc.displayName || '';
};

const locationLower = normalizeText(getLocationText(event.location));


    if (locationLower.includes('marrakech')) {
      return spotsByLocation.marrakech;
    } else if (locationLower.includes('essaouira')) {
      return spotsByLocation.essaouira;
    }
    
    // Spots par défaut
    return [
      { name: 'Point d\'intérêt 1', rating: 4.5, category: 'Général', distance: '1.0 km' },
      { name: 'Point d\'intérêt 2', rating: 4.3, category: 'Général', distance: '1.5 km' }
    ];
  };

  // Utiliser les points d'intérêt sauvegardés dans l'événement, sinon utiliser la fonction de fallback
  const locationPOI = event.location?.pointsOfInterest || [];
  const spots = locationPOI.length > 0 
    ? locationPOI.map(poi => ({
        name: poi.name,
        rating: poi.rating,
        category: poi.types?.[0] || 'Général',
        distance: poi.coordinates ? 'Proche' : 'N/A',
        totalReviews: poi.totalReviews || 0
      }))
    : getSpotsForLocation(event.location);
  const participants = Array.isArray(event.participants) ? event.participants : [];

  const handleShareLocation = () => {
    console.log('[EventManagement] Sharing location:', event.location);
    if (navigator.share && event.location) {
      navigator.share({
        title: `Lieu de l'événement: ${event.title}`,
        text: `Rejoignez-nous à: ${event.location}`,
        url: window.location.href
      }).catch(err => console.error('[EventManagement] Share error:', err));
    }
  };
const handleExportPDF = () => {
  console.log('[PDF] Exporting comprehensive event summary:', event.title);
  
  try {
    // Fonction helper pour obtenir le texte du lieu
    const getLocationText = (loc) => {
      if (!loc) return '';
      if (typeof loc === 'string') return loc;
      return loc.address || loc.displayName || '';
    };
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    
    // Fonction pour vérifier si nouvelle page nécessaire
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };
    
    // ===== EN-TÊTE =====
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241); // Couleur primary
    doc.setFont(undefined, 'bold');
    doc.text('BILAN ÉVÉNEMENTIEL', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, margin, yPosition);
    yPosition += 15;
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    // ===== INFORMATIONS GÉNÉRALES DE L'ÉVÉNEMENT =====
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Informations Générales', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    const infoLabels = [
      ['Nom de l\'événement:', event.title || 'N/A'],
      ['Code événement:', event.code || 'N/A'],
      ['Description:', event.description || 'Aucune description'],
      ['Lieu:', getLocationText(event.location) || 'Non spécifié'],
      ['Date de début:', event.startDate ? format(new Date(event.startDate), 'dd MMMM yyyy', { locale: fr }) : 'N/A'],
      ['Date limite:', event.deadline ? `${event.deadline} jours` : 'N/A'],
    ];
    
    infoLabels.forEach(([label, value]) => {
      checkNewPage(10);
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPosition);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + labelWidth + 5, yPosition);
      yPosition += 7;
    });
    
    yPosition += 5;
    
    // ===== BUDGET ET FINANCES =====
    checkNewPage(30);
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Budget et Finances', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    const totalBudget = event.amount || 0;
    const participantsCount = participants.length || 1;
    const montantParPersonne = totalBudget / participantsCount;
    
    // Calculer le total payé
    let totalPaye = 0;
    participants.forEach(p => {
      totalPaye += p.paidAmount || 0;
    });
    
    const resteAPayer = Math.max(0, totalBudget - totalPaye);
    const tauxCollecte = totalBudget > 0 ? (totalPaye / totalBudget * 100) : 0;
    
    // Calculer le délai restant
    let delaiRestant = 'N/A';
    if (event.startDate && event.deadline) {
      const startDate = new Date(event.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (event.deadline || 0));
      const today = new Date();
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        delaiRestant = `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      } else if (diffDays === 0) {
        delaiRestant = 'Aujourd\'hui';
      } else {
        delaiRestant = `Dépassé de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
      }
    }
    
    const financeLabels = [
      ['Budget total:', `${totalBudget.toFixed(2)} €`],
      ['Montant par personne:', `${montantParPersonne.toFixed(2)} €`],
      ['Total payé:', `${totalPaye.toFixed(2)} €`],
      ['Reste à payer:', `${resteAPayer.toFixed(2)} €`],
      ['Taux de collecte:', `${tauxCollecte.toFixed(1)}%`],
      ['Délai restant:', delaiRestant],
    ];
    
    financeLabels.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPosition);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + labelWidth + 5, yPosition);
      yPosition += 7;
    });
    
    yPosition += 10;
    
    // ===== TABLEAU DES PARTICIPANTS =====
    checkNewPage(40);
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Participants', margin, yPosition);
    yPosition += 10;
    
    const participantsTableData = participants.map((p) => {
      const stats = getParticipantStats(p);
      // Construire le nom du participant avec toutes les options possibles
      let participantName = 'Participant inconnu';
      if (p.name) {
        participantName = p.name;
      } else if (p.firstName && p.lastName) {
        participantName = `${p.firstName} ${p.lastName}`.trim();
      } else if (p.firstName) {
        participantName = p.firstName;
      } else if (p.lastName) {
        participantName = p.lastName;
      } else if (p.email) {
        participantName = p.email;
      } else if (p.mobile) {
        participantName = p.mobile;
      }
      return [
        participantName,
        `${stats.totalDue.toFixed(2)} €`,
        `${stats.paid.toFixed(2)} €`,
        `${stats.remaining.toFixed(2)} €`,
        stats.hasPaid ? 'Oui' : 'Non',
        `${stats.score}%`,
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Participant', 'Dû', 'Payé', 'Reste', 'Payé?', 'Score']],
      body: participantsTableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: margin, right: margin },
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
    
    // ===== DÉTAIL DES TRANSACTIONS PAR PARTICIPANT =====
    if (transactions && transactions.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Détail des Transactions', margin, yPosition);
      yPosition += 10;
      
      // Grouper les transactions par participant
      const transactionsByParticipant = {};
      transactions.forEach(transaction => {
        if (transaction.participants && transaction.participants.length > 0) {
          transaction.participants.forEach(participantId => {
            if (!transactionsByParticipant[participantId]) {
              transactionsByParticipant[participantId] = [];
            }
            transactionsByParticipant[participantId].push(transaction);
          });
        }
      });
      
      // Pour chaque participant avec des transactions
      Object.keys(transactionsByParticipant).forEach(participantId => {
        // Chercher le participant avec comparaison flexible des IDs (string/number)
        const participant = participants.find(p => 
          String(p.id) === String(participantId) || 
          p.id === participantId ||
          String(p.id) === participantId ||
          p.id === String(participantId)
        );
        
        // Construire le nom du participant avec toutes les options possibles
        let participantName = 'Participant inconnu';
        if (participant) {
          if (participant.name) {
            participantName = participant.name;
          } else if (participant.firstName && participant.lastName) {
            participantName = `${participant.firstName} ${participant.lastName}`.trim();
          } else if (participant.firstName) {
            participantName = participant.firstName;
          } else if (participant.lastName) {
            participantName = participant.lastName;
          } else if (participant.email) {
            participantName = participant.email;
          } else if (participant.mobile) {
            participantName = participant.mobile;
          }
        }
        
        console.log('[EventManagement PDF] Participant found:', {
          participantId,
          participant,
          participantName,
          participantIds: participants.map(p => ({ id: p.id, name: p.name, type: typeof p.id }))
        });
        
        const participantTransactions = transactionsByParticipant[participantId];
        
        checkNewPage(30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text(`${participantName}`, margin, yPosition);
        yPosition += 8;
        
        const transactionsTableData = participantTransactions.map(t => {
          const date = t.date ? format(new Date(t.date), 'dd/MM/yyyy', { locale: fr }) : 'N/A';
          const time = t.time || '';
          const store = t.store || 'N/A';
          const amount = `${(t.amount || 0).toFixed(2)} €`;
          const currency = t.currency || 'EUR';
          return [date, time, store, amount, currency];
        });
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Date', 'Heure', 'Magasin', 'Montant', 'Devise']],
          body: transactionsTableData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          margin: { left: margin, right: margin },
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
      });
    } else {
      checkNewPage(10);
      doc.setFontSize(11);
      doc.setTextColor(150, 150, 150);
      doc.text('Aucune transaction enregistrée', margin, yPosition);
      yPosition += 10;
    }
    
    // ===== RÉPARTITION PROVISOIRE (QUI DOIT À QUI) =====
    checkNewPage(40);
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Répartition Provisoire', margin, yPosition);
    yPosition += 5;
    
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, 'italic');
    doc.text('Basée sur les transactions validées à ce jour', margin, yPosition);
    yPosition += 10;
    
    // Calculer les soldes
    const balances = computeBalances(event, transactions);
    const transfers = computeTransfers(balances);
    
    // Afficher les soldes par participant
    doc.setFontSize(12);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Soldes par participant', margin, yPosition);
    yPosition += 8;
    
    const balancesTableData = Object.values(balances).map(balance => {
      const formatted = formatBalance(balance);
      const soldeText = formatted.status === 'doit_recevoir' 
        ? `+${balance.soldeFinal.toFixed(2)} € (à recevoir)`
        : formatted.status === 'doit_verser'
          ? `${balance.soldeFinal.toFixed(2)} € (à verser)`
          : '0,00 € (équilibré)';
      
      return [
        balance.participantName,
        `${balance.avance.toFixed(2)} €`,
        `${balance.consomme.toFixed(2)} €`,
        soldeText
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Participant', 'Avancé', 'Consommé', 'Solde provisoire']],
      body: balancesTableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: margin, right: margin },
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
    
    // Afficher les transferts "qui verse à qui"
    if (transfers.length > 0) {
      checkNewPage(30);
      doc.setFontSize(12);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Transferts recommandés', margin, yPosition);
      yPosition += 8;
      
      const transfersTableData = transfers.map(t => [
        t.fromName,
        t.toName,
        `${t.amount.toFixed(2)} €`
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['De', 'Vers', 'Montant']],
        body: transfersTableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
      });
      
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      checkNewPage(10);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.setFont(undefined, 'normal');
      doc.text('Aucun transfert nécessaire (tous les comptes sont équilibrés)', margin, yPosition);
      yPosition += 10;
    }
    
    // ===== BILAN FINAL =====
    checkNewPage(40);
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.setFont(undefined, 'bold');
    doc.text('Bilan Événementiel', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    const participantsPayes = participants.filter(p => (p.paidAmount || 0) >= montantParPersonne).length;
    const participantsEnRetard = participants.filter(p => {
      const stats = getParticipantStats(p);
      return stats.remaining > 0;
    }).length;
    
    const bilanLabels = [
      ['Nombre de participants:', `${participantsCount}`],
      ['Participants à jour:', `${participantsPayes}`],
      ['Participants en retard:', `${participantsEnRetard}`],
      ['Nombre de transactions:', `${transactions?.length || 0}`],
      ['Budget total:', `${totalBudget.toFixed(2)} €`],
      ['Montant collecté:', `${totalPaye.toFixed(2)} €`],
      ['Montant restant:', `${resteAPayer.toFixed(2)} €`],
      ['Taux de collecte:', `${tauxCollecte.toFixed(1)}%`],
    ];
    
    bilanLabels.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPosition);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + labelWidth + 5, yPosition);
      yPosition += 7;
    });
    
    // Numéro de page
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      doc.text(`BONKONT - ${event.code}`, margin, pageHeight - 10);
    }
    
    // Télécharger le PDF et l'ouvrir dans un nouvel onglet
    const fileName = `BONKONT-${event.code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    // Créer un blob URL pour ouvrir le PDF
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Ouvrir le PDF dans un nouvel onglet
    const newWindow = window.open(pdfUrl, '_blank');
    if (newWindow) {
      newWindow.focus();
    }
    
    // Télécharger le PDF
    doc.save(fileName);
    
    // Nettoyer le blob URL après un délai
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
    
    console.log('[PDF] ✅ Export completed successfully, downloaded and opened:', fileName);
    toast({
      title: "✅ PDF généré avec succès",
      description: `Le bilan événementiel a été téléchargé et ouvert.`
    });
  } catch (error) {
    console.error('[PDF] ❌ Export error:', error);
    toast({
      variant: "destructive",
      title: "Erreur d'export PDF",
      description: "Une erreur est survenue lors de la génération du PDF. Veuillez réessayer."
    });
  }
};

  const getParticipantStats = (participant) => {
    const totalDue = event.amount / participants.length;
    const paid = participant.paidAmount || 0;
    const remaining = Math.max(0, totalDue - paid);
    const paymentProgress = totalDue > 0 ? (paid / totalDue) * 100 : 0;
    const hasPaid = paid >= totalDue - 0.01;
    
    // Calculer le score en temps réel en fonction de l'état actuel de la participation
    let score = 0;
    
    if (hasPaid && participant.paidDate) {
      // Score basé sur la ponctualité du paiement
      const eventStartDate = new Date(event.startDate);
      const paymentDate = new Date(participant.paidDate);
      const paymentDelay = Math.floor(
        (paymentDate.getTime() - eventStartDate.getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      
      // Score initial de 100, moins 5 points par jour de retard
      score = Math.max(0, 100 - (paymentDelay * 5));
      
      // Bonus si le paiement est fait avant la date de début de l'événement
      if (paymentDate < eventStartDate) {
        score = Math.min(100, score + 10); // Bonus de 10 points pour paiement anticipé
      }
    } else if (hasPaid && !participant.paidDate) {
      // Si payé mais pas de date, score de base de 70
      score = 70;
    } else {
      // Pas encore payé, score basé sur le pourcentage payé
      const paymentPercentage = totalDue > 0 ? (paid / totalDue) * 100 : 0;
      score = Math.floor(paymentPercentage * 0.5); // Score proportionnel jusqu'à 50 points max
    }
    
    return {
      totalDue,
      paid,
      remaining,
      paymentProgress,
      hasPaid,
      score: Math.round(score),
      paymentRank: participant.paymentRank || null
    };
  };

  return (
    <div className="space-y-6">
      {/* Bouton retour au tableau de bord */}
      <Button 
        variant="outline" 
        onClick={onBack} 
        className="gap-2 min-h-[44px] w-full sm:w-auto touch-manipulation"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au tableau de bord
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text truncate">{event.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">{event.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
  <Badge
    variant="outline"
    className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2"
  >
    Code: {event.code}
  </Badge>

  <Button
    variant="outline"
    className="gap-2"
    onClick={handleExportPDF}
  >
    📄 Export PDF
  </Button>
</div>

      </div>

      {/* Localisation */}
      <Card className="p-6 neon-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Localisation
          </h2>
          <Button variant="outline" size="sm" onClick={handleShareLocation} className="gap-2">
            <Share2 className="w-4 h-4" />
            Partager le lieu
          </Button>
        </div>
        
        {event.location && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-medium mb-2">
                {typeof event.location === 'string' 
                  ? event.location 
                  : event.location.address || event.location.displayName || 'Localisation'}
              </p>
              <EventLocation initialLocation={event.location} />
            </div>
          </div>
        )}
      </Card>

      {/* Meilleurs spots à visiter */}
      <Card className="p-6 neon-border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" />
          Meilleurs spots à visiter
        </h2>
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-4">
            {spots.map((spot, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  console.log('[EventManagement] Spot clicked:', spot);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name)}`, '_blank');
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{spot.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {spot.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{spot.rating}</span>
                      </div>
                      {spot.totalReviews >= 2 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">({spot.totalReviews} avis)</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Navigation className="w-4 h-4" />
                        <span>{spot.distance}</span>
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Ajustements provisoires - Qui verse à qui */}
      {(() => {
        const balances = computeBalances(event, transactions);
        const transfers = computeTransfers(balances);
        
        return (
          <Card className="p-6 neon-border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                Ajustements à effectuer (provisoire)
              </h2>
              <Badge variant="outline" className="text-sm border-orange-300 dark:border-orange-700">
                {transfers.length} transfert{transfers.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="mb-3 p-3 rounded-lg bg-orange-100/50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Cette liste est mise à jour en temps réel selon les transactions validées. 
                  Les ajustements peuvent être effectués progressivement pendant l'événement.
                </p>
              </div>
            </div>
            
            {transfers.length > 0 ? (
              <div className="space-y-3">
                {transfers.map((transfer, index) => (
                  <Card key={index} className="p-4 border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/50 flex-shrink-0">
                          <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-lg text-destructive">{transfer.fromName}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-semibold text-lg text-green-600 dark:text-green-400">{transfer.toName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Ajustement #{index + 1} sur {transfers.length}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-lg px-4 py-2 flex-shrink-0 bg-orange-600 hover:bg-orange-700">
                        {transfer.amount.toFixed(2)}€
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">
                  ✅ Tout est équilibré
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aucun ajustement financier n'est nécessaire. La liste sera mise à jour automatiquement dès qu'une transaction créera un déséquilibre.
                </p>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Liste des participants */}
      <Card className="p-6 neon-border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Participants ({participants.length})
        </h2>
        <ScrollArea className="h-96">
          <div className="space-y-3 pr-4">
            {participants.map((participant) => {
              const stats = getParticipantStats(participant);
              
              return (
                <div
                  key={participant.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{participant.name}</h3>
                      <p className="text-sm text-muted-foreground">{participant.email}</p>
                    </div>
                    {stats.hasPaid && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Payé
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('[EventManagement] Scanner button clicked for participant:', {
                          participantId: participant.id,
                          participantName: participant.name,
                          eventId
                        });
                        setScannerParticipantId(participant.id);
                        setIsScannerOpen(true);
                      }}
                    >
                      <Scan className="w-4 h-4" />
                      Scanner un ticket
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('[EventManagement] Participant clicked:', {
                          id: participant.id,
                          name: participant.name,
                          stats
                        });
                        setSelectedParticipant(participant);
                      }}
                    >
                      Voir détails
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Montant dû</p>
                      <p className="font-semibold">{stats.totalDue.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payé</p>
                      <p className="font-semibold text-green-500">{stats.paid.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reste à payer</p>
                      <p className="font-semibold text-destructive">{stats.remaining.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-semibold flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {stats.score}/100
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progression du paiement</span>
                      <span>{stats.paymentProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${stats.paymentProgress}%` }}
                      />
                    </div>
                  </div>

                  {stats.paymentRank && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Classement: {stats.paymentRank}ème participant à avoir payé
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Scanner de ticket */}
      <EventTicketScanner
        eventId={eventId}
        participantId={scannerParticipantId}
        isOpen={isScannerOpen}
        onClose={() => {
          console.log('[EventManagement] Closing scanner');
          setIsScannerOpen(false);
          setScannerParticipantId(null);
        }}
        onPaymentProcessed={() => {
          console.log('[EventManagement] Payment processed, refreshing view');
          // Le store se met à jour automatiquement, pas besoin de refresh manuel
        }}
      />

      {/* Dialog pour les détails du participant */}
      <Dialog open={selectedParticipant !== null} onOpenChange={() => setSelectedParticipant(null)}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Profil du participant</DialogTitle>
          </DialogHeader>
          {selectedParticipant && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedParticipant.name}</h3>
                <p className="text-muted-foreground">{selectedParticipant.email}</p>
              </div>
              
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  console.log('[EventManagement] Opening scanner from participant dialog');
                  setSelectedParticipant(null);
                  setScannerParticipantId(selectedParticipant.id);
                  setIsScannerOpen(true);
                }}
              >
                <Scan className="w-4 h-4" />
                Scanner un ticket pour ce participant
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Participations</p>
                  <p className="text-2xl font-bold">{participants.length}</p>
                  <p className="text-xs text-muted-foreground">événements</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Score</p>
                  <p className="text-2xl font-bold">{getParticipantStats(selectedParticipant).score}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Notes et évaluations</h4>
                <div className="p-4 rounded-lg border border-border bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    {selectedParticipant.hasPaid 
                      ? 'Participant fiable et ponctuel dans ses paiements.'
                      : 'En attente de paiement.'}
                  </p>
                  {getParticipantStats(selectedParticipant).paymentRank && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Classé {getParticipantStats(selectedParticipant).paymentRank}ème pour la ponctualité
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Détails financiers</h4>
                
                {(() => {
                  const stats = getParticipantStats(selectedParticipant);
                  
                  // Calculer les soldes Bonkont
                  const balances = computeBalances(event, transactions);
                  const participantBalance = balances[selectedParticipant.id] || {
                    avance: 0,
                    consomme: 0,
                    soldeDepenses: 0,
                    verse: 0,
                    recu: 0,
                    soldePaiements: 0,
                    soldeFinal: 0
                  };
                  
                  // Part cible (budget)
                  const partCible = event.amount / event.participants.length;
                  
                  // Contributions (paiements validés)
                  // Pour l'instant, on utilise paidAmount comme approximation des contributions
                  // TODO: Créer des transactions de type "payment" avec fromId/toId lors des paiements CB/espèces
                  const paiements = transactions.filter(t => 
                    (t.source === 'payment' || t.type === 'payment' || (t.fromId && t.toId)) &&
                    (t.fromId === selectedParticipant.id || String(t.fromId) === String(selectedParticipant.id))
                  );
                  const contributionsFromTransactions = paiements.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                  
                  // Si pas de transactions de paiement, utiliser paidAmount comme approximation
                  // paidAmount inclut les paiements CB/espèces validés
                  const contributions = contributionsFromTransactions > 0 
                    ? contributionsFromTransactions 
                    : (selectedParticipant.paidAmount || 0);
                  
                  // Solde provisoire (répartition)
                  const soldeProvisoire = participantBalance.soldeFinal;
                  
                  return (
                    <>
                      {/* Bloc 1: Budget (repère) */}
                      <div className="p-4 rounded-lg border border-border bg-primary/5">
                        <h5 className="font-semibold text-sm mb-2 text-primary">Budget (repère)</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Part cible</span>
                            <span className="font-semibold text-lg">{partCible.toFixed(2)}€</span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            Budget total / Nombre de participants
                          </p>
                        </div>
                      </div>
                      
                      {/* Bloc 2: Contributions (paiements) */}
                      <div className="p-4 rounded-lg border border-border bg-green-50 dark:bg-green-950/20">
                        <h5 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">Contributions (paiements)</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total versé</span>
                            <span className="font-semibold text-lg text-green-600 dark:text-green-400">
                              {contributions.toFixed(2)}€
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            Paiements validés (CB/espèces) enregistrés
                          </p>
                          {contributions > 0 && (
                            <div className="mt-2 text-xs">
                              <span className="text-muted-foreground">Détail: </span>
                              <span>{paiements.length} paiement(s) enregistré(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Bloc 3: Répartition (provisoire) */}
                      <div className={`p-4 rounded-lg border ${
                        soldeProvisoire > 0.01 
                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' 
                          : soldeProvisoire < -0.01
                            ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20'
                            : 'border-gray-300 bg-gray-50 dark:bg-gray-950/20'
                      }`}>
                        <h5 className="font-semibold text-sm mb-2 text-blue-700 dark:text-blue-400">Répartition (provisoire)</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Solde provisoire</span>
                            <span className={`font-semibold text-lg ${
                              soldeProvisoire > 0.01 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : soldeProvisoire < -0.01
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {soldeProvisoire >= 0 ? '+' : ''}{soldeProvisoire.toFixed(2)}€
                              {soldeProvisoire > 0.01 && ' (à recevoir)'}
                              {soldeProvisoire < -0.01 && ' (à verser)'}
                              {Math.abs(soldeProvisoire) < 0.01 && ' (équilibré)'}
                            </span>
                          </div>
                          <div className="mt-3 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avancé:</span>
                              <span className="font-medium">{participantBalance.avance.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Consommé:</span>
                              <span className="font-medium">{participantBalance.consomme.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 mt-1">
                              <span className="text-muted-foreground">Solde dépenses:</span>
                              <span className="font-medium">
                                {participantBalance.soldeDepenses >= 0 ? '+' : ''}
                                {participantBalance.soldeDepenses.toFixed(2)}€
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Versé:</span>
                              <span className="font-medium">{participantBalance.verse.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reçu:</span>
                              <span className="font-medium">{participantBalance.recu.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 mt-1">
                              <span className="text-muted-foreground">Solde paiements:</span>
                              <span className="font-medium">
                                {participantBalance.soldePaiements >= 0 ? '+' : ''}
                                {participantBalance.soldePaiements.toFixed(2)}€
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground italic mt-2">
                            Basé sur dépenses validées + paiements enregistrés
                          </p>
                        </div>
                      </div>
                      
                      {/* Ancien affichage (conservé pour référence) */}
                      <div className="p-3 rounded border border-border bg-muted/30">
                        <h5 className="font-semibold text-sm mb-2 text-muted-foreground">Ancien affichage (référence)</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Montant total dû</span>
                            <span className="font-semibold">{stats.totalDue.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Montant payé</span>
                            <span className="font-semibold text-green-500">{stats.paid.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reste à payer</span>
                            <span className="font-semibold text-destructive">{stats.remaining.toFixed(2)}€</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

