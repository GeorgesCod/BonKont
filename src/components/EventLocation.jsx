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

  // Fonction pour géocoder une adresse et obtenir les coordonnées GPS
  const geocodeAddress = async (addressToGeocode) => {
    if (!addressToGeocode || !addressToGeocode.trim()) {
      console.log('[EventLocation] No address to geocode');
      return null;
    }

    try {
      // Si on a une clé API, utiliser l'API Geocoding de Google Maps
      if (googleMapsApiKey) {
        const encodedAddress = encodeURIComponent(addressToGeocode.trim());
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`;
        
        console.log('[EventLocation] Geocoding address with API:', addressToGeocode);
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          const location = result.geometry.location;
          const coordinates = {
            lat: location.lat,
            lng: location.lng
          };
          
          // Utiliser l'adresse formatée de Google si disponible
          const formattedAddress = result.formatted_address || addressToGeocode.trim();
          
          console.log('[EventLocation] Geocoding successful:', { formattedAddress, coordinates });
          return {
            address: formattedAddress,
            coordinates,
            placeId: result.place_id
          };
        } else {
          console.warn('[EventLocation] Geocoding failed:', data.status, data.error_message);
          return null;
        }
      } else {
        // Fallback : utiliser l'API Nominatim (OpenStreetMap) - gratuite, pas de clé requise
        console.log('[EventLocation] Using Nominatim (OpenStreetMap) for geocoding');
        const encodedAddress = encodeURIComponent(addressToGeocode.trim());
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
        
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'BonKont-App'
          }
        });
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          const coordinates = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          };
          
          console.log('[EventLocation] Nominatim geocoding successful:', { address: addressToGeocode, coordinates });
          return {
            address: addressToGeocode.trim(),
            coordinates,
            displayName: result.display_name
          };
        } else {
          console.warn('[EventLocation] Nominatim geocoding failed: no results');
          return null;
        }
      }
    } catch (error) {
      console.error('[EventLocation] Geocoding error:', error);
      return null;
    }
  };

  useEffect(() => {
    if (location) {
      setAddress(location.address || '');
      setCoordinates(location.coordinates || null);
    }
  }, [location]);

  // Mettre à jour automatiquement location quand l'adresse change (avec debounce et géocodage)
  useEffect(() => {
    // Éviter la boucle infinie : ne pas mettre à jour si location existe déjà avec la même adresse
    if (location && location.address === address.trim() && location.coordinates && location.coordinates.lat !== 0) {
      console.log('[EventLocation] Address unchanged with valid coordinates, skipping update');
      return;
    }

    if (address.trim()) {
      const timer = setTimeout(async () => {
        console.log('[EventLocation] Auto-geocoding address:', address);
        
        // Géocoder l'adresse pour obtenir les coordonnées GPS
        const geocodeResult = await geocodeAddress(address);
        
        if (geocodeResult) {
          const encodedAddress = encodeURIComponent(geocodeResult.address);
          const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
          const mapUrl = googleMapsApiKey 
            ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}`
            : `https://www.google.com/maps?q=${encodedAddress}`;
          
          const newLocation = {
            address: geocodeResult.address,
            coordinates: geocodeResult.coordinates,
            mapUrl,
            placeId: geocodeResult.placeId,
            displayName: geocodeResult.displayName
          };
          
          setCoordinates(geocodeResult.coordinates);
          console.log('[EventLocation] Auto-updating location with GPS coordinates:', newLocation);
          onLocationChange(newLocation);
        } else {
          // Si le géocodage échoue, utiliser l'adresse sans coordonnées valides
          const encodedAddress = encodeURIComponent(address.trim());
          const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
          const mapUrl = googleMapsApiKey 
            ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}`
            : `https://www.google.com/maps?q=${encodedAddress}`;
          
          const newLocation = {
            address: address.trim(),
            coordinates: { lat: 0, lng: 0 },
            mapUrl
          };
          
          console.warn('[EventLocation] Geocoding failed, using address without valid coordinates');
          onLocationChange(newLocation);
        }
      }, 800); // Debounce de 800ms pour éviter trop d'appels API
      
      return () => clearTimeout(timer);
    } else {
      // Réinitialiser location si l'adresse est vide (seulement si location n'est pas déjà null)
      if (location !== null) {
        console.log('[EventLocation] Address is empty, clearing location');
        setCoordinates(null);
        onLocationChange(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

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
    console.log('[EventLocation] Searching for address:', address);
    
    try {
      // Géocoder l'adresse pour obtenir les coordonnées GPS
      const geocodeResult = await geocodeAddress(address);
      
      if (geocodeResult) {
        const encodedAddress = encodeURIComponent(geocodeResult.address);
        const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        const mapUrl = googleMapsApiKey 
          ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}`
          : `https://www.google.com/maps?q=${encodedAddress}`;
        
        const newLocation = {
          address: geocodeResult.address,
          coordinates: geocodeResult.coordinates,
          mapUrl,
          placeId: geocodeResult.placeId,
          displayName: geocodeResult.displayName
        };
        
        setCoordinates(geocodeResult.coordinates);
        onLocationChange(newLocation);
        
        console.log('[EventLocation] Location updated after search with GPS coordinates:', newLocation);
        toast({
          title: "Localisation trouvée",
          description: `Coordonnées GPS: ${geocodeResult.coordinates.lat.toFixed(6)}, ${geocodeResult.coordinates.lng.toFixed(6)}`
        });
      } else {
        // Si le géocodage échoue, utiliser l'adresse sans coordonnées valides
        const encodedAddress = encodeURIComponent(address.trim());
        const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        const mapUrl = googleMapsApiKey 
          ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}`
          : `https://www.google.com/maps?q=${encodedAddress}`;
        
        const newLocation = {
          address: address.trim(),
          coordinates: { lat: 0, lng: 0 },
          mapUrl
        };
        
        setCoordinates(newLocation.coordinates);
        onLocationChange(newLocation);
        
        console.warn('[EventLocation] Geocoding failed, using address without valid coordinates');
        toast({
          variant: "destructive",
          title: "Géocodage échoué",
          description: "L'adresse a été enregistrée mais les coordonnées GPS n'ont pas pu être récupérées."
        });
      }
    } catch (error) {
      console.error('[EventLocation] Error during geocoding:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la recherche de localisation."
      });
    } finally {
      setIsSearching(false);
    }
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
        <div className="flex flex-col sm:flex-row gap-2">
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
            className="gap-2 w-full sm:w-auto"
          >
            <Search className="w-4 h-4" />
            <span className="text-xs sm:text-sm">{isSearching ? 'Recherche...' : 'Rechercher'}</span>
          </Button>
        </div>
      </div>

      {address && (
        <Card className="p-3 sm:p-4 neon-border">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-1 sm:mt-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base break-words">{address}</p>
                  {coordinates && coordinates.lat !== 0 && coordinates.lng !== 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground break-all">
                      GPS: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground italic">
                      Recherche des coordonnées GPS...
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShareLocation}
                className="neon-border shrink-0"
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

