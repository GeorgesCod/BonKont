 import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MapPin, Search, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EventLocation({ initialLocation, onLocationChange = () => {} }) {
  const { toast } = useToast();
  const mapRef = useRef(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Normaliser initialLocation (peut être string ou objet)
  const normalizedInitial = useMemo(() => {
    if (!initialLocation) return null;
    if (typeof initialLocation === 'string') {
      return { address: initialLocation, coordinates: null };
    }
    if (typeof initialLocation === 'object') {
      return {
        address: initialLocation.address || '',
        coordinates: initialLocation.coordinates || null,
        mapUrl: initialLocation.mapUrl,
        placeId: initialLocation.placeId,
        displayName: initialLocation.displayName,
      };
    }
    return null;
  }, [initialLocation]);

  const [address, setAddress] = useState(normalizedInitial?.address || '');
  const [coordinates, setCoordinates] = useState(normalizedInitial?.coordinates || null);
  const [isSearching, setIsSearching] = useState(false);

  // Sync quand initialLocation change
  useEffect(() => {
    if (!normalizedInitial) return;
    setAddress(normalizedInitial.address || '');
    setCoordinates(normalizedInitial.coordinates || null);
  }, [normalizedInitial]);

  // --- Geocoding helpers ---
  const geocodeAddress = async (addressToGeocode) => {
    const raw = (addressToGeocode || '').trim();
    if (!raw) return null;

    try {
      if (googleMapsApiKey) {
        const encoded = encodeURIComponent(raw);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${googleMapsApiKey}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK' && data.results?.length) {
          const r = data.results[0];
          const loc = r.geometry.location;
          return {
            address: r.formatted_address || raw,
            coordinates: { lat: loc.lat, lng: loc.lng },
            placeId: r.place_id,
          };
        }
        return null;
      }

      // Fallback Nominatim
      const encoded = encodeURIComponent(raw);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const r = data[0];
        return {
          address: raw,
          coordinates: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
          displayName: r.display_name,
        };
      }
      return null;
    } catch (err) {
      console.error('[EventLocation] Geocoding error:', err);
      return null;
    }
  };

  const buildMapUrl = (addr) => {
    const encoded = encodeURIComponent(addr);
    return googleMapsApiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encoded}`
      : `https://www.google.com/maps?q=${encoded}`;
  };

  // Debounce: géocode automatiquement quand address change
  useEffect(() => {
    const trimmed = (address || '').trim();

    // Si vide → reset propre
    if (!trimmed) {
      setCoordinates(null);
      if (typeof onLocationChange === 'function') onLocationChange(null);
      return;
    }

    const timer = setTimeout(async () => {
      const result = await geocodeAddress(trimmed);

      if (result?.coordinates) {
        setCoordinates(result.coordinates);

        const newLocation = {
          address: result.address || trimmed,
          coordinates: result.coordinates,
          mapUrl: buildMapUrl(result.address || trimmed),
          placeId: result.placeId,
          displayName: result.displayName,
        };

        if (typeof onLocationChange === 'function') onLocationChange(newLocation);
      } else {
        // Géocodage échoué : on garde l’adresse, coords null (pas 0/0)
        const newLocation = {
          address: trimmed,
          coordinates: null,
          mapUrl: buildMapUrl(trimmed),
        };

        setCoordinates(null);
        if (typeof onLocationChange === 'function') onLocationChange(newLocation);
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleSearch = async () => {
    const trimmed = (address || '').trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Adresse requise',
        description: 'Veuillez saisir une adresse.',
      });
      return;
    }

    setIsSearching(true);
    try {
      const result = await geocodeAddress(trimmed);

      if (result?.coordinates) {
        setCoordinates(result.coordinates);

        const newLocation = {
          address: result.address || trimmed,
          coordinates: result.coordinates,
          mapUrl: buildMapUrl(result.address || trimmed),
          placeId: result.placeId,
          displayName: result.displayName,
        };

        if (typeof onLocationChange === 'function') onLocationChange(newLocation);

        toast({
          title: 'Localisation trouvée',
          description: `GPS: ${result.coordinates.lat.toFixed(6)}, ${result.coordinates.lng.toFixed(6)}`,
        });
      } else {
        setCoordinates(null);

        const newLocation = {
          address: trimmed,
          coordinates: null,
          mapUrl: buildMapUrl(trimmed),
        };

        if (typeof onLocationChange === 'function') onLocationChange(newLocation);

        toast({
          variant: 'destructive',
          title: 'Géocodage échoué',
          description: "L'adresse est enregistrée, mais les coordonnées GPS n'ont pas pu être récupérées.",
        });
      }
    } catch (err) {
      console.error('[EventLocation] handleSearch error:', err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la recherche.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleShareLocation = async () => {
    const trimmed = (address || '').trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Aucune localisation',
        description: "Veuillez d'abord saisir une adresse.",
      });
      return;
    }

    const shareUrl = coordinates
      ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Localisation de l'événement",
          text: `Localisation : ${trimmed}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Lien copié !',
          description: 'Le lien a été copié dans le presse-papier.',
        });
      }
    } catch (err) {
      console.warn('[EventLocation] Share cancelled/error:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Lieu de l'événement</Label>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
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

      {!!(address || '').trim() && (
        <Card className="p-3 sm:p-4 neon-border">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 mt-1 sm:mt-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base break-words">{address.trim()}</p>

                  {coordinates ? (
                    <p className="text-xs sm:text-sm text-muted-foreground break-all">
                      GPS: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground italic">
                      Coordonnées GPS non disponibles
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleShareLocation}
                className="neon-border shrink-0"
                title="Partager la localisation"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-full h-64 rounded-lg overflow-hidden border border-border">
              {googleMapsApiKey ? (
                <iframe
                  ref={mapRef}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={buildMapUrl(address.trim())}
                  title="Localisation de l'événement"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(address.trim())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Voir sur Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
