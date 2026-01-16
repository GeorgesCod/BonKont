 import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Share2, Star, MapPinned, ArrowLeft, Copy, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EventLocation({ initialLocation, onLocationChange = () => {}, isSejour = false }) {
  const { toast } = useToast();
  const mapRef = useRef(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  const [pointsOfInterest, setPointsOfInterest] = useState([]);
  const [isLoadingPOI, setIsLoadingPOI] = useState(false);

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

  // Fonction pour calculer la distance entre deux points GPS (formule de Haversine)
  const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fonction pour récupérer les points d'intérêt majeurs via Google Places API
  const fetchPointsOfInterest = async (coords, placeId, address) => {
    if (!googleMapsApiKey || !coords) return [];
    
    setIsLoadingPOI(true);
    try {
      // Types de lieux prioritaires pour les sites majeurs
      const majorTypes = [
        'tourist_attraction',
        'museum',
        'art_gallery',
        'church',
        'mosque',
        'synagogue',
        'temple',
        'park',
        'zoo',
        'aquarium',
        'stadium',
        'amusement_park',
        'shopping_mall',
        'landmark'
      ];
      
      let allPOI = [];
      
      // Recherche principale: Nearby Search basée UNIQUEMENT sur les coordonnées
      // Utiliser un rayon de 5km pour s'assurer de rester dans la zone
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=5000&type=tourist_attraction&key=${googleMapsApiKey}`;
      const nearbyResponse = await fetch(nearbyUrl);
      const nearbyData = await nearbyResponse.json();
      
      if (nearbyData.status === 'OK' && nearbyData.results) {
        allPOI = [...allPOI, ...nearbyData.results];
      }
      
      // Recherche supplémentaire: Autres types majeurs dans un rayon plus large mais filtré strictement
      const additionalTypes = ['museum', 'art_gallery', 'church', 'park', 'landmark'];
      for (const type of additionalTypes.slice(0, 2)) { // Limiter à 2 types pour éviter trop d'appels
        const typeUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=5000&type=${type}&key=${googleMapsApiKey}`;
        try {
          const typeResponse = await fetch(typeUrl);
          const typeData = await typeResponse.json();
          if (typeData.status === 'OK' && typeData.results) {
            allPOI = [...allPOI, ...typeData.results];
          }
        } catch (err) {
          console.warn(`[EventLocation] Error fetching ${type}:`, err);
        }
      }
      
      // Filtrer strictement par distance réelle (max 5km) et dédupliquer
      const uniquePOI = [];
      const seenIds = new Set();
      
      for (const place of allPOI) {
        if (!place.place_id || !place.geometry?.location) continue;
        if (seenIds.has(place.place_id)) continue;
        
        // Calculer la distance réelle avec Haversine
        const placeLat = place.geometry.location.lat;
        const placeLng = place.geometry.location.lng;
        const distanceKm = calculateDistanceKm(coords.lat, coords.lng, placeLat, placeLng);
        
        // Filtrer strictement : max 5km
        if (distanceKm > 5) continue;
        
        // Prioriser les sites avec de bons ratings et plusieurs avis
        const hasGoodRating = place.rating && place.rating >= 4.0;
        const hasEnoughReviews = place.user_ratings_total && place.user_ratings_total >= 5;
        const isMajorType = place.types && place.types.some(type => majorTypes.includes(type));
        
        // Accepter si : bon rating + avis OU type majeur
        if ((hasGoodRating && hasEnoughReviews) || isMajorType) {
          seenIds.add(place.place_id);
          uniquePOI.push({
            ...place,
            distanceKm // Garder la distance pour le tri
          });
        }
      }
      
      // Trier par popularité (rating * nombre d'avis) et distance (plus proche = mieux)
      // Prendre les 3 meilleurs
      const poi = uniquePOI
        .map(place => ({
          place,
          score: (place.rating || 0) * (place.user_ratings_total || 0) * (1 / (1 + place.distanceKm)) // Pénaliser la distance
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ place }) => ({
          name: place.name,
          rating: place.rating || 0,
          totalReviews: place.user_ratings_total || 0,
          types: place.types || [],
          placeId: place.place_id,
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          }
        }));
      
      setPointsOfInterest(poi);
      return poi;
    } catch (error) {
      console.error('[EventLocation] Error fetching POI:', error);
      setPointsOfInterest([]);
      return [];
    } finally {
      setIsLoadingPOI(false);
    }
  };

  // Détection automatique du copier-coller
  useEffect(() => {
    const handlePaste = (e) => {
      const pastedText = e.clipboardData?.getData('text') || '';
      if (pastedText.trim() && pastedText.length > 5) {
        // Si l'utilisateur colle une adresse, la géocoder automatiquement
        setTimeout(() => {
          const trimmed = pastedText.trim();
          setAddress(trimmed);
          // Le debounce effect se chargera de la géocodage
        }, 100);
      }
    };

    const inputElement = document.getElementById('address');
    if (inputElement) {
      inputElement.addEventListener('paste', handlePaste);
      return () => inputElement.removeEventListener('paste', handlePaste);
    }
  }, []);

  // Debounce: géocode automatiquement quand address change
  useEffect(() => {
    const trimmed = (address || '').trim();

    // Si vide → reset propre
    if (!trimmed) {
      setCoordinates(null);
      setPointsOfInterest([]);
      if (typeof onLocationChange === 'function') onLocationChange(null);
      return;
    }

    const timer = setTimeout(async () => {
      const result = await geocodeAddress(trimmed);

      if (result?.coordinates) {
        setCoordinates(result.coordinates);

        // Toujours récupérer les 3 sites d'intérêt majeurs pour tous les événements
        let poi = [];
        if (result.coordinates) {
          poi = await fetchPointsOfInterest(result.coordinates, result.placeId, result.address || trimmed);
        } else {
          setPointsOfInterest([]);
        }

        const newLocation = {
          address: result.address || trimmed,
          coordinates: result.coordinates,
          mapUrl: buildMapUrl(result.address || trimmed),
          placeId: result.placeId,
          displayName: result.displayName,
          pointsOfInterest: poi, // Inclure les points d'intérêt dans la localisation
        };

        if (typeof onLocationChange === 'function') onLocationChange(newLocation);
      } else {
        // Géocodage échoué : on garde l'adresse, coords null (pas 0/0)
        const newLocation = {
          address: trimmed,
          coordinates: null,
          mapUrl: buildMapUrl(trimmed),
        };

        setCoordinates(null);
        setPointsOfInterest([]);
        if (typeof onLocationChange === 'function') onLocationChange(newLocation);
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isSejour]);

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

        // Toujours récupérer les 3 sites d'intérêt majeurs pour tous les événements
        let poi = [];
        if (result.coordinates) {
          poi = await fetchPointsOfInterest(result.coordinates, result.placeId, result.address || trimmed);
        }

        const newLocation = {
          address: result.address || trimmed,
          coordinates: result.coordinates,
          mapUrl: buildMapUrl(result.address || trimmed),
          placeId: result.placeId,
          displayName: result.displayName,
          pointsOfInterest: poi, // Inclure les points d'intérêt dans la localisation
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

  // Fonction pour copier l'adresse dans le presse-papier
  const handleCopyAddress = async () => {
    const trimmed = (address || '').trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Aucune adresse',
        description: "Veuillez d'abord saisir une adresse.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmed);
      toast({
        title: 'Adresse copiée !',
        description: 'Vous pouvez maintenant la coller dans Google Maps ou une autre application.',
      });
    } catch (err) {
      console.error('[EventLocation] Copy error:', err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de copier l\'adresse.',
      });
    }
  };

  // Effet pour afficher un message d'aide au chargement
  useEffect(() => {
    // Afficher un message d'aide au focus de la page
    const handleFocus = () => {
      const addressInput = document.getElementById('address');
      if (addressInput && !addressInput.value.trim()) {
        // Si le champ est vide, suggérer de coller l'adresse
        setTimeout(() => {
          toast({
            title: '💡 Astuce',
            description: 'Collez l\'adresse copiée depuis Maps dans le champ ci-dessous',
            duration: 5000,
          });
        }, 500);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <div className="space-y-4 relative">
      {/* Message d'aide très visible en haut */}
      <Card className="p-4 bg-primary/10 border-2 border-primary neon-border">
        <div className="flex items-start gap-3">
          <Home className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-base mb-2 text-foreground">
              📍 Comment revenir au champ adresse ?
            </h3>
            <ol className="text-sm text-foreground space-y-1.5 list-decimal list-inside">
              <li>Copiez l'adresse depuis Google Maps</li>
              <li>Revenez à cette page Bonkont (onglet ou application)</li>
              <li>Cliquez sur le bouton <strong className="text-primary">"Retour au champ adresse"</strong> ci-dessous</li>
              <li>Collez l'adresse (Ctrl+V ou Cmd+V)</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Bouton flottant toujours visible pour revenir au champ adresse */}
      <div 
        className="fixed bottom-20 right-4 z-[100] sm:bottom-24 sm:right-6"
        style={{ 
          position: 'fixed',
          zIndex: 100,
          pointerEvents: 'auto'
        }}
      >
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Faire défiler vers le haut pour s'assurer que l'utilisateur voit le formulaire
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Focus sur le champ d'adresse pour faciliter le retour
            setTimeout(() => {
              const addressInput = document.getElementById('address');
              if (addressInput) {
                addressInput.focus();
                addressInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Sélectionner tout le texte pour faciliter le remplacement
                addressInput.select();
              }
            }, 300);
            
            toast({
              title: '✅ Retour au champ adresse',
              description: 'Le champ est prêt - Collez votre adresse (Ctrl+V ou Cmd+V)',
              duration: 3000,
            });
          }}
          className="gap-2 neon-border shadow-2xl button-glow min-h-[56px] min-w-[56px] bg-primary text-primary-foreground hover:bg-primary/90"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
          }}
          size="lg"
          title="Revenir au champ adresse - Cliquez ici après avoir copié l'adresse depuis Maps"
        >
          <Home className="w-6 h-6" />
          <span className="hidden sm:inline text-sm font-bold">Retour adresse</span>
        </Button>
      </div>

      {/* Bouton retour visible pour revenir à l'application */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // Faire défiler vers le haut pour s'assurer que l'utilisateur voit le formulaire
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Focus sur le champ d'adresse pour faciliter le retour
            const addressInput = document.getElementById('address');
            if (addressInput) {
              setTimeout(() => {
                addressInput.focus();
                addressInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
            }
          }}
          className="gap-2 neon-border"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs sm:text-sm">Retour au champ adresse</span>
        </Button>
        
        {address.trim() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAddress}
            className="gap-2 neon-border"
            title="Copier l'adresse"
          >
            <Copy className="w-4 h-4" />
            <span className="text-xs sm:text-sm hidden sm:inline">Copier</span>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Lieu de l'événement</Label>
        <div className="bg-muted/50 border border-border rounded-lg p-3 mb-2">
          <p className="text-xs sm:text-sm text-foreground font-medium mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Champ de saisie d'adresse
          </p>
          <p className="text-xs text-muted-foreground">
            Collez directement une adresse depuis Google Maps ou saisissez-la manuellement
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onPaste={(e) => {
                // Laisser le comportement par défaut, puis géocoder automatiquement
                const pastedText = e.clipboardData?.getData('text') || '';
                if (pastedText.trim() && pastedText.length > 5) {
                  setTimeout(() => {
                    setAddress(pastedText.trim());
                    toast({
                      title: 'Adresse détectée',
                      description: 'Géocodage en cours...',
                    });
                  }, 100);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Ex: 123 Rue de la Paix, Paris ou collez une adresse"
              className="pl-10 neon-border"
              autoFocus={false}
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

      {/* Points d'intérêt majeurs - toujours affichés si disponibles */}
      {coordinates && (
        <Card className="p-4 neon-border">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-base sm:text-lg">Meilleurs spots à visiter</h3>
            </div>
            
            {isLoadingPOI ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>Recherche des meilleurs points d'intérêt...</p>
              </div>
            ) : pointsOfInterest.length > 0 ? (
              <div className="space-y-3">
                {pointsOfInterest.map((poi, index) => (
                  <div key={poi.placeId || index} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base mb-1 break-words">{poi.name}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium">{poi.rating.toFixed(1)}</span>
                          </div>
                          {poi.totalReviews >= 2 && (
                            <Badge variant="outline" className="text-xs">
                              {poi.totalReviews} avis
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Ces points d'intérêt seront partagés avec les participants
                </p>
              </div>
            ) : coordinates ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Aucun point d'intérêt trouvé avec au moins 2 avis</p>
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
