/**
 * Service partagé pour les points d'intérêt autour du lieu.
 * - Google Places (si clé définie) : payant au-delà du crédit gratuit.
 * - Overpass / OpenStreetMap : 100 % gratuit, pas de clé.
 */

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

/**
 * POI autour du lieu via Overpass (OpenStreetMap) — 100 % gratuit, pas de clé.
 * Même format que fetchPointsOfInterest (rating/totalReviews à 0 pour OSM).
 */
export async function fetchPointsOfInterestOSM(coords) {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return [];

  const { lat, lng } = coords;
  const radiusM = 2500; // 2,5 km
  const query = `
[out:json][timeout:15];
(
  node["name"](around:${radiusM},${lat},${lng})["tourism"];
  node["name"](around:${radiusM},${lat},${lng})["amenity"~"restaurant|cafe|bar|museum|theatre|arts_centre"];
  way["name"](around:${radiusM},${lat},${lng})["tourism"];
  way["name"](around:${radiusM},${lat},${lng})["amenity"~"restaurant|cafe|museum|theatre"];
);
out body center;
  `.trim();

  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query
    });
    if (!res.ok) return [];
    const data = await res.json();
    const elements = data.elements || [];

    const withDistance = elements
      .filter(el => {
        const name = el.tags?.name;
        if (!name || name.length < 2) return false;
        const latEl = el.lat ?? el.center?.lat;
        const lonEl = el.lon ?? el.center?.lon;
        return typeof latEl === 'number' && typeof lonEl === 'number';
      })
      .map(el => {
        const latEl = el.lat ?? el.center?.lat;
        const lonEl = el.lon ?? el.center?.lon;
        const distanceKm = calculateDistanceKm(lat, lng, latEl, lonEl);
        const typeTag = el.tags?.tourism || el.tags?.amenity || 'place';
        return {
          name: el.tags.name,
          rating: 0,
          totalReviews: 0,
          types: [typeTag],
          placeId: `osm-${el.type}-${el.id}`,
          coordinates: { lat: latEl, lng: lonEl },
          distanceKm
        };
      });

    return withDistance
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)
      .map(({ distanceKm, ...rest }) => rest);
  } catch (err) {
    console.warn('[placesApi] Overpass POI error:', err);
    return [];
  }
}

const MAJOR_TYPES = [
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

/**
 * Récupère les points d'intérêt autour de coordonnées GPS (Google Places API).
 * @param {{ lat: number, lng: number }} coords - Coordonnées du lieu
 * @param {string} [apiKey] - Clé API Google (défaut: VITE_GOOGLE_MAPS_API_KEY)
 * @returns {Promise<Array<{ name: string, rating: number, totalReviews: number, types: string[], placeId: string, coordinates: { lat: number, lng: number } }>>}
 */
export async function fetchPointsOfInterest(coords, apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || '') {
  if (!apiKey || !coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return [];
  }

  try {
    let allPOI = [];

    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=5000&type=tourist_attraction&key=${apiKey}`;
    const nearbyResponse = await fetch(nearbyUrl);
    const nearbyData = await nearbyResponse.json();

    if (nearbyData.status === 'OK' && nearbyData.results) {
      allPOI = [...allPOI, ...nearbyData.results];
    }

    const additionalTypes = ['museum', 'art_gallery', 'church', 'park', 'landmark'];
    for (const type of additionalTypes.slice(0, 2)) {
      const typeUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=5000&type=${type}&key=${apiKey}`;
      try {
        const typeResponse = await fetch(typeUrl);
        const typeData = await typeResponse.json();
        if (typeData.status === 'OK' && typeData.results) {
          allPOI = [...allPOI, ...typeData.results];
        }
      } catch (err) {
        console.warn('[placesApi] Error fetching type:', type, err);
      }
    }

    const uniquePOI = [];
    const seenIds = new Set();

    for (const place of allPOI) {
      if (!place.place_id || !place.geometry?.location) continue;
      if (seenIds.has(place.place_id)) continue;

      const placeLat = place.geometry.location.lat;
      const placeLng = place.geometry.location.lng;
      const distanceKm = calculateDistanceKm(coords.lat, coords.lng, placeLat, placeLng);

      if (distanceKm > 5) continue;

      const hasGoodRating = place.rating && place.rating >= 4.0;
      const hasEnoughReviews = place.user_ratings_total && place.user_ratings_total >= 5;
      const isMajorType = place.types && place.types.some(t => MAJOR_TYPES.includes(t));

      if ((hasGoodRating && hasEnoughReviews) || isMajorType) {
        seenIds.add(place.place_id);
        uniquePOI.push({ ...place, distanceKm });
      }
    }

    return uniquePOI
      .map(place => ({
        place,
        score: (place.rating || 0) * (place.user_ratings_total || 0) * (1 / (1 + place.distanceKm))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
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
  } catch (error) {
    console.error('[placesApi] Error fetching POI:', error);
    return [];
  }
}
