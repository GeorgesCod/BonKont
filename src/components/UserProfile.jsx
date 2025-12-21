import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventHistory } from '@/components/EventHistory';
import { AvatarUpload } from '@/components/AvatarUpload';
import { UserCircle, History } from 'lucide-react';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl glass-morphism">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text">Profil Utilisateur</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <UserCircle className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="flex flex-col items-center space-y-4">
              <AvatarUpload
                currentAvatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80"
                onAvatarChange={() => {}}
              />
              <h2 className="text-xl font-semibold">John Doe</h2>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <EventHistory />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}