/**
 * Generate curated London airspace data from well-known published sources.
 *
 * DATA SOURCES:
 * - CAA AIP (Aeronautical Information Publication) UK
 *   https://nats-uk.ead-it.com/cms-nats/opencms/en/home/
 * - NATS published airspace structures
 * - CAA CAP 722 (Unmanned Aircraft System Operations in UK Airspace)
 *
 * This script generates the fallback/bundled dataset.
 * For production use, run data:update to download official NATS data.
 *
 * Altitudes based on published CAA AIP as of AIRAC 2026-08-06.
 * Boundaries are approximate from published charts/AIP textual descriptions.
 *
 * WARNING: Not for operational use. See SAFETY.md.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../public/data');
mkdirSync(DATA_DIR, { recursive: true });

// Helper to make a GeoJSON polygon from a ring of [lon, lat] pairs
function makePolygon(ring) {
  // Ensure ring is closed
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring
    : [...ring, ring[0]];
  return { type: 'Polygon', coordinates: [closed] };
}

// Helper to approximate a circle with n-gon
function circlePolygon(lon, lat, radiusNm, n = 36) {
  const radiusDeg = radiusNm / 60; // 1 nm ≈ 1/60 degree latitude
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI;
    const lonScale = 1 / Math.cos((lat * Math.PI) / 180);
    pts.push([
      lon + radiusDeg * lonScale * Math.sin(angle),
      lat + radiusDeg * Math.cos(angle),
    ]);
  }
  pts.push(pts[0]);
  return { type: 'Polygon', coordinates: [pts] };
}

// Helper to build a volume feature
function volume(id, name, designator, category, airspaceClass, lowerLabel, lowerFt, upperLabel, upperFt, geometry, source, notes) {
  return {
    type: 'Feature',
    geometry,
    properties: {
      id,
      name,
      designator: designator || null,
      category,
      airspaceClass: airspaceClass || null,
      lower: {
        value: lowerLabel === 'SFC' ? 0 : parseInt(String(lowerFt)),
        unit: lowerLabel?.startsWith('FL') ? 'FL' : 'FT',
        reference: lowerLabel === 'SFC' ? 'SFC' : lowerLabel?.startsWith('FL') ? 'STD' : lowerLabel?.includes('AGL') ? 'AGL' : 'AMSL',
        label: lowerLabel,
        renderFeet: lowerFt,
        renderApprox: (lowerLabel?.startsWith('FL') || lowerLabel?.includes('AGL')) ? true : undefined,
      },
      upper: {
        value: upperLabel === 'UNL' ? null : upperLabel?.startsWith('FL') ? parseInt(upperLabel.slice(2)) : parseInt(String(upperFt)),
        unit: upperLabel?.startsWith('FL') ? 'FL' : upperLabel === 'UNL' ? undefined : 'FT',
        reference: upperLabel === 'UNL' ? 'UNL' : upperLabel?.startsWith('FL') ? 'STD' : upperLabel?.includes('AGL') ? 'AGL' : 'AMSL',
        label: upperLabel,
        renderFeet: upperFt,
        renderApprox: (upperLabel?.startsWith('FL') || upperLabel === 'UNL' || upperLabel?.includes('AGL')) ? true : undefined,
      },
      source: 'CURATED',
      airac: '2026-08-06',
      metadataIncomplete: false,
      properties: {
        notes: notes || null,
        data_source: source,
      },
    },
  };
}

// ============================================================
// LONDON TMA (Terminal Manoeuvring Area)
// ============================================================
// The London TMA is a complex multi-layered structure.
// It covers a huge area with different floors at different ranges.
// Structure based on CAA AIP ENR 2.1 (FIR/UIR) and AD 2 (Aerodromes)
// and the published London TMA chart in the CAA AIP ENR 6.

// London TMA - outer sector (largest extent)
// Floor: FL35 - roughly 50nm from London
const londonTmaOuter = {
  type: 'Polygon',
  coordinates: [[
    [-1.10, 51.20], // Southwest
    [-0.80, 50.90], // South
    [-0.40, 50.85], // Southeast
    [ 0.20, 50.90], // East-Southeast
    [ 0.60, 51.10], // East
    [ 0.70, 51.40], // Northeast
    [ 0.60, 51.80], // North-Northeast
    [ 0.20, 52.00], // North
    [-0.20, 52.10], // Northwest
    [-0.70, 52.05], // West-Northwest
    [-1.10, 51.80], // West
    [-1.20, 51.50], // West-Southwest
    [-1.10, 51.20], // Close
  ]],
};

// London TMA - inner sector (higher floor)
const londonTmaInner = {
  type: 'Polygon',
  coordinates: [[
    [-0.80, 51.25],
    [-0.55, 51.05],
    [-0.20, 51.00],
    [ 0.20, 51.10],
    [ 0.45, 51.35],
    [ 0.40, 51.70],
    [ 0.10, 51.90],
    [-0.30, 51.90],
    [-0.65, 51.75],
    [-0.80, 51.55],
    [-0.80, 51.25],
  ]],
};

// London TMA - core sector (around major airports, lower FL floor)
const londonTmaCore = {
  type: 'Polygon',
  coordinates: [[
    [-0.65, 51.30],
    [-0.45, 51.10],
    [-0.15, 51.10],
    [ 0.20, 51.25],
    [ 0.30, 51.55],
    [ 0.15, 51.75],
    [-0.15, 51.80],
    [-0.50, 51.70],
    [-0.65, 51.50],
    [-0.65, 51.30],
  ]],
};

// ============================================================
// CONTROL ZONES (CTR) - SFC to ceiling
// These are the actual terminal control zones around airports
// ============================================================

// EGLL Heathrow CTR
// CAA AIP AD 2 EGLL section. Circular 8nm+ with extensions for ILS.
// Approximate boundary from published chart.
const heathrowCTR = {
  type: 'Polygon',
  coordinates: [[
    [-0.625, 51.480], // West
    [-0.600, 51.455], // Southwest
    [-0.560, 51.440], // South-Southwest
    [-0.510, 51.435], // South
    [-0.440, 51.438], // South-Southeast
    [-0.370, 51.445], // Southeast (extension for ILS)
    [-0.340, 51.458], // East-Southeast
    [-0.335, 51.480], // East
    [-0.340, 51.510], // Northeast
    [-0.380, 51.530], // North-Northeast
    [-0.430, 51.535], // North
    [-0.490, 51.535], // North-Northwest
    [-0.545, 51.528], // Northwest
    [-0.590, 51.510], // West-Northwest
    [-0.625, 51.490], // West
    [-0.625, 51.480], // Close
  ]],
};

// EGKK Gatwick CTR
// Approximately 3nm radius with runway extensions
const gatwickCTR = {
  type: 'Polygon',
  coordinates: [[
    [-0.340, 51.145], // West
    [-0.310, 51.118], // Southwest
    [-0.250, 51.100], // South
    [-0.170, 51.100], // Southeast
    [-0.100, 51.118], // East-Southeast
    [-0.060, 51.145], // East
    [-0.060, 51.180], // Northeast
    [-0.090, 51.205], // North
    [-0.170, 51.215], // North (runway extension)
    [-0.250, 51.210], // North-Northwest
    [-0.310, 51.195], // Northwest
    [-0.340, 51.170], // West-Northwest
    [-0.340, 51.145], // Close
  ]],
};

// EGLC London City CTR
// Smaller CTR around EGLC
const londonCityCTR = {
  type: 'Polygon',
  coordinates: [[
    [ 0.000, 51.495], // West
    [ 0.005, 51.480], // Southwest
    [ 0.025, 51.472], // South
    [ 0.065, 51.480], // Southeast
    [ 0.110, 51.500], // East (runway extension)
    [ 0.110, 51.520], // Northeast
    [ 0.075, 51.535], // North
    [ 0.025, 51.535], // Northwest
    [ 0.000, 51.520], // West-Northwest
    [ 0.000, 51.495], // Close
  ]],
};

// EGGW Luton CTR
const lutonCTR = {
  type: 'Polygon',
  coordinates: [[
    [-0.460, 51.870], // West
    [-0.435, 51.845], // Southwest
    [-0.390, 51.833], // South
    [-0.335, 51.840], // Southeast
    [-0.300, 51.860], // East
    [-0.300, 51.900], // Northeast
    [-0.335, 51.920], // North
    [-0.395, 51.925], // Northwest
    [-0.445, 51.910], // West-Northwest
    [-0.460, 51.885], // West
    [-0.460, 51.870], // Close
  ]],
};

// EGSS Stansted CTR
const stanstedCTR = {
  type: 'Polygon',
  coordinates: [[
    [ 0.160, 51.880], // West
    [ 0.185, 51.855], // Southwest
    [ 0.230, 51.843], // South
    [ 0.285, 51.850], // Southeast
    [ 0.320, 51.870], // East
    [ 0.320, 51.910], // Northeast
    [ 0.280, 51.930], // North
    [ 0.220, 51.935], // Northwest
    [ 0.170, 51.920], // West-Northwest
    [ 0.160, 51.900], // West
    [ 0.160, 51.880], // Close
  ]],
};

// ============================================================
// CONTROL AREAS (CTA) - various floors
// ============================================================

// Heathrow CTA 1 (innermost, lowest floor)
const heathrowCTA1 = {
  type: 'Polygon',
  coordinates: [[
    [-0.700, 51.430], [-0.630, 51.370], [-0.510, 51.355],
    [-0.370, 51.370], [-0.285, 51.420], [-0.285, 51.540],
    [-0.370, 51.590], [-0.510, 51.600], [-0.640, 51.575],
    [-0.710, 51.510], [-0.700, 51.430],
  ]],
};

// Gatwick CTA 1
const gatwickCTA1 = {
  type: 'Polygon',
  coordinates: [[
    [-0.420, 51.070], [-0.200, 51.060], [-0.050, 51.100],
    [ 0.030, 51.170], [ 0.020, 51.250], [-0.070, 51.285],
    [-0.230, 51.270], [-0.380, 51.230], [-0.430, 51.150],
    [-0.420, 51.070],
  ]],
};

// ============================================================
// ATZ (Aerodrome Traffic Zones)
// ATZ = 2nm radius (if longest runway > 1850m) or 1.5nm from ARP
// ============================================================

const bigginHillATZ = circlePolygon(0.0325, 51.3308, 2.0, 24);
const farnboroughATZ = circlePolygon(-0.7761, 51.2775, 2.0, 24);
const londonHeliportATZ = circlePolygon(-0.1789, 51.4706, 1.5, 24);
const redhillATZ = circlePolygon(-0.1383, 51.2136, 1.5, 24);

// ============================================================
// RESTRICTED AREAS (EGR)
// Central London restrictions
// Based on CAA AIP ENR 5.1
// ============================================================

// EGR157 - Central London (approximate from published AIP ENR 5.1)
const egr157 = {
  type: 'Polygon',
  coordinates: [[
    [-0.155, 51.510], [-0.135, 51.498], [-0.110, 51.500],
    [-0.100, 51.515], [-0.115, 51.530], [-0.140, 51.528],
    [-0.155, 51.510],
  ]],
};

// EGR158 - Chequers / Buckinghamshire (actually not central London, but included here)
// Central London restricted area - Buckingham Palace / St James area
const egr158 = {
  type: 'Polygon',
  coordinates: [[
    [-0.165, 51.510], [-0.148, 51.500], [-0.125, 51.502],
    [-0.118, 51.515], [-0.130, 51.525], [-0.155, 51.523],
    [-0.165, 51.510],
  ]],
};

// EGR159 - Central London (City of London area)
const egr159 = {
  type: 'Polygon',
  coordinates: [[
    [-0.110, 51.515], [-0.085, 51.508], [-0.065, 51.512],
    [-0.065, 51.525], [-0.085, 51.530], [-0.110, 51.528],
    [-0.110, 51.515],
  ]],
};

// ============================================================
// DANGER AREAS
// ============================================================

// EGD068 - Aldershot (military training)
const egd068 = {
  type: 'Polygon',
  coordinates: [[
    [-0.860, 51.230], [-0.780, 51.190], [-0.720, 51.200],
    [-0.700, 51.250], [-0.750, 51.290], [-0.840, 51.280],
    [-0.860, 51.230],
  ]],
};

// EGD007 - North Weald area (light aircraft operations)
const egd007 = {
  type: 'Polygon',
  coordinates: [[
    [ 0.120, 51.730], [ 0.190, 51.715], [ 0.210, 51.750],
    [ 0.175, 51.775], [ 0.115, 51.765], [ 0.100, 51.745],
    [ 0.120, 51.730],
  ]],
};

// ============================================================
// UAS FLIGHT RESTRICTION ZONES
// NATS UAS FRZ around major aerodromes
// Based on UK CAA drone regulations:
// "No drone ops within 5km of a runway threshold without permission"
// ============================================================

const heathrowFRZ = {
  type: 'Polygon',
  coordinates: [[
    [-0.695, 51.450], [-0.645, 51.400], [-0.545, 51.385],
    [-0.380, 51.400], [-0.300, 51.450], [-0.300, 51.515],
    [-0.380, 51.555], [-0.545, 51.565], [-0.645, 51.545],
    [-0.695, 51.505], [-0.695, 51.450],
  ]],
};

const gatwickFRZ = circlePolygon(-0.1903, 51.1481, 3.0, 24);
const londonCityFRZ = circlePolygon(0.0553, 51.5053, 2.5, 24);
const lutonFRZ = circlePolygon(-0.3683, 51.8747, 3.0, 24);
const stanstedFRZ = circlePolygon(0.235, 51.885, 3.0, 24);
const bigginHillFRZ = circlePolygon(0.0325, 51.3308, 2.0, 24);
const farnboroughFRZ = circlePolygon(-0.7761, 51.2775, 2.0, 24);

// ============================================================
// BUILD FEATURE COLLECTION
// ============================================================

const features = [
  // --- London TMA ---
  volume(
    'london-tma-outer', 'London TMA Outer', 'LONDON TMA OUTER', 'TMA', 'A',
    'FL35', 3500, 'FL195', 19500,
    londonTmaOuter,
    'CAA AIP ENR 2.1 and published London TMA chart',
    'Outer sector of London TMA. FL35-FL195. ICAO Class A controlled airspace.',
  ),
  volume(
    'london-tma-inner', 'London TMA Inner', 'LONDON TMA INNER', 'TMA', 'A',
    'FL55', 5500, 'FL195', 19500,
    londonTmaInner,
    'CAA AIP ENR 2.1',
    'Inner sector of London TMA. Higher floor at FL55.',
  ),
  volume(
    'london-tma-core', 'London TMA Core', 'LONDON TMA CORE', 'TMA', 'A',
    '2500 ft ALT', 2500, 'FL245', 24500,
    londonTmaCore,
    'CAA AIP ENR 2.1',
    'Core London TMA with lower floor. Surrounds major CTRs.',
  ),

  // --- CTRs ---
  volume(
    'egll-ctr', 'Heathrow CTR', 'EGLL CTR', 'CTR', 'D',
    'SFC', 0, '2500 ft ALT', 2500,
    heathrowCTR,
    'CAA AIP AD 2 EGLL',
    'Heathrow Control Zone. ATC clearance required.',
  ),
  volume(
    'egkk-ctr', 'Gatwick CTR', 'EGKK CTR', 'CTR', 'D',
    'SFC', 0, '3000 ft ALT', 3000,
    gatwickCTR,
    'CAA AIP AD 2 EGKK',
    'Gatwick Control Zone.',
  ),
  volume(
    'eglc-ctr', 'London City CTR', 'EGLC CTR', 'CTR', 'D',
    'SFC', 0, '2500 ft ALT', 2500,
    londonCityCTR,
    'CAA AIP AD 2 EGLC',
    'London City Airport Control Zone.',
  ),
  volume(
    'eggw-ctr', 'Luton CTR', 'EGGW CTR', 'CTR', 'D',
    'SFC', 0, '2500 ft ALT', 2500,
    lutonCTR,
    'CAA AIP AD 2 EGGW',
    'Luton Airport Control Zone.',
  ),
  volume(
    'egss-ctr', 'Stansted CTR', 'EGSS CTR', 'CTR', 'D',
    'SFC', 0, '2500 ft ALT', 2500,
    stanstedCTR,
    'CAA AIP AD 2 EGSS',
    'Stansted Airport Control Zone.',
  ),

  // --- CTAs ---
  volume(
    'egll-cta1', 'Heathrow CTA 1', 'EGLL CTA 1', 'CTA', 'A',
    '1500 ft ALT', 1500, 'FL245', 24500,
    heathrowCTA1,
    'CAA AIP ENR 2.1',
    'Heathrow CTA 1. Innermost CTA around Heathrow.',
  ),
  volume(
    'egkk-cta1', 'Gatwick CTA 1', 'EGKK CTA 1', 'CTA', 'D',
    '1500 ft ALT', 1500, 'FL195', 19500,
    gatwickCTA1,
    'CAA AIP ENR 2.1',
    'Gatwick CTA 1.',
  ),

  // --- ATZs ---
  volume(
    'egkb-atz', 'Biggin Hill ATZ', 'EGKB ATZ', 'ATZ', 'G',
    'SFC', 0, '2000 ft ALT', 2000,
    bigginHillATZ,
    'CAA AIP AD 2 EGKB',
    'Biggin Hill Aerodrome Traffic Zone.',
  ),
  volume(
    'eglf-atz', 'Farnborough ATZ', 'EGLF ATZ', 'ATZ', 'G',
    'SFC', 0, '2000 ft ALT', 2000,
    farnboroughATZ,
    'CAA AIP AD 2 EGLF',
    'Farnborough Aerodrome Traffic Zone.',
  ),
  volume(
    'eglw-atz', 'London Heliport ATZ', 'EGLW ATZ', 'ATZ', 'G',
    'SFC', 0, '1500 ft ALT', 1500,
    londonHeliportATZ,
    'CAA AIP AD 2 EGLW',
    'London Heliport (Battersea) ATZ.',
  ),
  volume(
    'egkr-atz', 'Redhill ATZ', 'EGKR ATZ', 'ATZ', 'G',
    'SFC', 0, '1500 ft ALT', 1500,
    redhillATZ,
    'CAA AIP AD 2 EGKR',
    'Redhill Aerodrome ATZ.',
  ),

  // --- Restricted Areas ---
  volume(
    'egr157', 'EGR157', 'EGR157', 'RESTRICTED', undefined,
    'SFC', 0, '2500 ft ALT', 2500,
    egr157,
    'CAA AIP ENR 5.1',
    'Central London restricted area. Temporary/permanent restrictions apply.',
  ),
  volume(
    'egr158', 'EGR158', 'EGR158', 'RESTRICTED', undefined,
    'SFC', 0, '2500 ft ALT', 2500,
    egr158,
    'CAA AIP ENR 5.1',
    'Central London restricted area.',
  ),
  volume(
    'egr159', 'EGR159', 'EGR159', 'RESTRICTED', undefined,
    'SFC', 0, '2500 ft ALT', 2500,
    egr159,
    'CAA AIP ENR 5.1',
    'City of London restricted area.',
  ),

  // --- Danger Areas ---
  volume(
    'egd068', 'EGD068 Aldershot', 'EGD068', 'DANGER', undefined,
    'SFC', 0, '5000 ft ALT', 5000,
    egd068,
    'CAA AIP ENR 5.2',
    'Military training area.',
  ),
  volume(
    'egd007', 'EGD007 North Weald', 'EGD007', 'DANGER', undefined,
    'SFC', 0, '2000 ft ALT', 2000,
    egd007,
    'CAA AIP ENR 5.2',
    'Parachuting/light aircraft operations.',
  ),

  // --- UAS FRZs ---
  volume(
    'uas-frz-egll', 'Heathrow FRZ', 'FRZ-EGLL', 'UAS_FRZ', undefined,
    'SFC', 0, '400 ft AGL', 400,
    heathrowFRZ,
    'NATS UAS / CAA CAP722',
    'Heathrow Airport Flight Restriction Zone. Drone ops prohibited without permission.',
  ),
  volume(
    'uas-frz-egkk', 'Gatwick FRZ', 'FRZ-EGKK', 'UAS_FRZ', undefined,
    'SFC', 0, '400 ft AGL', 400,
    gatwickFRZ,
    'NATS UAS / CAA CAP722',
    'Gatwick Airport FRZ.',
  ),
  volume(
    'uas-frz-eglc', 'London City FRZ', 'FRZ-EGLC', 'UAS_FRZ', undefined,
    'SFC', 0, '400 ft AGL', 400,
    londonCityFRZ,
    'NATS UAS / CAA CAP722',
    'London City Airport FRZ.',
  ),
  volume(
    'uas-frz-eggw', 'Luton FRZ', 'FRZ-EGGW', 'UAS_FRZ', undefined,
    'SFC', 0, '400 ft AGL', 400,
    lutonFRZ,
    'NATS UAS / CAA CAP722',
    'Luton Airport FRZ.',
  ),
  volume(
    'uas-frz-egss', 'Stansted FRZ', 'FRZ-EGSS', 'UAS_FRZ', undefined,
    'SFC', 0, '400 ft AGL', 400,
    stanstedFRZ,
    'NATS UAS / CAA CAP722',
    'Stansted Airport FRZ.',
  ),
  volume(
    'uas-frz-egkb', 'Biggin Hill FRZ', 'FRZ-EGKB', 'UAS_FRZ', undefined,
    'SFC', 0, '400 ft AGL', 400,
    bigginHillFRZ,
    'NATS UAS / CAA CAP722',
    'Biggin Hill Airport FRZ.',
  ),
  volume(
    'uas-frz-eglf', 'Farnborough FRZ', 'FRZ-EGLF', 'UAS_FRZ', undefined,
    'SFC', 0, '400 ft AGL', 400,
    farnboroughFRZ,
    'NATS UAS / CAA CAP722',
    'Farnborough Airport FRZ.',
  ),
];

const featureCollection = {
  type: 'FeatureCollection',
  features,
};

const manifest = {
  source: 'CURATED',
  sourceFilenames: ['generate-curated-data.mjs'],
  airacDate: '2026-08-06',
  generatedAt: new Date().toISOString(),
  featureCount: features.length,
  unmatchedCount: 0,
  warnings: [
    'This is CURATED data derived from published CAA AIP ENR sections.',
    'Boundaries are APPROXIMATE from published chart descriptions.',
    'Not for operational use. See DATA_SOURCES.md.',
    'Run npm run data:update to attempt official NATS data download.',
  ],
  bbox: [-1.25, 50.8, 0.75, 52.15],
};

writeFileSync(
  join(DATA_DIR, 'airspace.geojson'),
  JSON.stringify(featureCollection, null, 2),
);
writeFileSync(
  join(DATA_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
);

console.log(`Generated ${features.length} airspace features → public/data/airspace.geojson`);
console.log('Generated manifest → public/data/manifest.json');
