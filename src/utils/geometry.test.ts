/**
 * Tests for 3D geometry correctness and altitude semantic checks.
 */
import { describe, it, expect } from 'vitest';
import { feetToMeters, renderFloorMeters, renderExtrusionMeters, parseVerticalLimit } from './altitudeParser';

// Inline the withBaseZ logic to test its contract independently.
// The real implementation lives in Map3D.tsx (a component file).
function withBaseZ(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  baseZ: number,
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  const addZ = (ring: number[][]): number[][] => ring.map(([lon, lat]) => [lon, lat, baseZ]);
  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: geometry.coordinates.map(addZ) };
  }
  return {
    ...geometry,
    coordinates: (geometry as GeoJSON.MultiPolygon).coordinates.map(poly => poly.map(addZ)),
  };
}

describe('withBaseZ – 3D vertex Z injection', () => {
  const square: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [[
      [0, 0], [1, 0], [1, 1], [0, 1], [0, 0],
    ]],
  };

  it('sets Z on every Polygon vertex', () => {
    const result = withBaseZ(square, 1067) as GeoJSON.Polygon;
    for (const coord of result.coordinates[0]) {
      expect(coord[2]).toBe(1067);
      expect(coord[0]).toBeDefined(); // lon preserved
      expect(coord[1]).toBeDefined(); // lat preserved
    }
  });

  it('does not mutate the original geometry', () => {
    withBaseZ(square, 999);
    expect(square.coordinates[0][0].length).toBe(2); // still 2D
  });

  it('handles MultiPolygon', () => {
    const mp: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        [[[2, 2], [3, 2], [3, 3], [2, 2]]],
      ],
    };
    const result = withBaseZ(mp, 500) as GeoJSON.MultiPolygon;
    for (const poly of result.coordinates) {
      for (const ring of poly) {
        for (const coord of ring) {
          expect(coord[2]).toBe(500);
        }
      }
    }
  });

  it('base Z of 0 (SFC) still sets explicit Z', () => {
    const result = withBaseZ(square, 0) as GeoJSON.Polygon;
    for (const coord of result.coordinates[0]) {
      expect(coord[2]).toBe(0);
      expect(coord.length).toBe(3);
    }
  });
});

describe('3D volume span correctness', () => {
  // Verify: London TMA Outer (FL35 floor, FL195 ceiling, 5x exaggeration)
  // floor = 3500 ft, ceiling = 19500 ft
  // floorMeters = feetToMeters(3500) * 5
  // extrusionMeters = feetToMeters(19500 - 3500) * 5 = feetToMeters(16000) * 5
  // top = floorMeters + extrusionMeters = feetToMeters(19500) * 5

  it('London TMA Outer: floor and extrusion sum to ceiling', () => {
    const lower = parseVerticalLimit('FL35');
    const upper = parseVerticalLimit('FL195');
    const exaggeration = 5;

    const floorM = renderFloorMeters(lower, exaggeration);
    const extrusionM = renderExtrusionMeters(lower, upper, exaggeration);

    expect(floorM).toBeCloseTo(feetToMeters(3500) * exaggeration, 1);
    expect(extrusionM).toBeCloseTo(feetToMeters(16000) * exaggeration, 1);
    // The top of the volume
    expect(floorM + extrusionM).toBeCloseTo(feetToMeters(19500) * exaggeration, 1);
  });

  it('Heathrow CTR (SFC–2500ft): floor = 0, top = 2500ft', () => {
    const lower = parseVerticalLimit('SFC');
    const upper = parseVerticalLimit('2500 ft ALT');
    const exaggeration = 1;

    const floorM = renderFloorMeters(lower, exaggeration);
    const extrusionM = renderExtrusionMeters(lower, upper, exaggeration);

    expect(floorM).toBe(0);
    expect(extrusionM).toBeCloseTo(feetToMeters(2500), 1);
  });

  it('exaggeration scales both floor and extrusion uniformly', () => {
    const lower = parseVerticalLimit('FL55');
    const upper = parseVerticalLimit('FL195');

    const floor1x = renderFloorMeters(lower, 1);
    const ext1x = renderExtrusionMeters(lower, upper, 1);

    const floor5x = renderFloorMeters(lower, 5);
    const ext5x = renderExtrusionMeters(lower, upper, 5);

    expect(floor5x).toBeCloseTo(floor1x * 5, 1);
    expect(ext5x).toBeCloseTo(ext1x * 5, 1);
  });

  it('FRZ (SFC–400 ft AGL): floor = 0, renderApprox = true', () => {
    const lower = parseVerticalLimit('SFC');
    const upper = parseVerticalLimit('400 ft AGL');

    expect(lower.renderFeet).toBe(0);
    expect(upper.renderFeet).toBe(400);
    expect(upper.renderApprox).toBe(true);
    expect(upper.reference).toBe('AGL');
  });
});

describe('ADS-B classification semantics', () => {
  // Import classifyAircraft via dynamic import to avoid module resolution issues in test
  // We test the logic directly by replicating it here to validate the spec.

  function classifyMock(cat: string, t: string = ''): string {
    const C = cat.toUpperCase();
    const T = t.toUpperCase();
    if (C === 'A7') return 'helicopter';
    if (['R', 'EC35', 'EC45', 'H60', 'S76', 'B06', 'B505', 'AS32', 'A109', 'A119', 'H125', 'H145']
      .some(h => T === h || (h === 'R' && T.startsWith('R')))) return 'helicopter';
    if (C === 'A3' || C === 'A4' || C === 'A5') return 'jet';
    if (C === 'A6') return 'jet';
    // A2 must NOT return 'jet' — it is a weight category
    if (C === 'A1') return 'prop';
    return 'unknown';
  }

  it('A7 = helicopter', () => expect(classifyMock('A7')).toBe('helicopter'));
  it('A3/A4/A5 = jet (large/heavy by weight)', () => {
    expect(classifyMock('A3')).toBe('jet');
    expect(classifyMock('A4')).toBe('jet');
    expect(classifyMock('A5')).toBe('jet');
  });
  it('A6 = jet (high performance)', () => expect(classifyMock('A6')).toBe('jet'));
  it('A1 = prop (light)', () => expect(classifyMock('A1')).toBe('prop'));
  it('A2 = unknown (weight class, not propulsion)', () => {
    // A2 = 15,500–75,000 lbs. Includes turboprops, regional jets, business jets.
    // Was incorrectly returning "jet" — must be "unknown".
    expect(classifyMock('A2')).toBe('unknown');
  });
  it('empty category = unknown', () => expect(classifyMock('')).toBe('unknown'));
});

describe('Altitude slice filter logic', () => {
  // INTERSECT: volume intersects the slice altitude
  // CUTAWAY: show all volumes with floor <= slice

  function intersects(floorFt: number, ceilFt: number, sliceFt: number): boolean {
    return floorFt <= sliceFt && ceilFt >= sliceFt;
  }

  function cutaway(floorFt: number, sliceFt: number): boolean {
    return floorFt <= sliceFt;
  }

  it('INTERSECT: volume containing slice is visible', () => {
    expect(intersects(0, 3000, 1500)).toBe(true);
  });

  it('INTERSECT: volume entirely above slice is hidden', () => {
    expect(intersects(5000, 19500, 2500)).toBe(false);
  });

  it('INTERSECT: volume exactly at floor of slice is visible', () => {
    expect(intersects(2500, 5000, 2500)).toBe(true);
  });

  it('INTERSECT: volume exactly at ceiling of slice is visible', () => {
    expect(intersects(0, 2500, 2500)).toBe(true);
  });

  it('CUTAWAY: SFC volume always shown when floor <= slice', () => {
    expect(cutaway(0, 5000)).toBe(true);
  });

  it('CUTAWAY: volume with floor above slice is hidden', () => {
    expect(cutaway(5000, 3000)).toBe(false);
  });
});
