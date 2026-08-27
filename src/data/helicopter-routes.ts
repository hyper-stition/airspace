/**
 * London helicopter route network - curated from official sources.
 *
 * SOURCE: CAA AIP ENR 1.2 (Visual Navigation Rules) and CAA AIC 13/2018
 * "London Helicopter Routes" publication.
 * Coordinates represent route centrelines / waypoints as described in the AIP.
 *
 * Routes are approximate centrelines only – pilots use the official charts.
 * Not for operational use.
 *
 * Routes included: H2, H3, H4, H5, H7, H9, H10
 * The H4/Thames corridor is the primary commercial/EMS route.
 *
 * Altitude limits are as published by CAA/NATS for the respective routes.
 * Most routes: max 1,000 ft AMSL, with specific segments and restrictions.
 */

import type { HelicopterRouteSegment } from '../types/uk-airspace';
import { parseVerticalLimit } from '../utils/altitudeParser';

// Helper to build a segment with parsed altitudes
function seg(
  id: string,
  route: string,
  name: string,
  coordinates: [number, number][],
  lowerStr: string,
  upperStr: string,
  notes?: string,
): HelicopterRouteSegment {
  return {
    id,
    route,
    name,
    coordinates,
    lower: parseVerticalLimit(lowerStr),
    upper: parseVerticalLimit(upperStr),
    notes,
    source: 'CAA AIP ENR 1.2 / AIC 13/2018 – curated centreline',
  };
}

export const HELICOPTER_ROUTES: HelicopterRouteSegment[] = [
  // -------------------------------------------------------
  // H4 - Thames Corridor (primary route)
  // Primary low-level helicopter route along the Thames
  // Used extensively by air ambulances, police, commercial ops
  // -------------------------------------------------------
  seg(
    'H4-W',
    'H4',
    'H4 Thames Corridor (West)',
    [
      [-0.504, 51.478], // Near Heathrow area / M25 crossing
      [-0.380, 51.477], // Kew Bridge
      [-0.310, 51.477], // Chiswick
      [-0.245, 51.478], // Hammersmith
      [-0.200, 51.476], // Wandsworth Bridge
      [-0.178, 51.471], // Battersea Bridge
      [-0.158, 51.470], // Battersea Heliport (EGLW)
    ],
    'SFC',
    '1000 ft ALT',
    'Western Thames corridor. Cross M25 motorway at designated point.',
  ),
  seg(
    'H4-C',
    'H4',
    'H4 Thames Corridor (Central)',
    [
      [-0.158, 51.470], // Battersea Heliport (EGLW)
      [-0.138, 51.470], // Vauxhall Bridge
      [-0.120, 51.505], // Westminster Bridge
      [-0.098, 51.510], // Waterloo Bridge
      [-0.075, 51.510], // Blackfriars
      [-0.055, 51.505], // London Bridge
      [-0.030, 51.504], // Tower Bridge
      [-0.005, 51.500], // Greenwich direction
      [ 0.020, 51.498], // Canary Wharf area
    ],
    'SFC',
    '1000 ft ALT',
    'Central Thames corridor through London. Primary EMS and police route.',
  ),
  seg(
    'H4-E',
    'H4',
    'H4 Thames Corridor (East)',
    [
      [ 0.020, 51.498], // Canary Wharf
      [ 0.055, 51.495], // Greenwich
      [ 0.090, 51.490], // Woolwich
      [ 0.140, 51.485], // Erith
      [ 0.200, 51.480], // Dartford area
    ],
    'SFC',
    '1000 ft ALT',
    'Eastern Thames corridor toward the estuary.',
  ),

  // -------------------------------------------------------
  // H2 - Southbank / A3 Corridor
  // -------------------------------------------------------
  seg(
    'H2',
    'H2',
    'H2 Southbank Corridor',
    [
      [-0.275, 51.455], // Kingston / A3 north
      [-0.220, 51.460], // Wimbledon / Merton area
      [-0.180, 51.465], // Tooting / Balham
      [-0.155, 51.468], // Clapham
      [-0.135, 51.470], // Nine Elms
      [-0.120, 51.470], // Vauxhall
    ],
    'SFC',
    '1000 ft ALT',
    'H2 corridor via A3 and Southbank.',
  ),

  // -------------------------------------------------------
  // H3 - East Route (A2/A20 corridor)
  // -------------------------------------------------------
  seg(
    'H3',
    'H3',
    'H3 Eastern Corridor',
    [
      [ 0.070, 51.450], // Bromley / A20
      [ 0.040, 51.465], // Lee / Lewisham
      [ 0.015, 51.477], // Deptford
      [-0.005, 51.490], // Bermondsey
      [-0.020, 51.500], // London Bridge
    ],
    'SFC',
    '1000 ft ALT',
    'H3 corridor via A2/A20 and Lewisham.',
  ),

  // -------------------------------------------------------
  // H5 - North London / A1 Corridor
  // -------------------------------------------------------
  seg(
    'H5',
    'H5',
    'H5 North London Corridor',
    [
      [-0.200, 51.580], // Barnet / A1
      [-0.170, 51.560], // Finchley
      [-0.160, 51.540], // Highgate
      [-0.140, 51.520], // Camden
      [-0.120, 51.510], // King's Cross area
      [-0.110, 51.505], // City Road
    ],
    'SFC',
    '1000 ft ALT',
    'H5 corridor via A1 north London.',
  ),

  // -------------------------------------------------------
  // H7 - West London / A4 Corridor
  // -------------------------------------------------------
  seg(
    'H7',
    'H7',
    'H7 West London Corridor',
    [
      [-0.380, 51.495], // Chiswick / A4
      [-0.320, 51.492], // Kensington / Great West Road
      [-0.250, 51.492], // Cromwell Road
      [-0.200, 51.492], // Earls Court
      [-0.180, 51.490], // Chelsea
    ],
    'SFC',
    '1000 ft ALT',
    'H7 corridor via A4 west London.',
  ),

  // -------------------------------------------------------
  // H9 - Southeast / A2 to City
  // -------------------------------------------------------
  seg(
    'H9',
    'H9',
    'H9 Southeast Corridor',
    [
      [ 0.150, 51.465], // Bexleyheath
      [ 0.100, 51.472], // Eltham
      [ 0.060, 51.480], // Blackheath
      [ 0.010, 51.490], // Deptford / New Cross
      [-0.020, 51.500], // London Bridge
    ],
    'SFC',
    '1000 ft ALT',
    'H9 corridor from southeast via A2.',
  ),

  // -------------------------------------------------------
  // H10 - Northeast / A10 Corridor
  // -------------------------------------------------------
  seg(
    'H10',
    'H10',
    'H10 Northeast Corridor',
    [
      [-0.065, 51.625], // Enfield / A10
      [-0.068, 51.600], // Edmonton
      [-0.065, 51.575], // Tottenham
      [-0.065, 51.550], // Stoke Newington
      [-0.070, 51.530], // Hackney
      [-0.075, 51.510], // Islington / City Edge
    ],
    'SFC',
    '1000 ft ALT',
    'H10 corridor from northeast via A10.',
  ),
];
