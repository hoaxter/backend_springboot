const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Get driving route between two points using OSRM public API.
 * Returns { distance (km), duration (min), coordinates [[lat,lng], ...] }
 */
export async function getRoute(startLat, startLng, endLat, endLng) {
  try {
    const url = `${OSRM_BASE}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    // OSRM returns [lng, lat] — convert to [lat, lng] for Leaflet
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    return {
      distance: Math.round((route.distance / 1000) * 100) / 100, // meters -> km
      duration: Math.round((route.duration / 60) * 100) / 100,    // seconds -> min
      coordinates
    };
  } catch (err) {
    console.error('OSRM routing error:', err);
    return null;
  }
}

/**
 * Get reverse geocode address from coordinates using Nominatim.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`;
    const resp = await fetch(url, {
      headers: { 'Accept-Language': 'en' }
    });
    const data = await resp.json();
    if (data.display_name) {
      // Return shorter address
      const parts = data.display_name.split(',');
      return parts.slice(0, 3).join(',').trim();
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
