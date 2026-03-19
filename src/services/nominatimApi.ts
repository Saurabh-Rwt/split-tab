import { LocationTag } from '../types';
import { Storage, STORAGE_KEYS } from '../utils/storage';

const BASE_URL   = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'SplitTab-Assignment/YourName';
const CACHE_SIZE = 5;

export interface NominatimResult {
  place_id:     number;
  display_name: string;
  lat:          string;
  lon:          string;
}

export const NominatimApi = {
  async search(query: string, signal?: AbortSignal): Promise<LocationTag[]> {
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&format=json&limit=5`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal,
    });

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

    const data: NominatimResult[] = await res.json();
    return data.map(item => ({
      name: item.display_name,
      lat:  parseFloat(item.lat),
      lon:  parseFloat(item.lon),
    }));
  },

  async getCached(): Promise<LocationTag[]> {
    const cached = await Storage.get<LocationTag[]>(STORAGE_KEYS.LOCATION_CACHE);
    return cached ?? [];
  },

  async saveToCache(location: LocationTag): Promise<void> {
    const existing = await NominatimApi.getCached();
    const updated  = [
      location,
      ...existing.filter(l => l.name !== location.name),
    ].slice(0, CACHE_SIZE);
    await Storage.set(STORAGE_KEYS.LOCATION_CACHE, updated);
  },
};

// ─────────────────────────────────────────────────────────────
//  Debounced search — 400ms delay + AbortController cancellation
//
//  Data flow on each keystroke:
//  1. Clear pending timer
//  2. Abort previous in-flight request
//  3. Wait 400ms
//  4. Fire new request with fresh AbortController
//  5. Return results to onResults callback
// ─────────────────────────────────────────────────────────────

export function createDebouncedLocationSearch(
  onResults: (results: LocationTag[]) => void,
  onError?:  (err: Error) => void,
  delay = 400,
) {
  let timer:      ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null               = null;

  return (query: string) => {
    if (timer)      { clearTimeout(timer); timer = null; }
    if (controller) { controller.abort();  controller = null; }

    if (!query.trim()) { onResults([]); return; }

    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        const results = await NominatimApi.search(query, controller.signal);
        onResults(results);
      } catch (err: any) {
        if (err.name !== 'AbortError' && onError) onError(err as Error);
      }
    }, delay);
  };
}
