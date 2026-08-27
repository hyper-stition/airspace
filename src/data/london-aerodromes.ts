// Authoritative London aerodrome reference points
// Coordinates from ICAO AIP ENR/AD sections and NATS published data
// All coordinates are WGS-84
import type { Aerodrome } from '../types/uk-airspace';

export const LONDON_AERODROMES: Aerodrome[] = [
  {
    icao: 'EGLL',
    name: 'Heathrow',
    lat: 51.4775,
    lon: -0.4614,
    elevationFt: 83,
    type: 'AIRPORT',
  },
  {
    icao: 'EGLC',
    name: 'London City',
    lat: 51.5053,
    lon: 0.0553,
    elevationFt: 19,
    type: 'AIRPORT',
  },
  {
    icao: 'EGLW',
    name: 'London Heliport',
    lat: 51.4706,
    lon: -0.1789,
    elevationFt: 18,
    type: 'HELIPORT',
  },
  {
    icao: 'EGKK',
    name: 'Gatwick',
    lat: 51.1481,
    lon: -0.1903,
    elevationFt: 202,
    type: 'AIRPORT',
  },
  {
    icao: 'EGGW',
    name: 'Luton',
    lat: 51.8747,
    lon: -0.3683,
    elevationFt: 526,
    type: 'AIRPORT',
  },
  {
    icao: 'EGSS',
    name: 'Stansted',
    lat: 51.885,
    lon: 0.235,
    elevationFt: 348,
    type: 'AIRPORT',
  },
  {
    icao: 'EGKB',
    name: 'Biggin Hill',
    lat: 51.3308,
    lon: 0.0325,
    elevationFt: 598,
    type: 'AIRFIELD',
  },
  {
    icao: 'EGLF',
    name: 'Farnborough',
    lat: 51.2775,
    lon: -0.7761,
    elevationFt: 238,
    type: 'AIRFIELD',
  },
  {
    icao: 'EGKR',
    name: 'Redhill',
    lat: 51.2136,
    lon: -0.1383,
    elevationFt: 222,
    type: 'AIRFIELD',
  },
  {
    icao: 'EGTK',
    name: 'Oxford (Kidlington)',
    lat: 51.8369,
    lon: -1.3200,
    elevationFt: 270,
    type: 'AIRFIELD',
  },
];
