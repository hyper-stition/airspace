import { describe, it, expect } from 'vitest';
import {
  parseVerticalLimit,
  buildVerticalLimit,
  renderFloorMeters,
  renderExtrusionMeters,
  feetToMeters,
} from './altitudeParser';
import { UNL_RENDER_FEET } from '../config/london';

describe('parseVerticalLimit', () => {
  it('parses SFC', () => {
    const v = parseVerticalLimit('SFC');
    expect(v.reference).toBe('SFC');
    expect(v.label).toBe('SFC');
    expect(v.renderFeet).toBe(0);
    expect(v.renderApprox).toBeUndefined();
  });

  it('parses GND as SFC', () => {
    const v = parseVerticalLimit('GND');
    expect(v.reference).toBe('SFC');
    expect(v.renderFeet).toBe(0);
  });

  it('parses UNL', () => {
    const v = parseVerticalLimit('UNL');
    expect(v.reference).toBe('UNL');
    expect(v.label).toBe('UNL');
    expect(v.renderFeet).toBe(UNL_RENDER_FEET);
    expect(v.renderApprox).toBe(true);
  });

  it('parses UNLTD as UNL', () => {
    const v = parseVerticalLimit('UNLTD');
    expect(v.reference).toBe('UNL');
  });

  it('parses FL195', () => {
    const v = parseVerticalLimit('FL195');
    expect(v.unit).toBe('FL');
    expect(v.reference).toBe('STD');
    expect(v.value).toBe(195);
    expect(v.label).toBe('FL195');
    expect(v.renderFeet).toBe(19500);
    expect(v.renderApprox).toBe(true);
  });

  it('parses FL 35 with space', () => {
    const v = parseVerticalLimit('FL 35');
    expect(v.value).toBe(35);
    expect(v.label).toBe('FL35');
    expect(v.renderFeet).toBe(3500);
  });

  it('parses "2500 ft ALT"', () => {
    const v = parseVerticalLimit('2500 ft ALT');
    expect(v.unit).toBe('FT');
    expect(v.reference).toBe('ALT');
    expect(v.renderFeet).toBe(2500);
    expect(v.renderApprox).toBeUndefined();
  });

  it('parses "1500 ft AGL" with renderApprox', () => {
    const v = parseVerticalLimit('1500 ft AGL');
    expect(v.unit).toBe('FT');
    expect(v.reference).toBe('AGL');
    expect(v.renderFeet).toBe(1500);
    expect(v.renderApprox).toBe(true);
  });

  it('returns Unknown for null', () => {
    const v = parseVerticalLimit(null);
    expect(v.label).toBe('Unknown');
    expect(v.renderApprox).toBe(true);
  });

  it('returns Unknown for undefined', () => {
    const v = parseVerticalLimit(undefined);
    expect(v.label).toBe('Unknown');
  });
});

describe('buildVerticalLimit', () => {
  it('handles SFC reference', () => {
    const v = buildVerticalLimit(0, 'FT', 'SFC');
    expect(v.reference).toBe('SFC');
    expect(v.renderFeet).toBe(0);
  });

  it('handles GND reference (non-standard)', () => {
    const v = buildVerticalLimit(0, 'FT', 'GND');
    expect(v.reference).toBe('SFC');
  });

  it('handles UNLTD reference (non-standard)', () => {
    const v = buildVerticalLimit(null, 'FT', 'UNLTD');
    expect(v.reference).toBe('UNL');
    expect(v.renderFeet).toBe(UNL_RENDER_FEET);
  });

  it('handles null value as UNL', () => {
    const v = buildVerticalLimit(null, 'FT', 'AMSL');
    expect(v.reference).toBe('UNL');
  });

  it('handles FL unit', () => {
    const v = buildVerticalLimit(195, 'FL', 'STD');
    expect(v.unit).toBe('FL');
    expect(v.reference).toBe('STD');
    expect(v.label).toBe('FL195');
    expect(v.renderFeet).toBe(19500);
    expect(v.renderApprox).toBe(true);
  });

  it('handles FT AMSL', () => {
    const v = buildVerticalLimit(3500, 'FT', 'AMSL');
    expect(v.unit).toBe('FT');
    expect(v.reference).toBe('AMSL');
    expect(v.renderFeet).toBe(3500);
    expect(v.renderApprox).toBeUndefined();
  });

  it('handles FT AGL with renderApprox', () => {
    const v = buildVerticalLimit(500, 'FT', 'AGL');
    expect(v.reference).toBe('AGL');
    expect(v.renderApprox).toBe(true);
  });

  it('handles metres (M)', () => {
    const v = buildVerticalLimit(762, 'M', 'AMSL');
    expect(v.unit).toBe('M');
    expect(v.renderFeet).toBeCloseTo(2500, 0);
  });
});

describe('renderFloorMeters', () => {
  it('converts SFC to 0', () => {
    const lim = parseVerticalLimit('SFC');
    expect(renderFloorMeters(lim, 1)).toBe(0);
  });

  it('applies exaggeration', () => {
    const lim = parseVerticalLimit('FL100');
    // FL100 = 10000 ft nominal
    const base = feetToMeters(10000);
    expect(renderFloorMeters(lim, 5)).toBeCloseTo(base * 5, 1);
  });
});

describe('renderExtrusionMeters', () => {
  it('computes extrusion between SFC and FL100', () => {
    const lower = parseVerticalLimit('SFC');
    const upper = parseVerticalLimit('FL100');
    const extM = renderExtrusionMeters(lower, upper, 1);
    expect(extM).toBeCloseTo(feetToMeters(10000), 1);
  });

  it('applies exaggeration to extrusion', () => {
    const lower = parseVerticalLimit('SFC');
    const upper = parseVerticalLimit('FL100');
    expect(renderExtrusionMeters(lower, upper, 10))
      .toBeCloseTo(feetToMeters(10000) * 10, 1);
  });

  it('returns 0 when upper equals lower', () => {
    const lim = parseVerticalLimit('2500 ft ALT');
    expect(renderExtrusionMeters(lim, lim, 5)).toBe(0);
  });
});
