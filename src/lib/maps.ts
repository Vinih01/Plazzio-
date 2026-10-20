/**
 * Google Maps and Geolocation Utilities with graceful fallback
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

// Default center (São Paulo, SP)
export const DEFAULT_CENTER: Coordinates = {
  lat: -23.5505,
  lng: -46.6333,
};

/**
 * Calculates distance in kilometers between two lat/lng points using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Geocodes an address string using Google Maps Geocoding API if key is available,
 * otherwise returns approximate mock coordinates based on city.
 */
export async function geocodeAddress(address: string, city: string): Promise<Coordinates> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address + ', ' + city + ', Brasil'
        )}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results[0]?.geometry?.location) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch (e) {
      console.warn('Google Maps Geocoding API fallback:', e);
    }
  }

  // Fallback mock jitter around São Paulo center based on string hash
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = (hash % 100) / 1000;
  const lngOffset = ((hash >> 3) % 100) / 1000;

  return {
    lat: DEFAULT_CENTER.lat + latOffset,
    lng: DEFAULT_CENTER.lng + lngOffset,
  };
}

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Loads Google Maps JavaScript API dynamically if configured
 */
let isMapsLoaded = false;
export function loadGoogleMapsScript(callback: () => void) {
  if (isMapsLoaded || window.google?.maps) {
    isMapsLoaded = true;
    callback();
    return;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.info('VITE_GOOGLE_MAPS_API_KEY not configured. Running in simulated maps mode.');
    return;
  }

  const existingScript = document.getElementById('google-maps-script');
  if (existingScript) {
    existingScript.addEventListener('load', () => {
      isMapsLoaded = true;
      callback();
    });
    return;
  }

  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    isMapsLoaded = true;
    callback();
  };
  document.head.appendChild(script);
}
