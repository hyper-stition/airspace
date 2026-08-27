// UK / ICAO-neutral altitude parsing
// Handles SFC, AMSL/ALT, FL, AGL, UNL correctly
// NEVER silently equates different reference systems

import type { VerticalLimit, AltitudeUnit, AltitudeReference } from '../types/uk-airspace';
import { UNL_RENDER_FEET } from '../config/london';

const FT_PER_METER = 3.28084;

export function feetToMeters(ft: number): number {
  return ft / FT_PER_METER;
}

export function metersToFeet(m: number): number {
  return m * FT_PER_METER;
}

/**
 * Parse a raw altitude string from source data into a VerticalLimit.
 * Handles forms like:
 *  "SFC", "GND"
 *  "2500 ft ALT", "2500ft AMSL", "2500"
 *  "FL195", "FL 195", "FL35"
 *  "1500 ft AGL"
 *  "UNL", "UNLTD", "UNLIMITED"
 *  "FL195 (19500 ft AMSL)"
 *  900 (number as metres)  <- AIXM uses metres
 */
export function parseVerticalLimit(raw: string | number | null | undefined): VerticalLimit {
  if (raw === null || raw === undefined || raw === '') {
    return {
      label: 'Unknown',
      renderFeet: 0,
      renderApprox: true,
    };
  }

  const s = String(raw).trim().toUpperCase();

  // SFC / GND
  if (s === 'SFC' || s === 'GND' || s === 'SURFACE') {
    return {
      reference: 'SFC',
      label: 'SFC',
      renderFeet: 0,
    };
  }

  // UNL / UNLIMITED
  if (s === 'UNL' || s === 'UNLTD' || s === 'UNLIMITED') {
    return {
      reference: 'UNL',
      label: 'UNL',
      renderFeet: UNL_RENDER_FEET,
      renderApprox: true,
    };
  }

  // Flight Level: FL195, FL 195
  const flMatch = s.match(/^FL\s*(\d+)/);
  if (flMatch) {
    const fl = parseInt(flMatch[1], 10);
    return {
      value: fl,
      unit: 'FL',
      reference: 'STD',
      label: `FL${fl}`,
      renderFeet: fl * 100,
      renderApprox: true, // FL is a pressure surface
    };
  }

  // Feet AGL: "1500 ft AGL" -- must come before generic AMSL match
  const aglMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:FT|FEET)?\s*AGL/);
  if (aglMatch) {
    const ft = parseFloat(aglMatch[1]);
    return {
      value: ft,
      unit: 'FT',
      reference: 'AGL',
      label: `${Math.round(ft).toLocaleString()} ft AGL`,
      renderFeet: ft, // approximate – no terrain model
      renderApprox: true,
    };
  }

  // Feet AMSL/ALT: "2500 ft ALT", "2500 ft AMSL", "2500ft", "2500"
  const altFtMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:FT|FEET)?\s*(AMSL|ALT|MSL)?/);
  if (altFtMatch) {
    const ft = parseFloat(altFtMatch[1]);
    const ref = (altFtMatch[2] as AltitudeReference) || 'AMSL';
    return {
      value: ft,
      unit: 'FT',
      reference: ref,
      label: `${Math.round(ft).toLocaleString()} ft ${ref}`,
      renderFeet: ft,
    };
  }

  // Metres (AIXM often gives metres): pure number that looks like metres
  // e.g. "762" = 2500 ft
  if (/^\d+$/.test(s)) {
    const m = parseInt(s, 10);
    const ft = Math.round(metersToFeet(m));
    return {
      value: m,
      unit: 'M',
      reference: 'AMSL',
      label: `${ft.toLocaleString()} ft AMSL (${m} m)`,
      renderFeet: ft,
    };
  }

  // Fallback – preserve raw label
  return {
    label: raw.toString(),
    renderFeet: 0,
    renderApprox: true,
  };
}

/**
 * Build a VerticalLimit from structured AIXM-style fields.
 */
export function buildVerticalLimit(
  value: number | null | undefined,
  unit: string | null | undefined,
  reference: string | null | undefined,
): VerticalLimit {
  const rawRef = reference?.trim().toUpperCase() ?? '';
  const u = (unit?.trim().toUpperCase() ?? 'FT') as AltitudeUnit;

  if (rawRef === 'SFC' || rawRef === 'GND') {
    return { reference: 'SFC', label: 'SFC', renderFeet: 0 };
  }

  if (rawRef === 'UNL' || rawRef === 'UNLTD' || value === undefined || value === null) {
    return { reference: 'UNL', label: 'UNL', renderFeet: UNL_RENDER_FEET, renderApprox: true };
  }

  const ref = rawRef as AltitudeReference;

  if (u === 'FL') {
    return {
      value,
      unit: 'FL',
      reference: 'STD',
      label: `FL${value}`,
      renderFeet: value * 100,
      renderApprox: true,
    };
  }

  if (u === 'FT') {
    const refStr = ref || 'AMSL';
    const approx = ref === 'AGL';
    return {
      value,
      unit: 'FT',
      reference: refStr as AltitudeReference,
      label: `${Math.round(value).toLocaleString()} ft ${refStr}`,
      renderFeet: value,
      renderApprox: approx || undefined,
    };
  }

  if (u === 'M') {
    const ft = Math.round(metersToFeet(value));
    const refStr = ref || 'AMSL';
    const approx = ref === 'AGL';
    return {
      value,
      unit: 'M',
      reference: refStr as AltitudeReference,
      label: `${ft.toLocaleString()} ft ${refStr} (${Math.round(value)} m)`,
      renderFeet: ft,
      renderApprox: approx || undefined,
    };
  }

  // Unknown unit – fallback
  return {
    value,
    label: `${value} ${u} ${ref}`.trim(),
    renderFeet: 0,
    renderApprox: true,
  };
}

/**
 * Format a VerticalLimit for short display (e.g. tooltip, list).
 */
export function formatLimit(limit: VerticalLimit): string {
  return limit.label;
}

/**
 * Format a range for display: "SFC – FL195"
 */
export function formatAltitudeRange(lower: VerticalLimit, upper: VerticalLimit): string {
  return `${lower.label} – ${upper.label}`;
}

/**
 * Get render floor in meters from a VerticalLimit.
 * Applies vertical exaggeration.
 */
export function renderFloorMeters(lower: VerticalLimit, exaggeration: number): number {
  return feetToMeters(lower.renderFeet) * exaggeration;
}

/**
 * Get extrusion height in meters from lower/upper limits.
 * Applies vertical exaggeration.
 */
export function renderExtrusionMeters(
  lower: VerticalLimit,
  upper: VerticalLimit,
  exaggeration: number,
): number {
  const heightFt = Math.max(0, upper.renderFeet - lower.renderFeet);
  return feetToMeters(heightFt) * exaggeration;
}
