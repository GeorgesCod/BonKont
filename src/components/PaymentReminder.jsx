import { useState, useEffect } from 'react';
import { useEventStore } from '@/store/eventStore';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';

export function PaymentReminder() {
  const { toast } = useToast();
  const events = useEventStore((state) => state.events);
  const [lastReminderSent, setLastReminderSent] = useState<Record<string, Date>>({});

  useEffect(() => {
    const checkPayments = () => {
      events.forEach(event => {
        const now = new Date();
        const eventStart = new Date(event.startDate);
        const daysElapsed = differenceInDays(now, eventStart);

        // Vérifier les participants en retard
        event.participants.forEach(participant => {
          if (!participant.hasPaid) {
            const participantKey = `${event.id}-${participant.id}`;
            const lastReminder = lastReminderSent[participantKey];
            const shouldSendReminder = !lastReminder || differenceInDays(now, lastReminder) >= 3;

            if (daysElapsed > event.deadline && shouldSendReminder) {
              // Calculer le montant dû
              const totalDue = event.amount / event.participants.length;
              const amountPaid = participant.paidAmount || 0;
              const remainingAmount = totalDue - amountPaid;

              // Envoyer le rappel par email
              sendEmailReminder(participant.email, {
                eventTitle: event.title,
                amount: remainingAmount,
                eventCode: event.code
              });

              // Envoyer le rappel par SMS si un numéro est disponible
              if (participant.mobile) {
                sendSMSReminder(participant.mobile, {
                  eventTitle: event.title,
                  amount: remainingAmount,
                  eventCode: event.code
                });
              }

              // Mettre à jour la date du dernier rappel
              setLastReminderSent(prev => ({
                ...prev,
                [participantKey]: now
              }));

              // Notification dans l'interface
              toast({
                title: "Rappel envoyé",
                description: `Rappel envoyé à ${participant.name} pour l'événement "${event.title}"`
              });
            }
          }
        });
      });
    };

    // Vérifier toutes les 24 heures
    const interval = setInterval(checkPayments, 24 * 60 * 60 * 1000);
    
    // Vérification initiale
    checkPayments();

    return () => clearInterval(interval);
  }, [events, lastReminderSent, toast]);

  // Fonction d'envoi d'email
  const sendEmailReminder = (email: string, data: {
    eventTitle: string;
    amount: number;
    eventCode: string;
  }) => {
    const subject = `Rappel de paiement - ${data.eventTitle}`;
    const body = `
      Bonjour,

      Les bons comptes font les bons amis !

      Un rappel concernant votre participation à l'événement "${data.eventTitle}".
      Montant restant à régler : ${data.amount.toFixed(2)}€
      Code de l'événement : ${data.eventCode}

      Vous pouvez effectuer votre paiement en vous connectant à votre espace.

      Merci de votre attention.
    `;

    // Simulation d'envoi d'email
    console.log(`Email envoyé à ${email}`, { subject, body });
  };

  // Fonction d'envoi de SMS
  const sendSMSReminder = (mobile: string, data: {
    eventTitle: string;
    amount: number;
    eventCode: string;
  }) => {
    const message = `
      Les bons comptes font les bons amis !
      Rappel : ${data.amount.toFixed(2)}€ à régler pour "${data.eventTitle}"
      Code : ${data.eventCode}
    `.trim();

    // Simulation d'envoi de SMS
    console.log(`SMS envoyé à ${mobile}`, { message });
  };

  return null; // Composant invisible qui gère les rappels en arrière-plan
}