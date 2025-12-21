import { useState } from 'react';
import { Trophy, Medal, Flag, Star, Clock, Shield, Camera, UserCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import confetti from 'canvas-confetti';

interface Contributor {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  paymentDelay: number;
  amount: number;
  streak: number;
  rank: 1 | 2 | 3 | null;
  status: 'gold' | 'silver' | 'bronze' | 'warning' | null;
}

interface AvatarDialogProps {
  onAvatarChange: (type: 'upload' | 'default', value: string) => void;
}

function AvatarDialog({ onAvatarChange }: AvatarDialogProps) {
  const defaultAvatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onAvatarChange('upload', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Changer votre avatar</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Télécharger une photo</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label>Ou choisir un avatar par défaut</Label>
          <div className="grid grid-cols-5 gap-2">
            {defaultAvatars.map((avatar, index) => (
              <Button
                key={index}
                variant="outline"
                className="p-0 w-12 h-12 rounded-full"
                onClick={() => onAvatarChange('default', avatar)}
              >
                <Avatar>
                  <AvatarImage src={avatar} />
                  <AvatarFallback>
                    <UserCircle className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export function ContributorsPodium() {
  const [contributors, setContributors] = useState<Contributor[]>([
    {
      id: '1',
      name: 'Emma Laurent',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
      score: 98,
      paymentDelay: 1,
      amount: 150,
      streak: 5,
      rank: 1,
      status: 'gold'
    },
    {
      id: '2',
      name: 'Thomas Martin',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&q=80',
      score: 92,
      paymentDelay: 2,
      amount: 120,
      streak: 3,
      rank: 2,
      status: 'silver'
    },
    {
      id: '3',
      name: 'Sophie Dubois',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
      score: 85,
      paymentDelay: 3,
      amount: 90,
      streak: 2,
      rank: 3,
      status: 'bronze'
    },
    {
      id: '4',
      name: 'Marc Petit',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
      score: 45,
      paymentDelay: 8,
      amount: 60,
      streak: 0,
      rank: null,
      status: 'warning'
    }
  ]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF8C00'],
      zIndex: 9999,
    });
  };

  const handleAvatarChange = (contributorId: string, type: 'upload' | 'default', value: string) => {
    setContributors(contributors.map(c => 
      c.id === contributorId ? { ...c, avatar: value } : c
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-4">
        <h2 className="text-2xl font-bold gradient-text">
          Podium des Contributeurs
        </h2>
        <Badge variant="outline" className="gap-2">
          <Star className="w-4 h-4" />
          Top Contributeurs
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Position 2 - Argent */}
        <div className="order-2 md:order-1">
          <div className="flex flex-col items-center">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative w-24 h-24 mb-4 cursor-pointer group">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-300 to-gray-400 animate-pulse" />
                  <Avatar className="w-full h-full border-4 border-gray-300 relative z-10">
                    <AvatarImage src={contributors[1].avatar} />
                    <AvatarFallback>{contributors[1].name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-gray-300 text-background">2</Badge>
                  </div>
                </div>
              </DialogTrigger>
              <AvatarDialog onAvatarChange={(type, value) => handleAvatarChange(contributors[1].id, type, value)} />
            </Dialog>
            <Card className="w-full p-4 neon-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300/20 to-transparent" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{contributors[1].name}</h3>
                  <Medal className="w-5 h-5 text-gray-300" />
                </div>
                <Progress value={contributors[1].score} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span>{contributors[1].score}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Position 1 - Or */}
        <div className="order-1 md:order-2">
          <div className="flex flex-col items-center">
            <Dialog>
              <DialogTrigger asChild>
                <div 
                  className="relative w-32 h-32 mb-4 cursor-pointer group"
                  onMouseEnter={triggerConfetti}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 animate-pulse" />
                  <Avatar className="w-full h-full border-4 border-yellow-500 relative z-10">
                    <AvatarImage src={contributors[0].avatar} />
                    <AvatarFallback>{contributors[0].name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-yellow-500 text-background">1</Badge>
                  </div>
                </div>
              </DialogTrigger>
              <AvatarDialog onAvatarChange={(type, value) => handleAvatarChange(contributors[0].id, type, value)} />
            </Dialog>
            <Card className="w-full p-4 neon-border relative overflow-hidden transform hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-transparent" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{contributors[0].name}</h3>
                  <Trophy className="w-6 h-6 text-yellow-500" />
                </div>
                <Progress value={contributors[0].score} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span>{contributors[0].score}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-yellow-500">
                  <Shield className="w-4 h-4" />
                  <span>{contributors[0].streak} contributions consécutives</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Position 3 - Bronze */}
        <div className="order-3">
          <div className="flex flex-col items-center">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative w-24 h-24 mb-4 cursor-pointer group">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-600 to-amber-800 animate-pulse" />
                  <Avatar className="w-full h-full border-4 border-amber-700 relative z-10">
                    <AvatarImage src={contributors[2].avatar} />
                    <AvatarFallback>{contributors[2].name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-amber-700 text-background">3</Badge>
                  </div>
                </div>
              </DialogTrigger>
              <AvatarDialog onAvatarChange={(type, value) => handleAvatarChange(contributors[2].id, type, value)} />
            </Dialog>
            <Card className="w-full p-4 neon-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-700/20 to-transparent" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{contributors[2].name}</h3>
                  <Medal className="w-5 h-5 text-amber-700" />
                </div>
                <Progress value={contributors[2].score} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span>{contributors[2].score}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-muted-foreground mb-4 sticky top-[72px] bg-background/80 backdrop-blur-sm z-10 py-2">
          Autres Contributeurs
        </h3>
        <ScrollArea className="h-[400px] rounded-lg border border-border pr-4">
          <div className="space-y-4 p-4">
            {contributors.slice(3).map((contributor) => (
              <Card key={contributor.id} className="p-4 neon-border transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="relative cursor-pointer group">
                          <Avatar className="border-2 border-destructive">
                            <AvatarImage src={contributor.avatar} />
                            <AvatarFallback>{contributor.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </DialogTrigger>
                      <AvatarDialog onAvatarChange={(type, value) => handleAvatarChange(contributor.id, type, value)} />
                    </Dialog>
                    <div>
                      <h4 className="font-medium">{contributor.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Délai: {contributor.paymentDelay} jours</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="destructive" className="gap-2">
                    <Flag className="w-4 h-4" />
                    Retard
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}