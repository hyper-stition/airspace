import { useState, useEffect, useMemo } from 'react';
import type { ProcessedVolume, AirspaceVolume, DataManifest } from '../types/uk-airspace';
import { renderFloorMeters, renderExtrusionMeters } from '../utils/altitudeParser';
import { getCategoryFill } from '../utils/colorUtils';
import type { VisualMode } from '../utils/colorUtils';

interface UseAirspaceDataReturn {
  volumes: ProcessedVolume[];
  manifest: DataManifest | null;
  loading: boolean;
  error: Error | null;
}

interface UseAirspaceDataOptions {
  mode: VisualMode;
  opacity: number;
  exaggeration: number;
}

export function useAirspaceData(
  { mode, opacity, exaggeration }: UseAirspaceDataOptions,
): UseAirspaceDataReturn {
  const [rawVolumes, setRawVolumes] = useState<AirspaceVolume[]>([]);
  const [manifest, setManifest] = useState<DataManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [geojsonRes, manifestRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/airspace.geojson`, { signal: controller.signal }),
          fetch(`${import.meta.env.BASE_URL}data/manifest.json`, { signal: controller.signal }),
        ]);

        if (!geojsonRes.ok) throw new Error(`Failed to load airspace data: ${geojsonRes.status}`);

        const geojson = await geojsonRes.json();
        const features: AirspaceVolume[] = geojson.features.map((f: {
          geometry: AirspaceVolume['geometry'];
          properties: Omit<AirspaceVolume, 'geometry'>;
        }) => ({
          ...f.properties,
          geometry: f.geometry,
        }));

        setRawVolumes(features);

        if (manifestRes.ok) {
          setManifest(await manifestRes.json());
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err as Error);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  // Recompute ProcessedVolume whenever mode/opacity/exaggeration changes
  const volumes = useMemo<ProcessedVolume[]>(() => {
    return rawVolumes.map(vol => ({
      ...vol,
      floorMeters: renderFloorMeters(vol.lower, exaggeration),
      extrusionMeters: renderExtrusionMeters(vol.lower, vol.upper, exaggeration),
      color: getCategoryFill(vol.category, mode, opacity),
    }));
  }, [rawVolumes, mode, opacity, exaggeration]);

  return { volumes, manifest, loading, error };
}
