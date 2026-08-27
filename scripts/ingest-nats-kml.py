#!/usr/bin/env python3
"""
Ingest official NATS AIP KML into the application's GeoJSON format.

Source: EG_AIS_DS_FULL_20260806_KML.zip → EG_AIP_DS_FULL_20260806.kmz → eaip3d.kml
Pre-extracted to: .nats-cache/extracted/aip/eaip3d.kml

Category mapping:
  TMA         → TMA
  CTA         → CTA
  CTR         → CTR
  RAS (ATZ)   → ATZ
  Restricted (EGR1Uxxx + AGL upper) → UAS_FRZ
  Restricted (other)                → RESTRICTED
  Prohibited  → PROHIBITED
  Danger      → DANGER
  D_OTHER     → DANGER  (GVS, HIRTA, ranges, kite/parachute sites)
  OTHER:TMZ   → OTHER

Altitude parsing (from description HTML):
  FL(\d+)        → STD,  renderFeet = N*100,  renderApprox = true
  SFC            → SFC,  renderFeet = 0
  UNL            → UNL,  renderFeet = 60000,  renderApprox = true
  (\d+) FT ALT   → AMSL, renderFeet = N
  (\d+) FT AGL   → AGL,  renderFeet = N,      renderApprox = true
"""

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
AIP_KML = REPO_ROOT / '.nats-cache' / 'extracted' / 'aip' / 'eaip3d.kml'
OUT_GEOJSON = REPO_ROOT / 'public' / 'data' / 'airspace.geojson'
OUT_MANIFEST = REPO_ROOT / 'public' / 'data' / 'manifest.json'

# London bounding box (centroid filter)
# Slightly expanded from the display bbox to catch TMA/CTA sectors whose
# centroid falls just outside the visible area (e.g. EGTMA007/017/018/023)
BBOX = (-1.5, 50.75, 1.0, 52.25)  # west, south, east, north

# KML namespace
NS = '{http://www.opengis.net/kml/2.2}'

# Visual ceiling for UNL in feet (matches london.ts UNL_RENDER_FEET)
UNL_RENDER_FEET = 60_000

AIRAC_DATE = '2026-08-06'


# ---------------------------------------------------------------------------
# Altitude parsing
# ---------------------------------------------------------------------------

def parse_limit(raw: str) -> dict:
    """Parse a NATS AIP vertical limit string into a VerticalLimit dict."""
    s = raw.strip()

    fl_match = re.fullmatch(r'FL(\d+)', s, re.IGNORECASE)
    if fl_match:
        n = int(fl_match.group(1))
        return {
            'value': n,
            'unit': 'FL',
            'reference': 'STD',
            'label': f'FL{n}',
            'renderFeet': n * 100,
            'renderApprox': True,
        }

    if s.upper() == 'SFC':
        return {
            'value': 0,
            'unit': 'FT',
            'reference': 'SFC',
            'label': 'SFC',
            'renderFeet': 0,
        }

    if s.upper() == 'UNL':
        return {
            'value': None,
            'unit': None,
            'reference': 'UNL',
            'label': 'UNL',
            'renderFeet': UNL_RENDER_FEET,
            'renderApprox': True,
        }

    alt_match = re.fullmatch(r'(\d+)\s+FT\s+ALT', s, re.IGNORECASE)
    if alt_match:
        n = int(alt_match.group(1))
        return {
            'value': n,
            'unit': 'FT',
            'reference': 'AMSL',
            'label': f'{n} ft ALT',
            'renderFeet': n,
        }

    agl_match = re.fullmatch(r'(\d+)\s+FT\s+AGL', s, re.IGNORECASE)
    if agl_match:
        n = int(agl_match.group(1))
        return {
            'value': n,
            'unit': 'FT',
            'reference': 'AGL',
            'label': f'{n} ft AGL',
            'renderFeet': n,
            'renderApprox': True,
        }

    # Fallback – preserve raw string
    print(f'  WARN: unrecognised limit: {repr(s)}', file=sys.stderr)
    return {
        'value': None,
        'unit': 'FT',
        'reference': 'AMSL',
        'label': s,
        'renderFeet': 0,
    }


# ---------------------------------------------------------------------------
# Description parsing
# ---------------------------------------------------------------------------

_UPPER_RE = re.compile(r'Upper limit:\s*([^\n<]+)', re.IGNORECASE)
_LOWER_RE = re.compile(r'Lower limit:\s*([^\n<]+)', re.IGNORECASE)
_CLASS_RE = re.compile(r'Class:\s*([^\n<]+)', re.IGNORECASE)


def parse_description(desc: str) -> tuple[dict | None, dict | None, str | None]:
    """Return (lower_limit, upper_limit, airspace_class) from description HTML."""
    upper_raw = _UPPER_RE.search(desc)
    lower_raw = _LOWER_RE.search(desc)
    cls_raw = _CLASS_RE.search(desc)

    upper = parse_limit(upper_raw.group(1)) if upper_raw else None
    lower = parse_limit(lower_raw.group(1)) if lower_raw else None
    cls = cls_raw.group(1).strip() if cls_raw else None
    return lower, upper, cls


# ---------------------------------------------------------------------------
# Geometry parsing
# ---------------------------------------------------------------------------

def parse_coordinates(coords_el) -> list[list[float]]:
    """Parse KML <coordinates> element into [[lon, lat], ...] ring."""
    ring = []
    for token in coords_el.text.strip().split():
        parts = token.split(',')
        lon, lat = float(parts[0]), float(parts[1])
        # Z value (parts[2]) is Google Earth display altitude — ignored
        ring.append([lon, lat])
    # Ensure ring is closed
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


def parse_geometry(pm) -> dict | None:
    """Parse Placemark geometry into GeoJSON Polygon or MultiPolygon."""
    # Single polygon
    poly_el = pm.find('.//' + NS + 'Polygon')
    multi_el = pm.find('.//' + NS + 'MultiGeometry')

    if multi_el is not None:
        polygons = []
        for poly in multi_el.findall('.//' + NS + 'Polygon'):
            outer = poly.find('.//' + NS + 'outerBoundaryIs/' + NS + 'LinearRing/' + NS + 'coordinates')
            if outer is None:
                outer = poly.find('.//' + NS + 'coordinates')
            if outer is not None:
                polygons.append([parse_coordinates(outer)])
        if not polygons:
            return None
        if len(polygons) == 1:
            return {'type': 'Polygon', 'coordinates': polygons[0]}
        return {'type': 'MultiPolygon', 'coordinates': polygons}

    if poly_el is not None:
        outer = poly_el.find('.//' + NS + 'outerBoundaryIs/' + NS + 'LinearRing/' + NS + 'coordinates')
        if outer is None:
            outer = poly_el.find('.//' + NS + 'coordinates')
        if outer is not None:
            return {'type': 'Polygon', 'coordinates': [parse_coordinates(outer)]}

    # Fallback: bare coordinates element (some KML uses this)
    coords_el = pm.find('.//' + NS + 'coordinates')
    if coords_el is not None:
        return {'type': 'Polygon', 'coordinates': [parse_coordinates(coords_el)]}

    return None


# ---------------------------------------------------------------------------
# Bbox centroid filter
# ---------------------------------------------------------------------------

def centroid_in_bbox(geometry: dict) -> bool:
    """Return True if geometry centroid is inside the London bbox."""
    if geometry['type'] == 'Polygon':
        rings = geometry['coordinates']
    else:
        rings = [p[0] for p in geometry['coordinates']]

    lons, lats = [], []
    for ring in rings:
        for lon, lat in ring:
            lons.append(lon)
            lats.append(lat)

    if not lons:
        return False
    cx = sum(lons) / len(lons)
    cy = sum(lats) / len(lats)
    return BBOX[0] <= cx <= BBOX[2] and BBOX[1] <= cy <= BBOX[3]


# ---------------------------------------------------------------------------
# ID / slug generation
# ---------------------------------------------------------------------------

def make_id(name: str) -> str:
    """Slugify KML name into a stable feature ID."""
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


# ---------------------------------------------------------------------------
# Feature builder
# ---------------------------------------------------------------------------

def build_feature(pm, category: str) -> dict | None:
    """Build a GeoJSON Feature from a KML Placemark."""
    nm_el = pm.find(NS + 'name')
    name = nm_el.text.strip() if nm_el is not None and nm_el.text else ''
    if not name:
        return None

    desc_el = pm.find(NS + 'description')
    desc = desc_el.text if desc_el is not None and desc_el.text else ''

    lower, upper, airspace_class = parse_description(desc)
    if lower is None or upper is None:
        print(f'  SKIP (no limits): {name}', file=sys.stderr)
        return None

    geometry = parse_geometry(pm)
    if geometry is None:
        print(f'  SKIP (no geometry): {name}', file=sys.stderr)
        return None

    if not centroid_in_bbox(geometry):
        return None

    # Override category for UAS_FRZ: EGR1Uxxx Restricted with AGL upper limit
    if category == 'RESTRICTED':
        desig = name.split()[0] if name else ''
        if re.match(r'^EGR1U', desig, re.IGNORECASE) and upper.get('reference') == 'AGL':
            category = 'UAS_FRZ'

    feat_id = make_id(name)

    return {
        'type': 'Feature',
        'geometry': geometry,
        'properties': {
            'id': feat_id,
            'name': name,
            'designator': name.split()[-1] if name else None,  # Last token is usually the ICAO designator
            'category': category,
            'airspaceClass': airspace_class,
            'lower': lower,
            'upper': upper,
            'source': 'NATS_AIP',
            'airac': AIRAC_DATE,
            'metadataIncomplete': False,
        },
    }


# ---------------------------------------------------------------------------
# Folder traversal
# ---------------------------------------------------------------------------

def get_airspace_folder(root) -> ET.Element | None:
    """Find the top-level Airspaces folder."""
    for f in root.iter(NS + 'Folder'):
        n = f.find(NS + 'name')
        if n is not None and n.text == 'Airspaces':
            return f
    return None


def get_named_folder(parent, name: str) -> ET.Element | None:
    """Find a direct-child Folder by name."""
    for child in parent:
        if child.tag != NS + 'Folder':
            continue
        n = child.find(NS + 'name')
        if n is not None and n.text == name:
            return child
    return None


def collect_placemarks(folder) -> list:
    """Recursively collect all Placemarks from a folder."""
    return list(folder.iter(NS + 'Placemark'))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f'Parsing AIP KML: {AIP_KML}')
    tree = ET.parse(str(AIP_KML))
    root = tree.getroot()

    airspaces = get_airspace_folder(root)
    if airspaces is None:
        print('ERROR: Airspaces folder not found', file=sys.stderr)
        sys.exit(1)

    # Category mapping: KML folder name → (app category, skip/include flag)
    folder_map = [
        ('TMA',      'TMA',        True),
        ('CTA',      'CTA',        True),
        ('CTR',      'CTR',        True),
        ('RAS',      'ATZ',        True),   # filter to ATZ only inside
        ('Restricted', 'RESTRICTED', True),
        ('Prohibited', 'PROHIBITED', True),
        ('Danger',   'DANGER',     True),
        ('D_OTHER',  'DANGER',     True),   # GVS, HIRTA, ranges, etc. = D-type
        ('OTHER:TMZ', 'OTHER',     True),
    ]

    features = []
    stats = {}

    for folder_name, category, include in folder_map:
        if not include:
            continue
        folder = get_named_folder(airspaces, folder_name)
        if folder is None:
            print(f'  WARN: folder not found: {folder_name}', file=sys.stderr)
            continue

        folder_count = 0
        for pm in collect_placemarks(folder):
            # For RAS: only include ATZ; skip TMZ (covered by OTHER:TMZ) and others
            if folder_name == 'RAS':
                nm_el = pm.find(NS + 'name')
                pm_name = nm_el.text if nm_el is not None and nm_el.text else ''
                if 'ATZ' not in pm_name.upper():
                    continue

            feat = build_feature(pm, category)
            if feat is not None:
                features.append(feat)
                folder_count += 1

        stats[folder_name] = folder_count
        print(f'  {folder_name:12} → {category:12} : {folder_count} features')

    # Build GeoJSON FeatureCollection
    geojson = {
        'type': 'FeatureCollection',
        'features': features,
    }

    OUT_GEOJSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_GEOJSON.write_text(json.dumps(geojson, indent=2))
    print(f'\nWrote {len(features)} features to {OUT_GEOJSON}')

    # Category breakdown from actual output (post-reclassification e.g. UAS_FRZ)
    from collections import Counter
    cat_counts = dict(sorted(Counter(f['properties']['category'] for f in features).items()))

    # Manifest
    manifest = {
        'source': 'NATS_AIP',
        'sourceFilenames': [
            'EG_AIS_DS_FULL_20260806_KML.zip',
            'EG_AIP_DS_FULL_20260806.kmz',
            'eaip3d.kml',
        ],
        'airacDate': AIRAC_DATE,
        'generatedAt': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        'featureCount': len(features),
        'categoryBreakdown': cat_counts,
        'warnings': [
            'Official NATS AIP AIRAC 2026-08-06 data. Boundaries from official KML.',
            'Helicopter routes remain curated (see src/data/helicopter-routes.ts).',
            'Not for operational use. See DATA_SOURCES.md.',
        ],
        'bbox': list(BBOX),
    }

    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2))
    print(f'Wrote manifest to {OUT_MANIFEST}')

    print('\nCategory breakdown:')
    for cat, count in cat_counts.items():
        print(f'  {cat:15} {count}')


if __name__ == '__main__':
    main()
