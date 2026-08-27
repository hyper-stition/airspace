// Normalised UK / ICAO-neutral airspace schema
// Replaces the FAA-specific AirspaceProperties interface

export type AirspaceCategory =
  | 'TMA'
  | 'CTR'
  | 'CTA'
  | 'ATZ'
  | 'RESTRICTED'
  | 'PROHIBITED'
  | 'DANGER'
  | 'UAS_FRZ'
  | 'UAS_OTHER'
  | 'HELICOPTER_ROUTE'
  | 'AERODROME'
  | 'OTHER';

export type AltitudeUnit = 'FT' | 'M' | 'FL';
export type AltitudeReference = 'SFC' | 'AGL' | 'AMSL' | 'ALT' | 'STD' | 'UNL';

export interface VerticalLimit {
  /** Numeric value (e.g. 2500 for 2500 ft, 195 for FL195) */
  value?: number;
  unit?: AltitudeUnit;
  reference?: AltitudeReference;
  /** Human-readable source representation e.g. "FL195", "2500 ft ALT", "SFC", "UNL" */
  label: string;
  /**
   * Nominal altitude in FEET used ONLY by the renderer.
   * For FL, this is FL * 100. For AGL it may be approximate.
   * Never show this as a legal limit – always show `label`.
   */
  renderFeet: number;
  /** True if renderFeet is an approximation (FL is a pressure surface; AGL needs terrain) */
  renderApprox?: boolean;
}

export interface AirspaceVolume {
  id: string;
  name: string;
  designator?: string;

  category: AirspaceCategory;
  /** ICAO airspace class where applicable (A–G) */
  airspaceClass?: string;

  lower: VerticalLimit;
  upper: VerticalLimit;

  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;

  /** Which dataset this came from */
  source: 'NATS_AIP' | 'NATS_UAS' | 'CURATED' | string;
  /** AIRAC effective date, e.g. "2026-08-06" */
  airac?: string;

  /** True if metadata join was incomplete */
  metadataIncomplete?: boolean;

  /** Raw source properties for the inspector's advanced section */
  properties?: Record<string, unknown>;
}

// Processed version with pre-computed render values
export interface ProcessedVolume extends AirspaceVolume {
  /** Floor in METERS for deck.gl (already exaggerated) */
  floorMeters: number;
  /** Extrusion height in METERS for deck.gl (already exaggerated) */
  extrusionMeters: number;
  /** Base fill colour [r, g, b, a] */
  color: [number, number, number, number];
}

// GeoJSON FeatureCollection where each Feature's properties are an AirspaceVolume
export interface AirspaceFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    properties: Omit<AirspaceVolume, 'geometry'>;
  }>;
}

// ---- Aerodrome types ----

export interface Aerodrome {
  icao: string;
  name: string;
  lat: number;
  lon: number;
  elevationFt: number;
  type: 'AIRPORT' | 'HELIPORT' | 'AIRFIELD';
}

// ---- Helicopter route types ----

export interface HelicopterRouteSegment {
  id: string;
  route: string;  // e.g. "H4"
  name: string;
  coordinates: [number, number][];  // [lon, lat] pairs
  lower: VerticalLimit;
  upper: VerticalLimit;
  notes?: string;
  source: string;
}

// ---- ADS-B types ----

export interface AdsbAircraft {
  hex: string;            // ICAO 24-bit address
  flight?: string;        // Callsign
  r?: string;             // Registration
  t?: string;             // Type code
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  alt_geom?: number;
  gs?: number;            // Ground speed kts
  true_heading?: number;
  track?: number;
  baro_rate?: number;     // Barometric vertical rate (fpm); pairs with alt_baro
  geom_rate?: number;     // Geometric vertical rate (fpm); pairs with alt_geom
  category?: string;      // ADS-B emitter category
  squawk?: string;
  emergency?: string;
  seen?: number;          // Seconds since last message
  seen_pos?: number;      // Seconds since last position
  dst?: number;           // Distance from query point (nm)
  dir?: number;           // Direction from query point
}

export interface AdsbResponse {
  ac: AdsbAircraft[];
  total: number;
  now: number;
  ctime: number;
  ptime: number;
}

// ---- Data manifest ----

export interface DataManifest {
  source: string;
  sourceFilenames: string[];
  airacDate: string;
  generatedAt: string;
  featureCount: number;
  unmatchedCount: number;
  warnings: string[];
  bbox: [number, number, number, number]; // [west, south, east, north]
}
