// UK airspace category colours
// Coherent dark-map visual language for the London airspace debugger

import type { AirspaceCategory } from '../types/uk-airspace';

export interface CategoryColors {
  fill: [number, number, number, number];   // RGBA for Glass mode
  hitboxFill: [number, number, number, number];  // near-transparent for Hitbox mode
  edge: [number, number, number, number];   // Edge/wireframe colour
  solid: [number, number, number, number];  // More opaque for Solid mode
  css: string;
  label: string;
}

// Hitbox mode base fill alpha (very low – almost transparent)
const HB = 15;
// Glass mode alpha
const GL = 55;
// Solid mode alpha
const SO = 130;

export const CATEGORY_COLORS: Record<AirspaceCategory, CategoryColors> = {
  TMA: {
    fill:       [40, 120, 220, GL],
    hitboxFill: [40, 120, 220, HB],
    edge:       [80, 160, 255, 220],
    solid:      [40, 120, 220, SO],
    css: '#2878dc',
    label: 'TMA',
  },
  CTA: {
    fill:       [30, 100, 200, GL],
    hitboxFill: [30, 100, 200, HB],
    edge:       [60, 140, 240, 200],
    solid:      [30, 100, 200, SO],
    css: '#1e64c8',
    label: 'CTA',
  },
  CTR: {
    fill:       [0, 180, 200, GL],
    hitboxFill: [0, 180, 200, HB],
    edge:       [0, 220, 240, 240],
    solid:      [0, 180, 200, SO],
    css: '#00b4c8',
    label: 'CTR',
  },
  ATZ: {
    fill:       [0, 200, 160, GL],
    hitboxFill: [0, 200, 160, HB],
    edge:       [0, 240, 190, 220],
    solid:      [0, 200, 160, SO],
    css: '#00c8a0',
    label: 'ATZ',
  },
  RESTRICTED: {
    fill:       [220, 40, 40, GL],
    hitboxFill: [220, 40, 40, HB + 10],
    edge:       [255, 80, 80, 240],
    solid:      [220, 40, 40, SO],
    css: '#dc2828',
    label: 'Restricted',
  },
  PROHIBITED: {
    fill:       [180, 0, 60, GL],
    hitboxFill: [180, 0, 60, HB + 10],
    edge:       [255, 0, 80, 255],
    solid:      [180, 0, 60, SO],
    css: '#b4003c',
    label: 'Prohibited',
  },
  DANGER: {
    fill:       [255, 100, 0, GL],
    hitboxFill: [255, 100, 0, HB],
    edge:       [255, 140, 0, 220],
    solid:      [255, 100, 0, SO],
    css: '#ff6400',
    label: 'Danger',
  },
  UAS_FRZ: {
    fill:       [255, 165, 0, GL],
    hitboxFill: [255, 165, 0, HB],
    edge:       [255, 200, 0, 230],
    solid:      [255, 165, 0, SO],
    css: '#ffa500',
    label: 'UAS FRZ',
  },
  UAS_OTHER: {
    fill:       [200, 140, 0, GL],
    hitboxFill: [200, 140, 0, HB],
    edge:       [240, 180, 0, 200],
    solid:      [200, 140, 0, SO],
    css: '#c88c00',
    label: 'UAS Other',
  },
  HELICOPTER_ROUTE: {
    fill:       [255, 215, 0, GL],
    hitboxFill: [255, 215, 0, HB],
    edge:       [255, 235, 0, 255],
    solid:      [255, 215, 0, SO],
    css: '#ffd700',
    label: 'Helicopter Route',
  },
  AERODROME: {
    fill:       [100, 220, 100, GL],
    hitboxFill: [100, 220, 100, HB],
    edge:       [100, 255, 100, 220],
    solid:      [100, 220, 100, SO],
    css: '#64dc64',
    label: 'Aerodrome',
  },
  OTHER: {
    fill:       [128, 128, 128, GL],
    hitboxFill: [128, 128, 128, HB],
    edge:       [180, 180, 180, 180],
    solid:      [128, 128, 128, SO],
    css: '#808080',
    label: 'Other',
  },
};

export type VisualMode = 'HITBOX' | 'GLASS' | 'SOLID';

export function getCategoryFill(
  category: AirspaceCategory,
  mode: VisualMode,
  opacity: number = 1.0,
): [number, number, number, number] {
  const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
  let base: [number, number, number, number];
  if (mode === 'HITBOX') base = c.hitboxFill;
  else if (mode === 'GLASS') base = c.fill;
  else base = c.solid;
  return [base[0], base[1], base[2], Math.round(base[3] * opacity)];
}

export function getCategoryEdge(category: AirspaceCategory): [number, number, number, number] {
  return CATEGORY_COLORS[category]?.edge ?? CATEGORY_COLORS.OTHER.edge;
}

export function getCategoryCSS(category: AirspaceCategory): string {
  return CATEGORY_COLORS[category]?.css ?? '#808080';
}

export function getCategoryLabel(category: AirspaceCategory): string {
  return CATEGORY_COLORS[category]?.label ?? 'Other';
}

// Highlight colours for selection/hover interaction
export const HIGHLIGHT_COLORS = {
  selected:     [255, 220, 30, 220]  as [number, number, number, number],
  selectedEdge: [255, 240, 60, 255]  as [number, number, number, number],
  hover:        [255, 180, 60, 160]  as [number, number, number, number],
  hoverEdge:    [255, 200, 80, 230]  as [number, number, number, number],
};

// ADS-B aircraft colours by category
export const AIRCRAFT_COLORS = {
  helicopter: [255, 215, 0, 220]   as [number, number, number, number],  // gold
  jet:        [100, 200, 255, 220] as [number, number, number, number],  // light blue
  prop:       [100, 255, 150, 200] as [number, number, number, number],  // green
  unknown:    [200, 200, 200, 180] as [number, number, number, number],  // grey
};
