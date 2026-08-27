import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import type { MapboxOverlayProps } from '@deck.gl/mapbox';
import type { PickingInfo } from '@deck.gl/core';
import { useAirspaceData } from '../hooks/useAirspaceData';
import { useAdsbData, classifyAircraft, getAircraftAltitudeFt } from '../hooks/useAdsbData';
import { useIsMobile, useIsMobileLandscape } from '../hooks/useIsMobile';
import type { ProcessedVolume, AdsbAircraft } from '../types/uk-airspace';
import { ControlPanel } from './ControlPanel';
import { InfoPanel } from './InfoPanel';
import { AdsbPanel } from './AdsbPanel';
import {
  CATEGORY_COLORS, HIGHLIGHT_COLORS, AIRCRAFT_COLORS, getCategoryEdge,
  type VisualMode,
} from '../utils/colorUtils';
import { feetToMeters } from '../utils/altitudeParser';
import { LONDON_AERODROMES } from '../data/london-aerodromes';
import { HELICOPTER_ROUTES } from '../data/helicopter-routes';
import type { ExaggerationValue } from '../config/london';
import {
  DEFAULT_VIEW_STATE, CAMERA_PRESETS,
} from '../config/london';
import 'maplibre-gl/dist/maplibre-gl.css';

// ---- Bake a floor Z (metres) into all polygon vertex coordinates ----
// GeoJsonLayer ignores getPosition for polygon features. The only way to
// make extruded polygons float above Z=0 is to set Z on every vertex.
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

// ---- DeckGL overlay using react-map-gl useControl ----
function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

// ---- Dark base map style (CARTO Dark Matter - free, no API key) ----
// Note: use 1x PNG tiles (not @2x) — the retina variants lack CORS headers
const MAP_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{
    id: 'carto-dark-layer',
    type: 'raster' as const,
    source: 'carto-dark',
    minzoom: 0,
    maxzoom: 22,
  }],
};

// ---- Layer visibility state type ----
type LayerKey =
  | 'TMA' | 'CTA' | 'CTR' | 'ATZ'
  | 'RESTRICTED' | 'PROHIBITED' | 'DANGER'
  | 'HELICOPTER_ROUTE'
  | 'UAS_FRZ' | 'UAS_OTHER'
  | 'AERODROME'
  | 'ADSB_ALL' | 'ADSB_HELICOPTERS' | 'ADSB_JETS' | 'ADSB_TRAILS';

const DEFAULT_LAYER_VISIBILITY: Record<LayerKey, boolean> = {
  TMA: true, CTA: true, CTR: true, ATZ: true,
  RESTRICTED: true, PROHIBITED: true, DANGER: true,
  HELICOPTER_ROUTE: true,
  UAS_FRZ: true, UAS_OTHER: true,
  AERODROME: true,
  ADSB_ALL: false,
  ADSB_HELICOPTERS: false, ADSB_JETS: false,
  ADSB_TRAILS: false,
};

type SliceMode = 'INTERSECT' | 'CUTAWAY';

export function Map3D() {
  // Rendering controls
  const [mode, setMode] = useState<VisualMode>('HITBOX');
  const [opacity, setOpacity] = useState(1.0);
  const [exaggeration, setExaggeration] = useState<ExaggerationValue>(5);
  const [is3D, setIs3D] = useState(true);

  // Altitude slice
  const [sliceAlt, setSliceAlt] = useState<number | null>(null);
  const [sliceMode, setSliceMode] = useState<SliceMode>('INTERSECT');
  const [minAlt, setMinAlt] = useState(0);
  const [maxAlt, setMaxAlt] = useState(60000);

  // Layer visibility
  const [layers, setLayers] = useState(DEFAULT_LAYER_VISIBILITY);

  // ADS-B enabled when any ADSB layer is on
  const adsbEnabled = layers.ADSB_ALL || layers.ADSB_HELICOPTERS || layers.ADSB_JETS;

  // Selection/hover
  const [selectedVolume, setSelectedVolume] = useState<ProcessedVolume | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<AdsbAircraft | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; label: string } | null>(null);

  // View state
  type VS = { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number };
  const [viewState, setViewState] = useState<VS>(DEFAULT_VIEW_STATE as VS);

  // Camera preset flyto
  const [flyTo, setFlyTo] = useState<VS | null>(null);

  // Responsive
  const isMobile = useIsMobile();
  const isMobileLandscape = useIsMobileLandscape();
  const isMobileAny = isMobile || isMobileLandscape;

  // Data
  const { volumes, manifest, loading, error } = useAirspaceData({ mode, opacity, exaggeration });
  const { aircraft, lastUpdated } = useAdsbData(adsbEnabled);

  // Prevent map click from clearing selection when deck.gl handled it
  const deckClickHandled = useRef(false);

  // Apply flyTo when set
  useEffect(() => {
    if (flyTo) {
      setViewState(flyTo);
      setFlyTo(null);
    }
  }, [flyTo]);

  // ---- Toggle helpers ----
  const toggleLayer = useCallback((key: LayerKey) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleMode = useCallback((m: VisualMode) => setMode(m), []);

  // ---- Filter volumes by category + altitude ----
  const visibleVolumes = useMemo(() => {
    return volumes.filter(vol => {
      // Category filter
      const catKey = vol.category as LayerKey;
      if (!(catKey in layers)) {
        // Map sub-categories
        if (vol.category === 'UAS_FRZ' && !layers.UAS_FRZ) return false;
        if (vol.category === 'UAS_OTHER' && !layers.UAS_OTHER) return false;
        if (vol.category === 'HELICOPTER_ROUTE' && !layers.HELICOPTER_ROUTE) return false;
      } else {
        if (!layers[catKey]) return false;
      }

      const floorFt = vol.lower.renderFeet;
      const ceilFt = vol.upper.renderFeet;

      // Min/max altitude filter
      if (ceilFt < minAlt || floorFt > maxAlt) return false;

      // Altitude slice filter
      if (sliceAlt !== null) {
        if (sliceMode === 'INTERSECT') {
          return floorFt <= sliceAlt && ceilFt >= sliceAlt;
        }
        // CUTAWAY: show volumes below the slice
        if (sliceMode === 'CUTAWAY') {
          return floorFt <= sliceAlt;
        }
      }

      return true;
    });
  }, [volumes, layers, minAlt, maxAlt, sliceAlt, sliceMode]);

  // Sort by floor for correct render order
  const sortedVolumes = useMemo(
    () => [...visibleVolumes].sort((a, b) => a.lower.renderFeet - b.lower.renderFeet),
    [visibleVolumes],
  );

  // ---- Filter aircraft ----
  const visibleAircraft = useMemo(() => {
    if (!adsbEnabled) return [];
    return aircraft.filter(ac => {
      const cls = classifyAircraft(ac);
      if (layers.ADSB_ALL) return true;
      if (layers.ADSB_HELICOPTERS && cls === 'helicopter') return true;
      if (layers.ADSB_JETS && cls === 'jet') return true;
      return false;
    });
  }, [aircraft, adsbEnabled, layers]);

  // ---- Helicopter route geometries ----
  const heliRoutes = useMemo(() => {
    if (!layers.HELICOPTER_ROUTE) return [];
    return HELICOPTER_ROUTES.map(seg => ({
      ...seg,
      path: seg.coordinates,
      color: CATEGORY_COLORS.HELICOPTER_ROUTE.edge,
      width: 3,
    }));
  }, [layers.HELICOPTER_ROUTE]);

  // ---- Aerodrome markers ----
  const aerodromeData = useMemo(() => {
    if (!layers.AERODROME) return [];
    return LONDON_AERODROMES.map(a => ({
      ...a,
      position: [a.lon, a.lat, feetToMeters(a.elevationFt) * exaggeration],
      color: CATEGORY_COLORS.AERODROME.edge,
    }));
  }, [layers.AERODROME, exaggeration]);

  // ---- Aircraft 3D positions ----
  const aircraftData = useMemo(() => {
    return visibleAircraft.map(ac => {
      const altFt = getAircraftAltitudeFt(ac) ?? 0;
      const cls = classifyAircraft(ac);
      const altM = feetToMeters(altFt) * exaggeration;
      return {
        ...ac,
        position: [ac.lon!, ac.lat!, is3D ? altM : 0],
        color: AIRCRAFT_COLORS[cls],
        radius: 300,
      };
    });
  }, [visibleAircraft, exaggeration, is3D]);

  // ---- Click handlers ----
  const handleVolumeClick = useCallback((info: PickingInfo) => {
    deckClickHandled.current = true;
    if (info.object) {
      setSelectedVolume(info.object as ProcessedVolume);
      setSelectedAircraft(null);
    }
  }, []);

  const handleAircraftClick = useCallback((info: PickingInfo) => {
    deckClickHandled.current = true;
    if (info.object) {
      setSelectedAircraft(info.object as AdsbAircraft);
      setSelectedVolume(null);
    }
  }, []);

  const handleMapClick = useCallback(() => {
    if (!deckClickHandled.current) {
      setSelectedVolume(null);
      setSelectedAircraft(null);
    }
    deckClickHandled.current = false;
  }, []);

  const handleHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      const vol = info.object as ProcessedVolume;
      const name = vol.name || (info.object as AdsbAircraft).flight || '';
      setHoverInfo({ x: info.x, y: info.y, label: name });
    } else {
      setHoverInfo(null);
    }
  }, []);

  // ---- Build deck.gl layers ----
  const selectedId = selectedVolume?.id;

  const deckLayers = useMemo(() => {
    const result = [];

    // 1. Airspace fill layer
    if (sortedVolumes.length > 0) {
      result.push(new GeoJsonLayer({
        id: 'airspace-fill',
        data: { type: 'FeatureCollection', features: sortedVolumes.map(v => ({
          type: 'Feature',
          // In 3D mode: bake floorMeters as Z on every vertex so the polygon
          // base floats at the correct altitude. GeoJsonLayer reads vertex Z
          // as the base when extruded=true. getPosition is NOT valid here.
          geometry: is3D ? withBaseZ(v.geometry, v.floorMeters) : v.geometry,
          properties: v,
        })) },
        pickable: true,
        stroked: false,
        filled: true,
        extruded: is3D,
        wireframe: false,
        getElevation: (d: { properties: ProcessedVolume }) => {
          if (!is3D) return 0;
          return d.properties.extrusionMeters;
        },
        elevationScale: 1,
        getFillColor: (d: { properties: ProcessedVolume }) => {
          if (d.properties.id === selectedId) return HIGHLIGHT_COLORS.selected;
          return d.properties.color;
        },
        material: {
          ambient: 0.5,
          diffuse: 0.7,
          shininess: 20,
          specularColor: [40, 50, 60],
        },
        onClick: handleVolumeClick,
        onHover: handleHover,
        updateTriggers: {
          getFillColor: [selectedId],
          getElevation: [exaggeration, is3D],
        },
        // Polygon offset to float above map at floor altitude
        parameters: {
          depthTest: true,
        },
      } as unknown as ConstructorParameters<typeof GeoJsonLayer>[0]));

      // 2. Airspace wireframe/edge layer
      result.push(new GeoJsonLayer({
        id: 'airspace-wireframe',
        data: { type: 'FeatureCollection', features: sortedVolumes.map(v => ({
          type: 'Feature',
          geometry: is3D ? withBaseZ(v.geometry, v.floorMeters) : v.geometry,
          properties: v,
        })) },
        pickable: false,
        stroked: true,
        filled: false,
        extruded: is3D,
        wireframe: true,
        lineWidthMinPixels: mode === 'HITBOX' ? 2 : 1,
        getElevation: (d: { properties: ProcessedVolume }) => {
          if (!is3D) return 0;
          return d.properties.extrusionMeters;
        },
        elevationScale: 1,
        getLineColor: (d: { properties: ProcessedVolume }) => {
          if (d.properties.id === selectedId) return HIGHLIGHT_COLORS.selectedEdge;
          return getCategoryEdge(d.properties.category);
        },
        getLineWidth: (d: { properties: ProcessedVolume }) => d.properties.id === selectedId ? 80 : 30,
        updateTriggers: {
          getLineColor: [selectedId],
          getElevation: [exaggeration, is3D],
        },
      } as unknown as ConstructorParameters<typeof GeoJsonLayer>[0]));
    }

    // 3. Helicopter routes
    if (heliRoutes.length > 0) {
      result.push(new PathLayer({
        id: 'helicopter-routes',
        data: heliRoutes,
        pickable: false,
        getPath: (d: typeof heliRoutes[0]) => d.path.map(([lon, lat]) => [lon, lat, is3D ? feetToMeters((d.lower.renderFeet + d.upper.renderFeet) / 2) * exaggeration : 0]),
        getColor: (d: typeof heliRoutes[0]) => d.color,
        getWidth: 4,
        widthMinPixels: 2,
        widthMaxPixels: 8,
        capRounded: true,
        jointRounded: true,
      } as unknown as ConstructorParameters<typeof PathLayer>[0]));
    }

    // 4. Aerodrome markers
    if (aerodromeData.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'aerodromes',
        data: aerodromeData,
        pickable: true,
        getPosition: (d: typeof aerodromeData[0]) => d.position,
        getFillColor: [80, 220, 80, 200],
        getRadius: 400,
        radiusMinPixels: 5,
        radiusMaxPixels: 20,
        lineWidthMinPixels: 2,
        stroked: true,
        getLineColor: [100, 255, 100, 255],
        onClick: handleVolumeClick,
        onHover: handleHover,
      } as unknown as ConstructorParameters<typeof ScatterplotLayer>[0]));
    }

    // 5. Aircraft scatter
    if (aircraftData.length > 0) {
      result.push(new ScatterplotLayer({
        id: 'aircraft',
        data: aircraftData,
        pickable: true,
        getPosition: (d: typeof aircraftData[0]) => d.position,
        getFillColor: (d: typeof aircraftData[0]) => d.color,
        getRadius: (d: typeof aircraftData[0]) => d.radius,
        radiusMinPixels: 4,
        radiusMaxPixels: 16,
        stroked: true,
        getLineColor: [255, 255, 255, 180],
        lineWidthMinPixels: 1,
        onClick: handleAircraftClick,
        onHover: handleHover,
      } as unknown as ConstructorParameters<typeof ScatterplotLayer>[0]));
    }

    return result;
  }, [
    sortedVolumes, heliRoutes, aerodromeData, aircraftData,
    is3D, mode, exaggeration, selectedId,
    handleVolumeClick, handleAircraftClick, handleHover,
  ]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0e14' }}>

      {/* Base map + deck.gl */}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        maxPitch={85}
        minPitch={0}
        mapStyle={MAP_STYLE}
      >
        <DeckGLOverlay layers={deckLayers} interleaved />
      </Map>

      {/* ---- Control Panel (left side) ---- */}
      <ControlPanel
        mode={mode}
        onModeChange={toggleMode}
        opacity={opacity}
        onOpacityChange={setOpacity}
        exaggeration={exaggeration}
        onExaggerationChange={setExaggeration}
        is3D={is3D}
        onToggle3D={() => setIs3D(v => !v)}
        layers={layers}
        onToggleLayer={toggleLayer}
        sliceAlt={sliceAlt}
        onSliceAltChange={setSliceAlt}
        sliceMode={sliceMode}
        onSliceModeChange={setSliceMode}
        minAlt={minAlt}
        onMinAltChange={setMinAlt}
        maxAlt={maxAlt}
        onMaxAltChange={setMaxAlt}
        manifest={manifest}
        onCameraPreset={preset => {
          const p = CAMERA_PRESETS.find(c => c.id === preset);
          if (p) setFlyTo({ ...p.view });
        }}
        isMobile={isMobileAny}
      />

      {/* ---- Hover tooltip ---- */}
      {hoverInfo && !(isMobileAny && (selectedVolume || selectedAircraft)) && (
        <div
          style={{
            position: 'absolute',
            left: hoverInfo.x + 12,
            top: hoverInfo.y + 12,
            padding: '8px 12px',
            background: 'rgba(10, 14, 20, 0.92)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#f1f5f9',
            fontFamily: 'var(--font-sans)',
            pointerEvents: 'none',
            zIndex: 500,
            backdropFilter: 'blur(8px)',
            maxWidth: 240,
          }}
        >
          {hoverInfo.label}
        </div>
      )}

      {/* ---- Info panel for selected volume ---- */}
      {selectedVolume && (
        <InfoPanel
          volume={selectedVolume}
          onClose={() => setSelectedVolume(null)}
          isMobile={isMobileAny}
        />
      )}

      {/* ---- ADS-B aircraft detail ---- */}
      {selectedAircraft && (
        <AdsbPanel
          aircraft={selectedAircraft}
          exaggeration={exaggeration}
          onClose={() => setSelectedAircraft(null)}
          isMobile={isMobileAny}
        />
      )}

      {/* ---- ADS-B status indicator ---- */}
      {adsbEnabled && (
        <div style={{
          position: 'absolute',
          bottom: isMobileAny ? 56 : 20,
          right: 16,
          fontSize: '10px',
          color: 'rgba(148, 163, 184, 0.7)',
          fontFamily: 'var(--font-mono)',
          zIndex: 100,
          textAlign: 'right',
        }}>
          <span style={{ color: '#22c55e' }}>●</span>{' '}
          ADS-B {visibleAircraft.length} ac{' '}
          {lastUpdated ? `· ${lastUpdated.toLocaleTimeString()}` : ''}
        </div>
      )}

      {/* ---- Loading overlay ---- */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10, 14, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(148, 163, 184, 0.2)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: 16,
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 14, color: '#94a3b8' }}>Loading airspace data…</span>
        </div>
      )}

      {/* ---- Error state ---- */}
      {error && !loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(10, 14, 20, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 12, padding: '24px 32px',
          textAlign: 'center', zIndex: 2000,
          color: '#f1f5f9', fontFamily: 'var(--font-sans)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 12, color: '#ef4444' }}>⚠</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Failed to load airspace</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{error.message}</div>
        </div>
      )}

      {/* ---- Safety notice (bottom center) ---- */}
      <div style={{
        position: 'fixed',
        bottom: isMobileAny ? 6 : 8,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: isMobileAny ? '9px' : '10px',
        color: 'rgba(148, 163, 184, 0.6)',
        fontFamily: 'var(--font-sans)',
        zIndex: 1000,
        textAlign: 'center',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
      }}>
        FOR VISUALISATION ONLY · NOT FOR NAVIGATION OR FLIGHT PLANNING
      </div>
    </div>
  );
}
