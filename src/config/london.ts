// London airspace region configuration
// All coordinates and altitude constants for the UK London TMA system

export const LONDON_BBOX = {
  west: -1.25,
  south: 50.8,
  east: 0.75,
  north: 52.15,
} as const;

export const LONDON_CENTER = {
  lat: 51.507,
  lon: -0.127, // Trafalgar Square
} as const;

// Default 3D view over central London
export const DEFAULT_VIEW_STATE = {
  longitude: -0.18,
  latitude: 51.47,
  zoom: 9.5,
  pitch: 60,
  bearing: -15,
} as const;

// Visual ceiling for UNL (Unlimited) airspace in feet
export const UNL_RENDER_FEET = 60_000;

// Vertical exaggeration presets
export const EXAGGERATION_PRESETS = [1, 2, 5, 10, 16.7] as const;
export type ExaggerationValue = typeof EXAGGERATION_PRESETS[number];

// Altitude slice range in feet
export const ALTITUDE_SLICE_MIN = 0;
export const ALTITUDE_SLICE_MAX = 60_000;

// Layer groups (for control panel)
export const LAYER_GROUPS = {
  AIRSPACE: ['TMA', 'CTR', 'CTA', 'ATZ'],
  RESTRICTIONS: ['RESTRICTED', 'PROHIBITED', 'DANGER'],
  HELICOPTERS: ['HELICOPTER_ROUTE'],
  UAS: ['UAS_FRZ', 'UAS_OTHER'],
  INFRASTRUCTURE: ['AERODROME'],
} as const;

// Camera presets
export interface CameraPreset {
  id: string;
  label: string;
  view: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  description?: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'london-tma',
    label: 'Full London TMA',
    description: 'Overview of the entire London terminal area',
    view: {
      longitude: -0.3,
      latitude: 51.5,
      zoom: 8.0,
      pitch: 50,
      bearing: -10,
    },
  },
  {
    id: 'central',
    label: 'Central London',
    description: 'Central London restricted airspace',
    view: {
      longitude: -0.12,
      latitude: 51.505,
      zoom: 11.5,
      pitch: 65,
      bearing: -20,
    },
  },
  {
    id: 'thames',
    label: 'Thames Corridor',
    description: 'H4 helicopter route through the Thames corridor',
    view: {
      longitude: -0.08,
      latitude: 51.49,
      zoom: 12,
      pitch: 70,
      bearing: 75,
    },
  },
  {
    id: 'battersea',
    label: 'Battersea Heliport',
    description: 'London Heliport (EGLW)',
    view: {
      longitude: -0.175,
      latitude: 51.47,
      zoom: 13,
      pitch: 60,
      bearing: -5,
    },
  },
  {
    id: 'heathrow',
    label: 'Heathrow',
    description: 'Heathrow Airport (EGLL)',
    view: {
      longitude: -0.45,
      latitude: 51.477,
      zoom: 11,
      pitch: 55,
      bearing: 5,
    },
  },
  {
    id: 'london-city',
    label: 'London City',
    description: 'London City Airport (EGLC)',
    view: {
      longitude: 0.054,
      latitude: 51.505,
      zoom: 12,
      pitch: 55,
      bearing: -30,
    },
  },
];
