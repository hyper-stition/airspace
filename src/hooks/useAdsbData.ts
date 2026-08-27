import { useState, useEffect, useRef } from 'react';
import type { AdsbAircraft } from '../types/uk-airspace';
import { LONDON_CENTER } from '../config/london';

const ADSB_URL = '/api/adsb/v2/lat/{lat}/lon/{lon}/dist/{dist}';
const REFRESH_INTERVAL_MS = 10_000; // 10 seconds
const QUERY_RADIUS_NM = 80;

interface UseAdsbDataReturn {
  aircraft: AdsbAircraft[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export function useAdsbData(enabled: boolean): UseAdsbDataReturn {
  const [aircraft, setAircraft] = useState<AdsbAircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAircraft([]);
      setError(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const url = ADSB_URL
      .replace('{lat}', LONDON_CENTER.lat.toFixed(3))
      .replace('{lon}', LONDON_CENTER.lon.toFixed(3))
      .replace('{dist}', String(QUERY_RADIUS_NM));

    async function fetch_data() {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const res = await fetch(url, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`ADS-B API ${res.status}`);
        const data = await res.json();
        const ac: AdsbAircraft[] = (data.ac || []).filter(
          (a: AdsbAircraft) => a.lat !== undefined && a.lon !== undefined,
        );
        setAircraft(ac);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err as Error);
        }
      } finally {
        setLoading(false);
      }
    }

    fetch_data();
    timerRef.current = setInterval(fetch_data, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [enabled]);

  return { aircraft, loading, error, lastUpdated };
}

// Classify an aircraft by its ADS-B category code
export function classifyAircraft(aircraft: AdsbAircraft): 'helicopter' | 'jet' | 'prop' | 'unknown' {
  const cat = (aircraft.category || '').toUpperCase();
  const type = (aircraft.t || '').toUpperCase();

  // ADS-B emitter categories:
  // A1 = Light (< 15,500 lbs)
  // A2 = Small (15,500 to 75,000 lbs)
  // A3 = Large (75,000 to 300,000 lbs)
  // A4 = High Vortex Large
  // A5 = Heavy (> 300,000 lbs)
  // A6 = High Performance
  // A7 = Rotorcraft
  // B1 = Glider/Sailplane
  // B2 = Lighter-than-air
  // B3 = Parachutist
  // B4 = Ultralight
  // B5 = Reserved
  // B6 = UAV
  // B7 = Space/Transatmospheric
  // C1 = Emergency surface vehicle
  // C2 = Service surface vehicle
  // C3 = Ground obstacle

  if (cat === 'A7') return 'helicopter';

  // Type code heuristics (approximate – not reliable for all operators)
  if (type.startsWith('R') || type === 'EC35' || type === 'EC45' || type === 'H60'
    || type === 'S76' || type === 'B06' || type === 'B505' || type === 'AS32'
    || type === 'A109' || type === 'A119' || type === 'H125' || type === 'H145') {
    return 'helicopter';
  }

  if (cat === 'A3' || cat === 'A4' || cat === 'A5') return 'jet'; // Large/Heavy by weight
  if (cat === 'A6') return 'jet'; // High performance (typically fast jets)
  // A2 = 15,500–75,000 lbs – weight class only; includes turboprops, business jets, regional jets.
  // Cannot reliably infer propulsion from weight alone → classify unknown.
  if (cat === 'A1') return 'prop'; // Light (< 15,500 lbs) – predominantly piston

  return 'unknown';
}

export function getAircraftAltitudeFt(aircraft: AdsbAircraft): number | null {
  if (aircraft.alt_geom !== undefined) return aircraft.alt_geom;
  if (aircraft.alt_baro !== undefined && aircraft.alt_baro !== 'ground') {
    return aircraft.alt_baro as number;
  }
  return null;
}
