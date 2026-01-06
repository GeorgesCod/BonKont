import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useEventStore } from '@/store/eventStore';
import { format, differenceInDays, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar as CalendarIcon, Clock, Download, FileText, Star, TrendingUp, Users, Euro, ThumbsUp, ThumbsDown, Timer, AlertTriangle, Check, BarChart as ChartBar, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#6b7280'];

export function EventStatistics() {
  const events = useEventStore((state) => state.events) || [];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  // Calcul des statistiques générales
  const totalEvents = events.length || 0;
  const totalParticipants = events.reduce((acc, event) => {
    const participants = Array.isArray(event?.participants) ? event.participants : [];
    return acc + participants.length;
  }, 0);
  const totalAmount = events.reduce((acc, event) => acc + (event?.amount || 0), 0);
  const averageAmount = totalEvents > 0 ? totalAmount / totalEvents : 0;

  // Calcul des délais moyens
  const averageDelay = events.reduce((acc, event) => {
    const participants = Array.isArray(event?.participants) ? event.participants : [];
    const participantsWithDelay = participants.filter(p => p?.hasPaid);
    if (participantsWithDelay.length === 0) return acc;
    const avgEventDelay = participantsWithDelay.reduce((sum, p) => {
      const paidDate = p?.paidDate ? new Date(p.paidDate) : new Date();
      const startDate = event?.startDate ? new Date(event.startDate) : new Date();
      return sum + differenceInDays(paidDate, startDate);
    }, 0) / participantsWithDelay.length;
    return acc + avgEventDelay;
  }, 0) / (totalEvents || 1);

  // Données pour les graphiques
  const participationData = events.map(event => {
    const participants = Array.isArray(event?.participants) ? event.participants : [];
    return {
      name: event?.title || 'Sans titre',
      participants: participants.length,
      confirmed: participants.filter(p => p?.hasConfirmed).length,
      paid: participants.filter(p => p?.hasPaid).length
    };
  });

  const paymentStatusData = [
    {
      name: 'À temps',
      value: events.reduce((acc, event) => {
        const participants = Array.isArray(event?.participants) ? event.participants : [];
        return acc + participants.filter(p => 
          p?.hasPaid && p?.paidDate && event?.startDate &&
          !isBefore(new Date(p.paidDate), new Date(event.startDate))
        ).length;
      }, 0)
    },
    {
      name: 'En retard',
      value: events.reduce((acc, event) => {
        const participants = Array.isArray(event?.participants) ? event.participants : [];
        return acc + participants.filter(p => 
          p?.hasPaid && p?.paidDate && event?.startDate &&
          isBefore(new Date(p.paidDate), new Date(event.startDate))
        ).length;
      }, 0)
    },
    {
      name: 'En attente',
      value: events.reduce((acc, event) => {
        const participants = Array.isArray(event?.participants) ? event.participants : [];
        return acc + participants.filter(p => !p?.hasPaid).length;
      }, 0)
    }
  ];

  const contributionTrends = events.map(event => {
    const participants = Array.isArray(event?.participants) ? event.participants : [];
    return {
      date: event?.startDate ? format(new Date(event.startDate), 'dd/MM/yyyy') : 'N/A',
      montant: event?.amount || 0,
      collecté: event?.totalPaid || 0,
      participants: participants.length
    };
  });

  const generatePDF = () => {
    // Simulation de génération de PDF
    console.log('Génération du rapport PDF...');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold gradient-text">Statistiques des Événements</h2>
        <Button onClick={generatePDF} className="gap-2">
          <FileText className="w-4 h-4" />
          Exporter en PDF
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 neon-border">
          <div className="flex items-center gap-2 text-primary mb-2">
            <CalendarIcon className="w-5 h-5" />
            <h3 className="font-semibold">Total Événements</h3>
          </div>
          <p className="text-2xl font-bold">{totalEvents}</p>
          <Progress value={100} className="mt-2" />
        </Card>

        <Card className="p-4 neon-border">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Users className="w-5 h-5" />
            <h3 className="font-semibold">Participants</h3>
          </div>
          <p className="text-2xl font-bold">{totalParticipants}</p>
          <Progress 
            value={(totalParticipants / (totalEvents * 10)) * 100} 
            className="mt-2" 
          />
        </Card>

        <Card className="p-4 neon-border">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Euro className="w-5 h-5" />
            <h3 className="font-semibold">Montant Moyen</h3>
          </div>
          <p className="text-2xl font-bold">{averageAmount.toFixed(2)}€</p>
          <Progress 
            value={(averageAmount / 1000) * 100} 
            className="mt-2" 
          />
        </Card>

        <Card className="p-4 neon-border">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Clock className="w-5 h-5" />
            <h3 className="font-semibold">Délai Moyen</h3>
          </div>
          <p className="text-2xl font-bold">{Math.round(averageDelay)} jours</p>
          <Progress 
            value={Math.min((averageDelay / 30) * 100, 100)} 
            className="mt-2" 
          />
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <ChartBar className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="participation" className="gap-2">
            <Users className="w-4 h-4" />
            Participation
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Euro className="w-4 h-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="ratings" className="gap-2">
            <Star className="w-4 h-4" />
            Évaluations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6 neon-border">
            <h3 className="text-lg font-semibold mb-4">Tendances des contributions</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contributionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="montant"
                    stroke="#6366f1"
                    name="Montant total"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="collecté"
                    stroke="#10b981"
                    name="Montant collecté"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="participants"
                    stroke="#f59e0b"
                    name="Participants"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="participation">
          <Card className="p-6 neon-border">
            <h3 className="text-lg font-semibold mb-4">Taux de participation par événement</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={participationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="participants" fill="#6366f1" name="Total" />
                  <Bar dataKey="confirmed" fill="#10b981" name="Confirmés" />
                  <Bar dataKey="paid" fill="#f59e0b" name="Payé" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6 neon-border">
              <h3 className="text-lg font-semibold mb-4">Statut des paiements</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 neon-border">
              <h3 className="text-lg font-semibold mb-4">Calendrier des paiements</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ratings">
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6 neon-border">
              <h3 className="text-lg font-semibold mb-4">Notes moyennes</h3>
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 rounded-lg neon-border">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startDate), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < 4 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 neon-border">
              <h3 className="text-lg font-semibold mb-4">Scores des participants</h3>
              <div className="space-y-4">
                {events.flatMap(event => Array.isArray(event?.participants) ? event.participants : []).slice(0, 5).map((participant, index) => {
                  if (!participant || !participant.name) return null;
                  return (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg neon-border">
                      <div>
                        <p className="font-medium">{participant.name || 'Participant sans nom'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Timer className="w-4 h-4" />
                          <span>Délai moyen: {Math.round(Math.random() * 5)} jours</span>
                        </div>
                      </div>
                      <Badge
                        variant={participant.hasPaid ? 'outline' : 'destructive'}
                        className="gap-2"
                      >
                        {participant.hasPaid ? (
                          <>
                            <Check className="w-4 h-4" />
                            Fiable
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4" />
                            À risque
                          </>
                        )}
                      </Badge>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}