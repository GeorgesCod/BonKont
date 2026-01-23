import { useState, useEffect } from 'react';
import { useEventStore } from '@/store/eventStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  Users,
  Euro,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Lock,
  CheckCircle,
  Clock,
  UserCheck,
  Star,
  Heart,
  MessageSquare,
  Smile,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { computeBalances, computeTransfers, formatBalance, getParticipantTransfers, getExpenseTraceability } from '@/utils/bonkontBalances';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function EventClosure({ eventId, onBack }) {
  console.log('[EventClosure] Component mounted:', { eventId });
  
  const { toast } = useToast();
  const allEvents = useEventStore((state) => state.events);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const addRating = useEventStore((state) => state.addRating);
  const event = allEvents.find(e => String(e.id) === String(eventId));
  const transactions = useTransactionsStore((state) => state.getTransactionsByEvent(eventId));
  const addTransaction = useTransactionsStore((state) => state.addTransaction);
  
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [isValidated, setIsValidated] = useState(event?.closureValidated || false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [currentReview, setCurrentReview] = useState('');
  const [ratingParticipantId, setRatingParticipantId] = useState(null);
  const [accordionValue, setAccordionValue] = useState(['closure', 'final-balances']); // Par défaut, Clôture et Soldes finaux ouverts
  const [showHelpIncompleteDistribution, setShowHelpIncompleteDistribution] = useState(false);
  
  // Calculer la date de fin de l'événement (startDate + deadline jours)
  // Puis H+48 (fin + 48 heures)
  const calculateClosureDeadline = () => {
    if (!event?.startDate || !event?.deadline) return null;
    const startDate = new Date(event.startDate);
    const endDate = new Date(startDate.getTime() + (event.deadline * 24 * 60 * 60 * 1000));
    const closureDeadline = new Date(endDate.getTime() + (48 * 60 * 60 * 1000)); // H+48
    return closureDeadline;
  };
  
  // Calculer le temps restant jusqu'à H+48
  useEffect(() => {
    const closureDeadline = calculateClosureDeadline();
    if (!closureDeadline) return;
    
    const updateTimer = () => {
      const now = new Date();
      const diff = closureDeadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({ hours, minutes, seconds, total: diff });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [event?.startDate, event?.deadline]);
  
  // Signatures des participants
  const closureSignatures = event?.closureSignatures || {};
  const participants = Array.isArray(event.participants) ? event.participants : [];
  const signedCount = Object.keys(closureSignatures).length;
  const allSigned = signedCount === participants.length && participants.length > 0;
  const closureDeadline = calculateClosureDeadline();
  const canValidate = allSigned && closureDeadline && new Date() >= closureDeadline;
  
  // Fonction pour signer
  const handleSign = (participantId) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const newSignatures = {
      ...closureSignatures,
      [participantId]: {
        signedAt: new Date(),
        participantName: participant.name || participant.firstName || participant.email
      }
    };
    
    updateEvent(eventId, {
      closureSignatures: newSignatures
    });
    
    toast({
      title: "🎉 Merci !",
      description: `Votre signature a été enregistrée. On avance ensemble !`,
    });
  };
  
  if (!event) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <Card className="p-6">
          <p className="text-muted-foreground">Événement introuvable</p>
        </Card>
      </div>
    );
  }
  
  const balancesResult = computeBalances(event, transactions);
  const { balances, potBalance } = balancesResult;
  const transfersResult = computeTransfers(balancesResult);
  const transfers = transfersResult.transfers || [];
  const potTransfers = transfersResult.potTransfers || [];
  
  const handleExportClosurePDF = () => {
    console.log('[EventClosure] Exporting closure PDF:', event.title);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;
      
      const checkNewPage = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - margin - 15) { // Réserver 15px pour le footer
          doc.addPage();
          yPosition = margin + 10; // Espacement en haut de page
          return true;
        }
        return false;
      };
      
      // Fonction pour ajouter le footer sur chaque page
      const addFooter = () => {
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.setFont(undefined, 'normal');
          
          // Numéro de page
          doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin - 20, pageHeight - 8);
          
        // Tagline Bonkont centré en bas
        const tagline = 'Bonkont fait les comptes, les Amis font le reste';
        const taglineWidth = doc.getTextWidth(tagline);
        doc.text(tagline, (pageWidth - taglineWidth) / 2, pageHeight - 8);
          
          // Code événement à gauche
          doc.text(`BONKONT - ${event.code}`, margin, pageHeight - 8);
          
          // Ligne de séparation fine
          doc.setDrawColor(220, 220, 220);
          doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        }
      };
      
      // ===== EN-TÊTE =====
      doc.setFontSize(24);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Clôture Évènementielle', margin, yPosition);
      yPosition += 12;
      
      // Badge "FIGÉ / SIGNÉ"
      if (isValidated) {
        doc.setFillColor(34, 197, 94); // Vert
        doc.roundedRect(margin, yPosition, 50, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('🟢 CLÔTURE VALIDÉE ET FIGÉE', margin + 2, yPosition + 6);
        yPosition += 12;
      }
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.text(`Événement: ${event.title}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Code: ${event.code}`, margin, yPosition);
      yPosition += 6;
      
      if (event.closureDate) {
        doc.text(`Date de clôture: ${format(new Date(event.closureDate), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, margin, yPosition);
      } else {
        doc.text(`Date de clôture: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, margin, yPosition);
      }
      yPosition += 10;
      
      // ===== SIGNATURES DE VALIDATION =====
      if (isValidated && event.closureValidatedBy) {
        checkNewPage(25);
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
        doc.text('Validations collectives', margin, yPosition);
        yPosition += 8;
        
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'italic');
        doc.text('Cet événement a été validé et clôturé par tous les participants :', margin, yPosition);
        yPosition += 8;
        
        const signatures = Object.values(event.closureValidatedBy);
        signatures.forEach((sig, idx) => {
          checkNewPage(8);
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
          doc.text(`✓ ${sig.participantName}`, margin + 5, yPosition);
          if (sig.signedAt) {
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(`   (${format(new Date(sig.signedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })})`, margin + 5, yPosition + 4);
            yPosition += 8;
          } else {
            yPosition += 6;
          }
        });
        yPosition += 5;
      }
      
      // ===== NOTE IMPORTANTE SUR L'ÉQUILIBRE =====
      if (transfersResult.isBalanced) {
        checkNewPage(15);
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94); // Vert
        doc.setFont(undefined, 'bold');
        doc.text('[EQUILIBRE] Répartition équilibrée', margin, yPosition);
        yPosition += 5;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'normal');
        doc.text('La somme des soldes finaux est égale à 0€. Toutes les dépenses et transferts', margin, yPosition);
        yPosition += 4;
        doc.text('entre participants sont correctement répartis.', margin, yPosition);
        yPosition += 8;
      } else {
        checkNewPage(15);
        doc.setFontSize(9);
        doc.setTextColor(239, 68, 68); // Rouge
        doc.setFont(undefined, 'bold');
        doc.text('[NOTE] Calculs et équilibrage', margin, yPosition);
        yPosition += 5;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'normal');
        doc.text('Les paiements vers la cagnotte (contributions au budget) ne sont pas inclus', margin, yPosition);
        yPosition += 4;
        doc.text('dans le calcul des soldes finaux. Seuls les transferts entre participants', margin, yPosition);
        yPosition += 4;
        doc.text('et les dépenses réelles affectent les soldes finaux.', margin, yPosition);
        yPosition += 8;
      }
      
      // ===== RÉPARTITION FINALE =====
      checkNewPage(40);
      doc.setFontSize(16);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Répartition Finale', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, 'italic');
      doc.text('Basée sur toutes les transactions validées', margin, yPosition);
      yPosition += 10;
      
      // Soldes par participant
      doc.setFontSize(12);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Soldes finaux par participant', margin, yPosition);
      yPosition += 8;
      
      const balancesTableData = Object.values(balances).map(balance => {
        const formatted = formatBalance(balance);
        const solde = balance.solde || 0;
        const soldeText = formatted.status === 'doit_recevoir' 
          ? `+${solde.toFixed(2)} € (à recevoir)`
          : formatted.status === 'doit_verser'
            ? `${solde.toFixed(2)} € (à verser)`
            : '0,00 € (équilibré)';
        
        return [
          balance.participantName,
          `${(balance.contribution || 0).toFixed(2)} €`,
          `${(balance.avance || 0).toFixed(2)} €`,
          `${(balance.consomme || 0).toFixed(2)} €`,
          `${(balance.mise || 0).toFixed(2)} €`,
          soldeText
        ];
      });
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Participant', 'Contribution', 'Avancé', 'Consommé', 'Mise', 'Solde']],
        body: balancesTableData,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 10;
      
      // Afficher un avertissement si répartition incomplète
      if (transfersResult.warning) {
        checkNewPage(30);
        doc.setFontSize(11);
        doc.setTextColor(239, 68, 68); // Rouge
        doc.setFont(undefined, 'bold');
        doc.text('[ATTENTION] Répartition incomplète', margin, yPosition);
        yPosition += 6;
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'normal');
        const warningLines = doc.splitTextToSize(transfersResult.warning, pageWidth - 2 * margin);
        warningLines.forEach((line, idx) => {
          checkNewPage(5);
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
        
        // Message informatif sur les contributions réelles vs théoriques
        if (transfersResult.warning && transfersResult.warning.includes('contribution réelle')) {
          checkNewPage(15);
          yPosition += 5;
          doc.setFontSize(10);
          doc.setTextColor(59, 130, 246); // Bleu
          doc.setFont(undefined, 'bold');
          doc.text('[INFORMATION IMPORTANTE]', margin, yPosition);
          yPosition += 6;
          doc.setFontSize(9);
          doc.setTextColor(59, 130, 246);
          doc.setFont(undefined, 'normal');
          const infoText = `Le budget théorique fixé au départ est UNIQUEMENT un repère indicatif à ne pas dépasser. ` +
                          `Seules les contributions RÉELLES (paiements en espèces, virements, etc.) doivent être enregistrées et prises en compte. ` +
                          `Un déséquilibre temporaire est normal tant que les contributions réelles n'ont pas encore été enregistrées.`;
          const infoLines = doc.splitTextToSize(infoText, pageWidth - 2 * margin);
          infoLines.forEach((line, idx) => {
            checkNewPage(5);
            doc.text(line, margin, yPosition);
            yPosition += 5;
          });
        }
        
        if (balancesResult.totalSolde && Math.abs(balancesResult.totalSolde) > 0.01) {
          checkNewPage(8);
          yPosition += 2;
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.setFont(undefined, 'italic');
          doc.text(`Écart détecté : ${balancesResult.totalSolde.toFixed(2)}€`, margin, yPosition);
          yPosition += 5;
        }
        checkNewPage(10);
        yPosition += 5;
      }
      
      // ===== LA RÈGLE BONKONT =====
      checkNewPage(35);
      doc.setFontSize(16);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('La Règle Bonkont', margin, yPosition);
      yPosition += 8;
      
      // Phrase principale
      doc.setFontSize(11);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      const ruleText = '"Tu Valides, Tu consommes, Tu reçois ou Tu verses, Tu es Quittes"';
      const ruleLines = doc.splitTextToSize(ruleText, pageWidth - 2 * margin);
      ruleLines.forEach((line, idx) => {
        checkNewPage(6);
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'italic');
      checkNewPage(5);
      doc.text('C\'est Transparent, c\'est Equitable, c\'est Bonkont', margin, yPosition);
      yPosition += 8;
      
      // Explication de la double règle
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const explicationText1 = 'La règle Bonkont s\'applique à TOUTES les transactions validées :';
      const explicationLines1 = doc.splitTextToSize(explicationText1, pageWidth - 2 * margin);
      explicationLines1.forEach((line, idx) => {
        checkNewPage(5);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      checkNewPage(15);
      yPosition += 3;
      
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const typesText = '• Contributions au POT : Validées ET partagées équitablement (tous les participants concernés consomment leur part)\n• Dépenses/Avances : Validées ET partagées équitablement\n• Transferts directs : Validés pour traçabilité (paiement direct)\n• Remboursements POT : Validés pour traçabilité (remboursement direct)';
      const typesLines = doc.splitTextToSize(typesText, pageWidth - 2 * margin - 5);
      typesLines.forEach((line, idx) => {
        checkNewPage(5);
        doc.text(line, margin + 10, yPosition);
        yPosition += 5;
      });
      checkNewPage(10);
      yPosition += 3;
      
      doc.setFontSize(9);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('1. La Validation :', margin + 5, yPosition);
      yPosition += 5;
      
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const validationText = 'La validation de TOUTE transaction déclenche la règle Bonkont. Pour les dépenses/avances : seuls les participants qui valident sont concernés par la répartition équitable. La validation (complète ou partielle) détermine qui consomme et qui doit rembourser.';
      const validationLines = doc.splitTextToSize(validationText, pageWidth - 2 * margin - 5);
      validationLines.forEach((line, idx) => {
        checkNewPage(5);
        doc.text(line, margin + 10, yPosition);
        yPosition += 5;
      });
      checkNewPage(10);
      yPosition += 3;
      
      doc.setFontSize(9);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('2. Le Calcul Équitable :', margin + 5, yPosition);
      yPosition += 5;
      
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      const calculText = 'Toute avance étant validée par les participants, le payeur consomme au prorata sa part, et les autres participants concernés consomment aussi au prorata leur part. C\'est la logique de calcul équitable : chacun consomme sa part, le payeur reçoit le remboursement des autres.';
      const calculLines = doc.splitTextToSize(calculText, pageWidth - 2 * margin - 5);
      calculLines.forEach((line, idx) => {
        checkNewPage(5);
        doc.text(line, margin + 10, yPosition);
        yPosition += 5;
      });
      checkNewPage(15);
      yPosition += 5;
      
      // Exemple concret
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Exemple concret :', margin, yPosition);
      yPosition += 6;
      
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      checkNewPage(5);
      doc.text('Scénario : 10 personnes participent à un événement. Alice effectue une dépense de 30€', margin + 5, yPosition);
      yPosition += 5;
      checkNewPage(5);
      doc.text('pour un repas en ville. Alice, Bob et Charlie valident cette dépense. Les 7 autres', margin + 5, yPosition);
      yPosition += 5;
      checkNewPage(5);
      doc.text('participants ne valident pas (ils sont restés sur site).', margin + 5, yPosition);
      yPosition += 6;
      
      doc.setFontSize(8);
      doc.setTextColor(34, 197, 94); // Vert
      doc.setFont(undefined, 'bold');
      checkNewPage(5);
      doc.text('Résultat selon la double règle Bonkont :', margin + 5, yPosition);
      yPosition += 5;
      
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      checkNewPage(5);
      doc.text('1. VALIDATION : Seuls Alice, Bob et Charlie sont concernés (ils ont validé)', margin + 10, yPosition);
      yPosition += 5;
      checkNewPage(5);
      doc.text('2. CALCUL ÉQUITABLE : Chacun consomme sa part au prorata (30€ ÷ 3 = 10€)', margin + 10, yPosition);
      yPosition += 5;
      checkNewPage(5);
      doc.text('• Alice a avancé 30€, elle consomme 10€ (sa part) → elle doit recevoir 20€', margin + 10, yPosition);
      yPosition += 5;
      checkNewPage(5);
      doc.text('• Bob consomme 10€ (sa part) → il doit 10€ à Alice', margin + 10, yPosition);
      yPosition += 5;
      checkNewPage(5);
      doc.text('• Charlie consomme 10€ (sa part) → il doit 10€ à Alice', margin + 10, yPosition);
      yPosition += 5;
      checkNewPage(5);
      doc.text('• Les 7 autres participants sont exemptés (ils n\'ont pas validé)', margin + 10, yPosition);
      yPosition += 8;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'italic');
      checkNewPage(5);
      doc.text('Double règle Bonkont : La validation détermine qui est concerné, le calcul équitable garantit que chacun consomme sa part au prorata. C\'est transparent, équitable, et tout le monde est quitte !', margin, yPosition);
      checkNewPage(15);
      yPosition += 10;
      
      // Transferts finaux - Vue globale
      if (transfers.length > 0) {
        checkNewPage(30);
        doc.setFontSize(12);
        doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
        doc.text('Ajustements entre participants', margin, yPosition);
        yPosition += 5;
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'italic');
        doc.text('Basé sur les dépenses validées et les paiements enregistrés.', margin, yPosition);
        yPosition += 8;
        
        const transfersTableData = transfers.map(t => [
          `${t.fromName} verse`,
          `${(t.amount || 0).toFixed(2)} €`,
          `à ${t.toName}`
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Qui', 'Montant', 'À qui']],
          body: transfersTableData,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: margin, right: margin },
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
        
        // Vue par participant - Transparence
        checkNewPage(20);
        doc.setFontSize(12);
        doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
        doc.text('Détail par participant : Avec qui régulariser ?', margin, yPosition);
        yPosition += 8;
        
        Object.values(balances).forEach((balance) => {
          const participantTransfers = getParticipantTransfers(balance.participantId, transfersResult);
          
          if (!participantTransfers.hasTransfers) {
            checkNewPage(8);
            doc.setFontSize(9);
            doc.setTextColor(34, 197, 94);
            doc.setFont(undefined, 'normal');
            doc.text(`[OK] ${balance.participantName}: Participation équilibrée`, margin + 5, yPosition);
            yPosition += 6;
            return;
          }
          
          checkNewPage(15);
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'bold');
          doc.text(`${balance.participantName}`, margin + 5, yPosition);
          yPosition += 6;
          
          // Détail financier
          doc.setFontSize(7);
          doc.setTextColor(60, 60, 60);
          doc.setFont(undefined, 'normal');
          doc.text(`Contribution: ${((balance.contribution || 0)).toFixed(2)}€ | Avancé: ${((balance.avance || 0)).toFixed(2)}€ | Consommé: ${((balance.consomme || 0)).toFixed(2)}€ | Solde: ${((balance.solde || 0)).toFixed(2)}€`, margin + 5, yPosition);
          yPosition += 5;
          
          // Traçabilité des dépenses (Règle Bonkont)
          const traceability = getExpenseTraceability(balance.participantId, event, transactions);
          
          if (traceability.depensesAvancees.length > 0) {
            checkNewPage(10);
            doc.setFontSize(7);
            doc.setTextColor(60, 60, 60);
            doc.setFont(undefined, 'bold');
            doc.text('Dépenses avancées:', margin + 10, yPosition);
            yPosition += 4;
            
            traceability.depensesAvancees.forEach((dep) => {
              checkNewPage(6);
              doc.setFontSize(6);
              doc.setTextColor(60, 60, 60);
              doc.setFont(undefined, 'normal');
              const desc = dep.description || 'Dépense';
              const descShort = desc.length > 25 ? desc.substring(0, 22) + '...' : desc;
              const totalAmount = dep.amount.toFixed(2);
              const shareAmount = dep.share.toFixed(2);
              const participantsCount = dep.participantsConcerned || 1;
              doc.text(`• ${descShort}: ${totalAmount}€ | Part: ${shareAmount}€ | ${participantsCount} participant(s)`, margin + 15, yPosition);
              yPosition += 3;
            });
            yPosition += 2;
          }
          
          if (participantTransfers.toReceive.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(34, 197, 94);
            doc.setFont(undefined, 'normal');
            doc.text(`  Reçoit de:`, margin + 5, yPosition);
            yPosition += 5;
            
            participantTransfers.toReceive.forEach((transfer) => {
              doc.text(`    → ${transfer.fromName}: ${(transfer.amount || 0).toFixed(2)}€`, margin + 10, yPosition);
              yPosition += 4;
            });
          }
          
          if (participantTransfers.toPay.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(239, 68, 68);
            doc.setFont(undefined, 'normal');
            doc.text(`  Verse à:`, margin + 5, yPosition);
            yPosition += 5;
            
            participantTransfers.toPay.forEach((transfer) => {
              doc.text(`    → ${transfer.toName}: ${(transfer.amount || 0).toFixed(2)}€`, margin + 10, yPosition);
              yPosition += 4;
            });
          }
          
          yPosition += 3;
        });
        
      } else {
        checkNewPage(20);
        doc.setFontSize(12);
        doc.setTextColor(34, 197, 94);
        doc.setFont(undefined, 'bold');
        doc.text('[EQUILIBRE] Tout est équilibré', margin, yPosition);
        yPosition += 6;
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'normal');
        doc.text('Aucun transfert nécessaire. Les dépenses et paiements enregistrés', margin, yPosition);
        yPosition += 5;
        doc.text('permettent un équilibre parfait entre les participants.', margin, yPosition);
        yPosition += 10;
      }
      
      // ===== AVIS ET NOTES =====
      if (event.ratings && event.ratings.length > 0) {
        checkNewPage(30);
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.setFont(undefined, 'bold');
        doc.text('Avis et souvenirs partagés', margin, yPosition);
        yPosition += 8;
        
        event.ratings.forEach((rating, idx) => {
          checkNewPage(25);
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'bold');
          doc.text(`${rating.participantName}`, margin, yPosition);
          yPosition += 6;
          
          // Étoiles
          doc.setFontSize(8);
          doc.setTextColor(255, 193, 7);
          for (let i = 0; i < rating.rating; i++) {
            doc.text('★', margin + (i * 4), yPosition);
          }
          doc.setTextColor(200, 200, 200);
          for (let i = rating.rating; i < 5; i++) {
            doc.text('☆', margin + (i * 4), yPosition);
          }
          yPosition += 6;
          
          if (rating.review) {
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.setFont(undefined, 'italic');
            const reviewLines = doc.splitTextToSize(`"${rating.review}"`, pageWidth - 2 * margin);
            doc.text(reviewLines, margin + 5, yPosition);
            yPosition += reviewLines.length * 5;
          }
          
          if (rating.createdAt) {
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`Le ${format(new Date(rating.createdAt), 'dd MMMM yyyy', { locale: fr })}`, margin + 5, yPosition);
            yPosition += 5;
          }
          
          yPosition += 5;
        });
      }
      
      // ===== PHRASE DE CLÔTURE MÉMORABLE =====
      checkNewPage(40);
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 3, 3, 'F');
      yPosition += 10;
      
      doc.setFontSize(14);
      doc.setTextColor(99, 102, 241);
      doc.setFont(undefined, 'bold');
      doc.text('Événement clôturé', margin + 10, yPosition);
      yPosition += 8;
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'italic');
      doc.text('Les comptes sont clairs, les souvenirs restent.', margin + 10, yPosition);
      yPosition += 7;
      doc.text('Bonkont fait les comptes, les Amis font le reste.', margin + 10, yPosition);
      
      // Ajouter le footer sur toutes les pages
      addFooter();
      
      // Ajouter mention de validation si applicable
      if (isValidated) {
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
          doc.setFontSize(7);
          doc.setTextColor(34, 197, 94);
          doc.setFont(undefined, 'bold');
          const validationText = 'Document figé et signé';
          const validationWidth = doc.getTextWidth(validationText);
          doc.text(validationText, (pageWidth - validationWidth) / 2, pageHeight - 15);
        }
      }
      
      const fileName = isValidated 
        ? `BONKONT-CLOSURE-FINAL-${event.code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
        : `BONKONT-CLOSURE-${event.code}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      toast({
        title: isValidated ? "📄 PDF final exporté" : "PDF exporté",
        description: isValidated 
          ? `Le document de clôture final (signé et figé) a été généré avec succès.`
          : `Le document de clôture a été généré avec succès.`,
      });
    } catch (error) {
      console.error('[EventClosure] Error exporting PDF:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'export du PDF.",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Bouton retour */}
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text truncate">
              Clôture Évènementielle
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">
              {event.title} - Transparence et répartition finale
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2">
            Code: {event.code}
          </Badge>
          <Button variant="outline" className="gap-2" onClick={handleExportClosurePDF}>
            <FileText className="w-4 h-4" />
            {isValidated ? 'Export PDF Final' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Accordéon principal avec les 5 sections */}
      <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full space-y-4">
        
        {/* Section 1: Clôture */}
        <AccordionItem value="closure" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Clôture</h2>
              {isValidated && (
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 ml-2">
                  Validée
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
      <Card className="p-4 border-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isValidated ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                      🟢 Clôture validée
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les montants sont figés. Aucune modification n'est possible.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                      🟡 Clôture non validée
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les montants peuvent encore évoluer si de nouvelles transactions sont ajoutées.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Signatures et délai */}
          {!isValidated && (
            <div className="space-y-3 pt-3 border-t">
              {/* Compteur H+48 */}
              {closureDeadline && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Temps de réflexion (48h après l'événement) :
                    </span>
                  </div>
                  {timeRemaining ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700">
                              {(() => {
                                const days = Math.floor(timeRemaining.hours / 24);
                                const hours = timeRemaining.hours % 24;
                                if (days > 0) {
                                  return `Il reste ${days} jour${days > 1 ? 's' : ''} et ${hours} heure${hours > 1 ? 's' : ''}`;
                                } else if (hours > 0) {
                                  return `Il reste ${hours} heure${hours > 1 ? 's' : ''} et ${timeRemaining.minutes} minute${timeRemaining.minutes > 1 ? 's' : ''}`;
                                } else {
                                  return `Il reste ${timeRemaining.minutes} minute${timeRemaining.minutes > 1 ? 's' : ''}`;
                                }
                              })()}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Détail technique : {String(timeRemaining.hours).padStart(2, '0')}h {String(timeRemaining.minutes).padStart(2, '0')}m {String(timeRemaining.seconds).padStart(2, '0')}s
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                      ✅ Prêt à finaliser
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Signatures */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      ✍️ Validation collective
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Chacun confirme les comptes
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900">
                    {signedCount} / {participants.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {participants.map((participant) => {
                    const isSigned = closureSignatures[participant.id];
                    const participantName = participant.name || participant.firstName || participant.email || 'Participant';
                    return (
                      <div key={participant.id} className={`flex items-center justify-between p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 transition-all ${
                        isSigned 
                          ? 'opacity-75 bg-gray-50 dark:bg-gray-800/50' 
                          : 'hover:shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isSigned ? 'text-muted-foreground' : ''}`}>{participantName}</span>
                          {isSigned && (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-xs ml-2">
                              Confirmé
                            </Badge>
                          )}
                        </div>
                        {isSigned ? (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            ✅ Validé {isSigned.signedAt && format(new Date(isSigned.signedAt), 'dd/MM à HH:mm', { locale: fr })}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSign(participant.id)}
                            className="text-xs h-8 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-purple-300 dark:border-purple-700"
                          >
                            ✍️ Je valide
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!allSigned && (
                  <div className="mt-3 p-2 rounded bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      💬 En attente de {participants.length - signedCount} validation{participants.length - signedCount > 1 ? 's' : ''}... On y est presque !
                    </p>
                  </div>
                )}
                {allSigned && (
                  <div className="mt-3 p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                      🎉 Tous les participants ont validé ! On peut finaliser.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Soldes finaux */}
        <AccordionItem value="final-balances" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Soldes finaux</h2>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
      {/* Note importante */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Répartition finale
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Cette répartition est calculée à partir de toutes les dépenses validées et des paiements enregistrés. 
              Elle détermine les ajustements finaux entre participants.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 neon-border">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Soldes finaux par participant
        </h2>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {Object.values(balances).map((balance) => {
              const formatted = formatBalance(balance);
              return (
                <Card key={balance.participantId} className="p-4 border-2">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{balance.participantName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatted.status === 'doit_recevoir' && 'Doit recevoir'}
                        {formatted.status === 'doit_verser' && 'Doit verser'}
                        {formatted.status === 'equilibre' && 'Équilibré'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={formatted.status === 'doit_recevoir' ? 'default' : 
                                 formatted.status === 'doit_verser' ? 'destructive' : 
                                 'secondary'}
                        className="text-lg px-3 py-1"
                      >
                        {formatted.soldeFormatted}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatted.status === 'doit_recevoir' && 'À recevoir pour équilibrer'}
                        {formatted.status === 'doit_verser' && 'À verser pour équilibrer'}
                        {formatted.status === 'equilibre' && 'Participation équilibrée'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contribution:</span>
                        <span className="font-medium">{(balance.contribution || 0).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avancé:</span>
                        <span className="font-medium">{(balance.avance || 0).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Consommé:</span>
                        <span className="font-medium">{(balance.consomme || 0).toFixed(2)}€</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mise totale:</span>
                        <span className="font-medium">{(balance.mise || 0).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Solde:</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">
                                  Solde = Mise - Consommation. Positif = doit recevoir, Négatif = doit verser.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className={`font-semibold ${
                          (balance.solde || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(balance.solde || 0) >= 0 ? '+' : ''}{(balance.solde || 0).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Ajustements */}
        <AccordionItem value="adjustments" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Ajustements</h2>
              {transfers.length > 0 && (
                <Badge variant="outline" className="text-sm ml-2">
                  {transfers.length} transfert{transfers.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
      <Card className="p-6 neon-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Ajustements entre participants
          </h2>
          <Badge variant="outline" className="text-sm">
            {transfers.length} transfert{transfers.length > 1 ? 's' : ''}
          </Badge>
        </div>
        
        {/* Explication succincte */}
        <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Comment ça marche ?
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Basé sur les dépenses validées et les paiements enregistrés.
                Les transferts sont calculés uniquement à partir du <strong>solde final</strong> de chaque participant.
              </p>
            </div>
          </div>
        </div>
        
        {/* Avertissement si répartition incomplète */}
        {transfersResult.warning && (
          <div className="mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  ⚠️ Répartition incomplète
                </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100"
                    onClick={() => setShowHelpIncompleteDistribution(!showHelpIncompleteDistribution)}
                  >
                    <HelpCircle className="w-4 h-4 mr-1" />
                    {showHelpIncompleteDistribution ? (
                      <>
                        <span className="text-xs">Masquer l'aide</span>
                        <ChevronUp className="w-3 h-3 ml-1" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs">Comment corriger ?</span>
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  {transfersResult.warning}
                </p>
                {balancesResult.totalSolde && Math.abs(balancesResult.totalSolde) > 0.01 && (
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2 italic">
                    Écart détecté : {balancesResult.totalSolde.toFixed(2)}€
                  </p>
                )}
                
                {/* Section d'aide détaillée */}
                {showHelpIncompleteDistribution && (
                  <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
                    <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                      📚 Qu'est-ce qu'une répartition incomplète ?
                    </h4>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
                      Une répartition incomplète signifie que la somme des soldes de tous les participants et de la cagnotte n'est pas égale à 0€. 
                      En comptabilité, cette équation doit toujours être vraie : <strong>Σ soldes participants + solde POT = 0€</strong>
                    </p>
                    <div className="text-xs text-yellow-800 dark:text-yellow-200 mb-3 p-2 bg-yellow-200 dark:bg-yellow-800/50 rounded">
                      <strong>RÈGLE BONKONT :</strong> "Que je paie ou dépense, je consomme comme toi, cette avance tu dois me la rembourser, et vice versa, on est quittes". 
                      Si toutes les transactions sont <strong>validées collectivement</strong> et équilibrées, alors la répartition devrait être équilibrée automatiquement.
              </div>
                    
                    <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 mt-3">
                      🔍 Causes possibles :
                    </h4>
                    <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1.5 mb-3 list-disc list-inside">
                      <li><strong>Dépenses partagées mal enregistrées</strong> : Si une dépense de 100€ est partagée entre 4 personnes mais que seule la personne qui a payé est dans la liste "participants", alors cette personne consomme 100€ au lieu de 25€ (100/4).</li>
                      <li><strong>Contributions manquantes</strong> : Si la cagnotte est déficitaire, il manque des contributions pour équilibrer les comptes.</li>
                      <li><strong>Transactions incomplètes</strong> : Certaines transactions peuvent avoir des informations manquantes (montant, participants, payeur).</li>
                    </ul>
                    
                    <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2 mt-3">
                      ✅ Solutions pour corriger :
                    </h4>
                    <ol className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1.5 mb-2 list-decimal list-inside">
                      <li><strong>Vérifier les dépenses partagées</strong> : Pour chaque dépense partagée, ouvrez la transaction et assurez-vous que <strong>tous les participants concernés</strong> sont dans la liste "participants". Par exemple, si A paie 100€ pour A, B, C, D, la liste doit contenir [A, B, C, D], pas seulement [A].</li>
                      <li><strong>Ajouter des contributions</strong> : Si la cagnotte est déficitaire, enregistrez des contributions supplémentaires pour combler le déficit.</li>
                      <li><strong>Corriger les transactions suspectes</strong> : Bonkont détecte automatiquement les transactions où seul le payeur est dans la liste. Ouvrez ces transactions et ajoutez tous les participants concernés.</li>
                      <li><strong>Vérifier les montants</strong> : Assurez-vous que tous les montants sont corrects et que les devises sont cohérentes.</li>
                    </ol>
                    
                    <div className="mt-3 p-2 bg-yellow-200 dark:bg-yellow-800/50 rounded text-xs text-yellow-900 dark:text-yellow-100">
                      <strong>💡 Astuce</strong> : Bonkont applique automatiquement une correction pour les dépenses où seul le payeur est dans la liste, mais il est préférable de corriger manuellement les transactions pour garantir la précision des calculs.
                    </div>
                    
                    <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-900 dark:text-blue-100">
                      <strong>📌 Important</strong> : Le budget théorique fixé au départ de l'événement est UNIQUEMENT un repère indicatif à ne pas dépasser. 
                      Seules les contributions RÉELLES (paiements en espèces, virements, etc.) doivent être enregistrées et prises en compte dans les calculs. 
                      Si un déséquilibre apparaît, c'est normal tant que les contributions réelles n'ont pas encore été enregistrées.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {transfers.length > 0 ? (
          <>
            {/* Vue globale des transferts */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary" />
                Vue globale des transferts
              </h3>
              <div className="space-y-3">
              {transfers.map((transfer, index) => (
                <Card key={index} className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg text-destructive">{transfer.fromName}</span>
                        <span className="text-muted-foreground">verse</span>
                        <span className="font-semibold text-lg text-primary">{(transfer.amount || 0).toFixed(2)}€</span>
                        <span className="text-muted-foreground">à</span>
                        <span className="font-semibold text-lg text-green-600 dark:text-green-400">{transfer.toName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto p-1 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          toast({
                            title: "Détail du transfert",
                            description: `Ce transfert provient du solde de ${transfer.fromName} (${balances[transfer.from]?.solde >= 0 ? '+' : ''}${balances[transfer.from]?.solde.toFixed(2)}€) vers ${transfer.toName} (${balances[transfer.to]?.solde >= 0 ? '+' : ''}${balances[transfer.to]?.solde.toFixed(2)}€).`,
                          });
                        }}
                      >
                        Voir le détail
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              </div>
            </div>
            
            {/* Vue par participant - Transparence */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Détail par participant : Avec qui régulariser ?
              </h3>
              <div className="space-y-3">
                {Object.values(balances).map((balance) => {
                  const participantTransfers = getParticipantTransfers(balance.participantId, transfersResult);
                  
                  if (!participantTransfers.hasTransfers) {
                    return (
                      <Card key={balance.participantId} className="p-4 border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="font-semibold">{balance.participantName}</span>
                          </div>
                          <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                            Participation équilibrée
                          </span>
                        </div>
                      </Card>
                    );
                  }
                  
                  return (
                    <Card key={balance.participantId} className="p-4 border-2">
                      <div className="mb-3">
                        <h4 className="font-semibold text-base">{balance.participantName}</h4>
                        <p className="text-xs text-muted-foreground">
                          Solde : {(balance.solde || 0) >= 0 ? '+' : ''}{(balance.solde || 0).toFixed(2)}€
                        </p>
                      </div>
                      
                      {participantTransfers.toReceive.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Reçoit de :</p>
                          <div className="space-y-2">
                            {participantTransfers.toReceive.map((transfer, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                  <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-sm font-medium">{transfer.fromName}</span>
                                </div>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  {(transfer.amount || 0).toFixed(2)}€
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {participantTransfers.toPay.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Verse à :</p>
                          <div className="space-y-2">
                            {participantTransfers.toPay.map((transfer, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-2">
                                  <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400 rotate-180" />
                                  <span className="text-sm font-medium">{transfer.toName}</span>
                                </div>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                  {(transfer.amount || 0).toFixed(2)}€
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            {transfersResult.isBalanced ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-green-700 dark:text-green-400">
                  ✅ Tout est équilibré
                </h3>
                <p className="text-muted-foreground mb-2">
                  Aucun ajustement financier n'est nécessaire.
                </p>
                <p className="text-sm text-muted-foreground italic max-w-md mx-auto">
                  Les dépenses et paiements enregistrés permettent un équilibre parfait entre les participants.
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-yellow-700 dark:text-yellow-400">
                  ⚠️ Répartition incomplète
                </h3>
                <p className="text-muted-foreground mb-2">
                  {transfersResult.warning || 'Impossible de calculer les transferts.'}
                </p>
                {balancesResult.totalSolde && Math.abs(balancesResult.totalSolde) > 0.01 && (
                  <p className="text-sm text-muted-foreground italic max-w-md mx-auto">
                    Écart détecté : {balancesResult.totalSolde.toFixed(2)}€
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Finalisation */}
        <AccordionItem value="finalization" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Finalisation</h2>
              {!isValidated && (
                <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 ml-2">
                  En attente
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
      {/* Bouton de validation de clôture */}
      {!isValidated && (
        <Card className="p-6 neon-border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                  🎊 Finaliser ensemble
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                  Une fois validé, les comptes seront figés. C'est le moment de clôturer en beauté !
                </p>
              </div>
            </div>
            
            {/* Conditions de validation */}
            <div className="space-y-2 p-4 rounded-lg bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">✅ Validations collectives</span>
                {allSigned ? (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {signedCount} / {participants.length} ✨
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                    {signedCount} / {participants.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">⏰ Temps de réflexion</span>
                {closureDeadline && new Date() >= closureDeadline ? (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Prêt
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                    En cours
                  </Badge>
                )}
              </div>
            </div>
            
            <Button
              onClick={() => {
                // Vérification avant d'ouvrir le dialog
                const closureDeadline = calculateClosureDeadline();
                const now = new Date();
                
                if (!closureDeadline) {
                  toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible de calculer la date de clôture. Vérifiez les dates de l'événement.",
                  });
                  return;
                }
                
                if (now < closureDeadline) {
                  const diff = closureDeadline.getTime() - now.getTime();
                  const hoursRemaining = Math.ceil(diff / (1000 * 60 * 60));
                  toast({
                    variant: "destructive",
                    title: "Temps de réflexion en cours",
                    description: `Il reste encore ${hoursRemaining} heure${hoursRemaining > 1 ? 's' : ''} de réflexion avant de pouvoir finaliser la clôture.`,
                  });
                  return;
                }
                
                if (!allSigned) {
                  toast({
                    variant: "destructive",
                    title: "Validations manquantes",
                    description: "Tous les participants doivent valider avant de finaliser.",
                  });
                  return;
                }
                
                // Toutes les vérifications sont passées, on peut ouvrir le dialog
                setShowValidationDialog(true);
              }}
              disabled={!canValidate}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none transition-all"
              size="lg"
            >
              {canValidate ? (
                <>
                  <span className="text-lg mr-2">🎉</span>
                  Finaliser la clôture ensemble
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  En attente des conditions
                </>
              )}
            </Button>
            
            {!canValidate && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-center text-yellow-800 dark:text-yellow-200">
                  {(() => {
                    const closureDeadline = calculateClosureDeadline();
                    const now = new Date();
                    const allSignedCheck = allSigned;
                    
                    if (!allSignedCheck && closureDeadline && now < closureDeadline) {
                      const diff = closureDeadline.getTime() - now.getTime();
                      const hoursRemaining = Math.ceil(diff / (1000 * 60 * 60));
                      return `💬 Il manque encore les validations de chacun et il reste ${hoursRemaining} heure${hoursRemaining > 1 ? 's' : ''} de réflexion. Bonkont prend le temps de bien faire.`;
                    } else if (!allSignedCheck) {
                      return `💬 Il manque encore les validations de chacun. Tous les participants doivent valider avant de finaliser.`;
                    } else if (closureDeadline && now < closureDeadline) {
                      const diff = closureDeadline.getTime() - now.getTime();
                      const hoursRemaining = Math.ceil(diff / (1000 * 60 * 60));
                      return `⏰ Il reste encore ${hoursRemaining} heure${hoursRemaining > 1 ? 's' : ''} de réflexion avant de pouvoir finaliser la clôture.`;
                    }
                    return `💬 Les conditions ne sont pas encore remplies pour finaliser la clôture.`;
                  })()}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* Dialog pour laisser un avis */}
      <AlertDialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-600" />
              Partagez votre avis
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Votre avis compte ! Partagez ce que vous avez retenu de ce moment ensemble.
              </p>
              
              {/* Note avec étoiles */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Votre note</label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentRating(i + 1)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          i < currentRating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  {currentRating > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      {currentRating === 5 && '🌟 Parfait !'}
                      {currentRating === 4 && '😊 Très bien !'}
                      {currentRating === 3 && '👍 Bien'}
                      {currentRating === 2 && '🙂 Correct'}
                      {currentRating === 1 && '😐 Passable'}
                    </span>
                  )}
                </div>
              </div>

              {/* Avis textuel */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Votre message (optionnel)</label>
                <Textarea
                  value={currentReview}
                  onChange={(e) => setCurrentReview(e.target.value)}
                  placeholder="Partagez un souvenir, une anecdote, ce que vous avez aimé..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {currentReview.length} / 500 caractères
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (currentRating === 0) {
                  toast({
                    variant: "destructive",
                    title: "Note requise",
                    description: "Veuillez donner une note avant de publier votre avis.",
                  });
                  return;
                }

                const participant = participants.find(p => p.id === ratingParticipantId);
                const participantName = participant?.name || participant?.firstName || participant?.email || 'Participant';

                addRating(eventId, {
                  participantId: ratingParticipantId,
                  participantName,
                  rating: currentRating,
                  review: currentReview.trim() || null,
                  createdAt: new Date(),
                });

                toast({
                  title: "🎉 Merci !",
                  description: "Votre avis a été enregistré. Merci d'avoir partagé ce moment !",
                });

                setShowRatingDialog(false);
                setCurrentRating(0);
                setCurrentReview('');
                setRatingParticipantId(null);
              }}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
              disabled={currentRating === 0}
            >
              <Heart className="w-4 h-4 mr-2" />
              Publier mon avis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de validation */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Valider la clôture de l'événement
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-base">
                Vous allez finaliser la clôture de <strong className="text-purple-600 dark:text-purple-400">{event.title}</strong>.
              </p>
              
              {/* Récapitulatif des signatures */}
              <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  ✨ Validations collectives ({signedCount} / {participants.length})
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {participants.map((p) => {
                    const sig = closureSignatures[p.id];
                    const name = p.name || p.firstName || p.email || 'Participant';
                    return (
                      <div key={p.id} className="flex items-center justify-between text-xs p-1">
                        <span>{name}</span>
                        {sig ? (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-xs h-5">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Validé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs h-5">
                            En attente
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  💡 Information
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Une fois validé, les comptes seront figés. C'est le moment de finaliser ensemble cette belle aventure !
                </p>
              </div>
              <p className="text-sm text-center font-medium">
                Prêt à finaliser ? 🎉
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Vérification de sécurité : s'assurer que le délai de réflexion est bien écoulé
                const closureDeadline = calculateClosureDeadline();
                const now = new Date();
                
                if (!closureDeadline) {
                  toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible de calculer la date de clôture. Vérifiez les dates de l'événement.",
                  });
                  return;
                }
                
                if (now < closureDeadline) {
                  const diff = closureDeadline.getTime() - now.getTime();
                  const hoursRemaining = Math.ceil(diff / (1000 * 60 * 60));
                  toast({
                    variant: "destructive",
                    title: "Temps de réflexion en cours",
                    description: `Il reste encore ${hoursRemaining} heure${hoursRemaining > 1 ? 's' : ''} de réflexion avant de pouvoir finaliser la clôture.`,
                  });
                  return;
                }
                
                if (!allSigned) {
                  toast({
                    variant: "destructive",
                    title: "Validations manquantes",
                    description: "Tous les participants doivent valider avant de finaliser.",
                  });
                  return;
                }
                
                // Toutes les vérifications sont passées, on peut finaliser
                updateEvent(eventId, {
                  closureValidated: true,
                  closureDate: new Date(),
                  closureValidatedBy: closureSignatures,
                  status: 'completed'
                });
                setIsValidated(true);
                setShowValidationDialog(false);
                toast({
                  title: "🎉 C'est finalisé !",
                  description: "Les comptes sont clos. Merci d'avoir partagé ce moment ensemble !",
                });
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <span className="text-lg mr-2">🎊</span>
              Finaliser ensemble
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

