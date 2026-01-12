/**
 * Geocoding Service
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * Implements rate limiting (1 request/second) and caching
 */

export interface GeocodedLocation {
  lat: number;
  lon: number;
  address: string;
  displayName: string;
  confidence: 'high' | 'medium' | 'low';
}

// In-memory cache for geocoding results
// Key: location name, Value: geocoded result
const geocodeCache = new Map<string, GeocodedLocation>();

// Rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

// Predefined coordinates for major Iranian cities
const CITY_COORDINATES: Record<string, { lat: number; lon: number; address: string }> = {
  // Major cities (Farsi)
  'تهران': { lat: 35.6892, lon: 51.389, address: 'Tehran, Iran' },
  'مشهد': { lat: 36.2974, lon: 59.6059, address: 'Mashhad, Iran' },
  'اصفهان': { lat: 32.6546, lon: 51.668, address: 'Isfahan, Iran' },
  'شیراز': { lat: 29.5918, lon: 52.5836, address: 'Shiraz, Iran' },
  'تبریز': { lat: 38.08, lon: 46.2919, address: 'Tabriz, Iran' },
  'کرج': { lat: 35.8327, lon: 50.9916, address: 'Karaj, Iran' },
  'قم': { lat: 34.6416, lon: 50.8746, address: 'Qom, Iran' },
  'اهواز': { lat: 31.3183, lon: 48.6706, address: 'Ahvaz, Iran' },
  'کرمانشاه': { lat: 34.3142, lon: 47.065, address: 'Kermanshah, Iran' },
  'رشت': { lat: 37.2808, lon: 49.5832, address: 'Rasht, Iran' },
  'اراک': { lat: 34.0917, lon: 49.6892, address: 'Arak, Iran' },
  'همدان': { lat: 34.7992, lon: 48.5146, address: 'Hamedan, Iran' },
  'یزد': { lat: 31.8974, lon: 54.3569, address: 'Yazd, Iran' },
  'اردبیل': { lat: 38.2498, lon: 48.2933, address: 'Ardabil, Iran' },
  'بندرعباس': { lat: 27.1865, lon: 56.2808, address: 'Bandar Abbas, Iran' },
  'کرمان': { lat: 30.2832, lon: 57.0788, address: 'Kerman, Iran' },
  'قزوین': { lat: 36.2797, lon: 50.0049, address: 'Qazvin, Iran' },
  'زنجان': { lat: 36.6736, lon: 48.4787, address: 'Zanjan, Iran' },
  'سنندج': { lat: 35.3146, lon: 46.9978, address: 'Sanandaj, Iran' },
  'خرم‌آباد': { lat: 33.4877, lon: 48.3569, address: 'Khorramabad, Iran' },
  'گرگان': { lat: 36.8439, lon: 54.4436, address: 'Gorgan, Iran' },
  'ساری': { lat: 36.5633, lon: 53.0601, address: 'Sari, Iran' },
  'بابل': { lat: 36.5511, lon: 52.6786, address: 'Babol, Iran' },
  'قشم': { lat: 26.9688, lon: 56.0754, address: 'Qeshm Island, Iran' },
  'فسا': { lat: 28.9387, lon: 53.6481, address: 'Fasa, Iran' },
  'کوهدشت': { lat: 33.5335, lon: 47.6079, address: 'Kuhdasht, Iran' },
  'رامهرمز': { lat: 31.28, lon: 49.6084, address: 'Ramhormoz, Iran' },
  'فولادشهر': { lat: 32.4822, lon: 51.4043, address: 'Fuladshahr, Iran' },
  'ازنا': { lat: 33.4607, lon: 49.4516, address: 'Azna, Iran' },
  'لردگان': { lat: 31.51, lon: 50.83, address: 'Lordegan, Iran' },
  'کوار': { lat: 29.205, lon: 52.691, address: 'Kavar, Iran' },
  'اسدآباد': { lat: 34.7824, lon: 48.1201, address: 'Asadabad, Iran' },
  'مرودشت': { lat: 29.8741, lon: 52.8002, address: 'Marvdasht, Iran' },
  'کازرون': { lat: 29.6194, lon: 51.6543, address: 'Kazerun, Iran' },
  'ایلام': { lat: 33.6368, lon: 46.4218, address: 'Ilam, Iran' },
  'شازند': { lat: 33.9318, lon: 49.4031, address: 'Shazand, Iran' },
  'یاسوج': { lat: 30.6682, lon: 51.588, address: 'Yasuj, Iran' },
  'ملکشاهی': { lat: 33.3924, lon: 46.5987, address: 'Malekshahi, Iran' },

  // Major cities (English)
  'Tehran': { lat: 35.6892, lon: 51.389, address: 'Tehran, Iran' },
  'Mashhad': { lat: 36.2974, lon: 59.6059, address: 'Mashhad, Iran' },
  'Isfahan': { lat: 32.6546, lon: 51.668, address: 'Isfahan, Iran' },
  'Shiraz': { lat: 29.5918, lon: 52.5836, address: 'Shiraz, Iran' },
  'Tabriz': { lat: 38.08, lon: 46.2919, address: 'Tabriz, Iran' },
  'Karaj': { lat: 35.8327, lon: 50.9916, address: 'Karaj, Iran' },
  'Qom': { lat: 34.6416, lon: 50.8746, address: 'Qom, Iran' },
  'Ahvaz': { lat: 31.3183, lon: 48.6706, address: 'Ahvaz, Iran' },
  'Kermanshah': { lat: 34.3142, lon: 47.065, address: 'Kermanshah, Iran' },
  'Rasht': { lat: 37.2808, lon: 49.5832, address: 'Rasht, Iran' },
  'Arak': { lat: 34.0917, lon: 49.6892, address: 'Arak, Iran' },
  'Hamedan': { lat: 34.7992, lon: 48.5146, address: 'Hamedan, Iran' },
  'Yazd': { lat: 31.8974, lon: 54.3569, address: 'Yazd, Iran' },
  'Ardabil': { lat: 38.2498, lon: 48.2933, address: 'Ardabil, Iran' },
  'Bandar Abbas': { lat: 27.1865, lon: 56.2808, address: 'Bandar Abbas, Iran' },
  'Kerman': { lat: 30.2832, lon: 57.0788, address: 'Kerman, Iran' },
  'Qazvin': { lat: 36.2797, lon: 50.0049, address: 'Qazvin, Iran' },
  'Zanjan': { lat: 36.6736, lon: 48.4787, address: 'Zanjan, Iran' },
  'Sanandaj': { lat: 35.3146, lon: 46.9978, address: 'Sanandaj, Iran' },
  'Khorramabad': { lat: 33.4877, lon: 48.3569, address: 'Khorramabad, Iran' },
  'Gorgan': { lat: 36.8439, lon: 54.4436, address: 'Gorgan, Iran' },
  'Sari': { lat: 36.5633, lon: 53.0601, address: 'Sari, Iran' },
  'Babol': { lat: 36.5511, lon: 52.6786, address: 'Babol, Iran' },
  'Qeshm': { lat: 26.9688, lon: 56.0754, address: 'Qeshm Island, Iran' },
  'Fasa': { lat: 28.9387, lon: 53.6481, address: 'Fasa, Iran' },
  'Kuhdasht': { lat: 33.5335, lon: 47.6079, address: 'Kuhdasht, Iran' },
  'Ramhormoz': { lat: 31.28, lon: 49.6084, address: 'Ramhormoz, Iran' },
  'Fuladshahr': { lat: 32.4822, lon: 51.4043, address: 'Fuladshahr, Iran' },
  'Azna': { lat: 33.4607, lon: 49.4516, address: 'Azna, Iran' },
  'Lordegan': { lat: 31.51, lon: 50.83, address: 'Lordegan, Iran' },
  'Kavar': { lat: 29.205, lon: 52.691, address: 'Kavar, Iran' },
  'Asadabad': { lat: 34.7824, lon: 48.1201, address: 'Asadabad, Iran' },
  'Marvdasht': { lat: 29.8741, lon: 52.8002, address: 'Marvdasht, Iran' },
  'Kazerun': { lat: 29.6194, lon: 51.6543, address: 'Kazerun, Iran' },
  'Ilam': { lat: 33.6368, lon: 46.4218, address: 'Ilam, Iran' },
  'Shazand': { lat: 33.9318, lon: 49.4031, address: 'Shazand, Iran' },
  'Yasuj': { lat: 30.6682, lon: 51.588, address: 'Yasuj, Iran' },
  'Malekshahi': { lat: 33.3924, lon: 46.5987, address: 'Malekshahi, Iran' },

  // Tehran neighborhoods
  'Vanak': { lat: 35.7589, lon: 51.4084, address: 'Vanak, Tehran, Iran' },
  'Velenjak': { lat: 35.8073, lon: 51.4025, address: 'Velenjak, Tehran, Iran' },
  'Niavaran': { lat: 35.8156, lon: 51.4699, address: 'Niavaran, Tehran, Iran' },
  'Tehranpars': { lat: 35.7424, lon: 51.534, address: 'Tehranpars, Tehran, Iran' },
  'Narmak': { lat: 35.7283, lon: 51.4931, address: 'Narmak, Tehran, Iran' },
  'Nazi Abad': { lat: 35.6379, lon: 51.4050, address: 'Nazi Abad, Tehran, Iran' },
};

/**
 * Wait for rate limit interval
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Normalize location name for cache lookup
 */
function normalizeLocationName(location: string): string {
  return location.toLowerCase().trim();
}

/**
 * Check if location is in predefined coordinates
 */
function getPredefinedCoordinates(location: string): GeocodedLocation | null {
  const normalized = normalizeLocationName(location);

  // Try exact match first
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalizeLocationName(key) === normalized) {
      return {
        ...coords,
        displayName: coords.address,
        confidence: 'high',
      };
    }
  }

  // Try partial match (contains)
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (
      normalizeLocationName(key).includes(normalized) ||
      normalized.includes(normalizeLocationName(key))
    ) {
      return {
        ...coords,
        displayName: coords.address,
        confidence: 'medium',
      };
    }
  }

  return null;
}

/**
 * Geocode a location using Nominatim API
 */
export async function geocodeLocation(location: string): Promise<GeocodedLocation | null> {
  const normalized = normalizeLocationName(location);

  // Check cache first
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized)!;
  }

  // Check predefined coordinates
  const predefined = getPredefinedCoordinates(location);
  if (predefined) {
    geocodeCache.set(normalized, predefined);
    return predefined;
  }

  // Rate limit before API call
  await waitForRateLimit();

  try {
    // Query Nominatim API
    const params = new URLSearchParams({
      q: `${location}, Iran`,
      format: 'json',
      limit: '1',
      addressdetails: '1',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'RiseUpNewsApp/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn(`No geocoding results for: ${location}`);
      return null;
    }

    const result = data[0];
    const geocoded: GeocodedLocation = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      address: result.address?.city || result.address?.town || location,
      displayName: result.display_name,
      confidence: result.importance > 0.5 ? 'high' : result.importance > 0.3 ? 'medium' : 'low',
    };

    // Cache result
    geocodeCache.set(normalized, geocoded);

    return geocoded;
  } catch (error) {
    console.error(`Geocoding error for ${location}:`, error);
    return null;
  }
}

/**
 * Batch geocode multiple locations with rate limiting
 */
export async function geocodeLocations(
  locations: string[]
): Promise<Map<string, GeocodedLocation>> {
  const results = new Map<string, GeocodedLocation>();
  const uniqueLocations = [...new Set(locations)];

  for (const location of uniqueLocations) {
    const geocoded = await geocodeLocation(location);
    if (geocoded) {
      results.set(location, geocoded);
    }
  }

  return results;
}

/**
 * Get cache statistics
 */
export function getGeocodeStats() {
  return {
    cacheSize: geocodeCache.size,
    predefinedCount: Object.keys(CITY_COORDINATES).length,
    totalCached: geocodeCache.size,
  };
}

/**
 * Clear geocode cache (useful for testing)
 */
export function clearGeocodeCache() {
  geocodeCache.clear();
}
