import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MapPin, Search, Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EventLocation({ location, onLocationChange }) {
  const { toast } = useToast();
  const [address, setAddress] = useState(location?.address || '');
  const [coordinates, setCoordinates] = useState(location?.coordinates || null);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef(null);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (location) {
      setAddress(location.address || '');
      setCoordinates(location.coordinates || null);
    }
  }, [location]);

  const handleSearch = async () => {
    if (!address.trim()) {
      toast({
        variant: "destructive",
        title: "Adresse requise",
        description: "Veuillez saisir une adresse."
      });
      return;
    }

    setIsSearching(true);
    
    // Utiliser Google Maps Embed API (nécessite une clé API dans .env)
    // Pour l'instant, on utilise une approche simple avec recherche directe
    const encodedAddress = encodeURIComponent(address);
    
    // Note: Pour une vraie intégration, utiliser l'API JavaScript de Google Maps
    // avec une clé API stockée dans VITE_GOOGLE_MAPS_API_KEY
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const mapUrl = googleMapsApiKey 
      ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}`
      : `https://www.google.com/maps?q=${encodedAddress}`;
    
    // Simuler la récupération des coordonnées (dans une vraie app, utiliser l'API de géocodage)
    const newLocation = {
      address,
      coordinates: coordinates || { lat: 0, lng: 0 },
      mapUrl
    };
    
    setCoordinates(newLocation.coordinates);
    onLocationChange(newLocation);
    
    setIsSearching(false);
    toast({
      title: "Localisation trouvée",
      description: "L'adresse a été géolocalisée avec succès."
    });
  };

  const handleShareLocation = () => {
    if (!address) {
      toast({
        variant: "destructive",
        title: "Aucune localisation",
        description: "Veuillez d'abord rechercher une adresse."
      });
      return;
    }

    const shareUrl = coordinates 
      ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    if (navigator.share) {
      navigator.share({
        title: 'Localisation de l\'événement',
        text: `Localisation : ${address}`,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié !",
        description: "Le lien de localisation a été copié dans le presse-papier."
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Lieu de l'événement</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ex: 123 Rue de la Paix, Paris"
              className="pl-10 neon-border"
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="gap-2"
          >
            <Search className="w-4 h-4" />
            {isSearching ? 'Recherche...' : 'Rechercher'}
          </Button>
        </div>
      </div>

      {address && (
        <Card className="p-4 neon-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{address}</p>
                  {coordinates && (
                    <p className="text-sm text-muted-foreground">
                      {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShareLocation}
                className="neon-border"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>

            {address && (
              <div className="w-full h-64 rounded-lg overflow-hidden border border-border">
                {googleMapsApiKey ? (
                  <iframe
                    ref={mapRef}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(address)}`}
                    title="Localisation de l'événement"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Voir sur Google Maps
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

