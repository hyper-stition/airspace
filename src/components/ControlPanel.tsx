import React, { useState } from 'react';
import type { VisualMode } from '../utils/colorUtils';
import { CATEGORY_COLORS, getCategoryCSS } from '../utils/colorUtils';
import type { ExaggerationValue } from '../config/london';
import { EXAGGERATION_PRESETS, CAMERA_PRESETS, ALTITUDE_SLICE_MAX } from '../config/london';
import type { DataManifest } from '../types/uk-airspace';

type LayerKey =
  | 'TMA' | 'CTA' | 'CTR' | 'ATZ'
  | 'RESTRICTED' | 'PROHIBITED' | 'DANGER'
  | 'HELICOPTER_ROUTE'
  | 'UAS_FRZ' | 'UAS_OTHER'
  | 'AERODROME'
  | 'ADSB_ALL' | 'ADSB_HELICOPTERS' | 'ADSB_JETS' | 'ADSB_TRAILS';

interface ControlPanelProps {
  mode: VisualMode;
  onModeChange: (m: VisualMode) => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  exaggeration: ExaggerationValue;
  onExaggerationChange: (v: ExaggerationValue) => void;
  is3D: boolean;
  onToggle3D: () => void;
  layers: Record<LayerKey, boolean>;
  onToggleLayer: (key: LayerKey) => void;
  sliceAlt: number | null;
  onSliceAltChange: (v: number | null) => void;
  sliceMode: 'INTERSECT' | 'CUTAWAY';
  onSliceModeChange: (m: 'INTERSECT' | 'CUTAWAY') => void;
  minAlt: number;
  onMinAltChange: (v: number) => void;
  maxAlt: number;
  onMaxAltChange: (v: number) => void;
  manifest: DataManifest | null;
  onCameraPreset: (id: string) => void;
  isMobile: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', textAlign: 'left', padding: '5px 0',
          background: 'none', border: 'none', borderBottom: '1px solid rgba(148,163,184,0.08)',
          color: 'rgba(148,163,184,0.6)', fontSize: 9,
          fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
          textTransform: 'uppercase', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        {title}
        <span style={{ opacity: 0.5, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ paddingTop: 6 }}>{children}</div>}
    </div>
  );
}

function LayerRow({
  label, active, onToggle, color, sub,
}: {
  label: string; active: boolean; onToggle: () => void; color?: string; sub?: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: `${sub ? 3 : 4}px ${sub ? 14 : 4}px`,
        cursor: 'pointer', borderRadius: 4,
        opacity: active ? 1 : 0.35,
        transition: 'opacity 0.15s',
        userSelect: 'none',
      }}
    >
      {color && (
        <div style={{
          width: 10, height: 10, borderRadius: 2,
          background: active ? color : 'rgba(148,163,184,0.2)',
          flexShrink: 0,
          boxShadow: active ? `0 0 6px ${color}80` : 'none',
          transition: 'all 0.15s',
        }} />
      )}
      <span style={{
        fontSize: sub ? 11 : 12, color: active ? '#e2e8f0' : '#64748b',
        fontFamily: 'var(--font-sans)',
        transition: 'color 0.15s',
      }}>
        {label}
      </span>
      <div style={{
        marginLeft: 'auto',
        width: 24, height: 13, borderRadius: 7,
        background: active ? '#3b82f6' : 'rgba(100,116,139,0.3)',
        position: 'relative', transition: 'background 0.15s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2,
          left: active ? 13 : 2,
          width: 9, height: 9, borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s',
        }} />
      </div>
    </div>
  );
}


export function ControlPanel({
  mode, onModeChange,
  opacity, onOpacityChange,
  exaggeration, onExaggerationChange,
  is3D, onToggle3D,
  layers, onToggleLayer,
  sliceAlt, onSliceAltChange,
  sliceMode, onSliceModeChange,
  minAlt, onMinAltChange,
  maxAlt, onMaxAltChange,
  manifest,
  onCameraPreset,
  isMobile,
}: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (isMobile && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 200,
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(10,14,20,0.92)', border: '1px solid rgba(148,163,184,0.15)',
          color: '#e2e8f0', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ☰
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', top: 12, left: 12, zIndex: 200,
        width: isMobile ? 'calc(100vw - 24px)' : 240,
        maxHeight: 'calc(100vh - 24px)',
        background: 'rgba(10,14,20,0.94)',
        border: '1px solid rgba(148,163,184,0.12)',
        borderRadius: 12,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
            London Airspace
          </div>
          <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
            {manifest
              ? `AIRAC ${manifest.airacDate} · ${manifest.source}`
              : 'AIRSPACE DEBUGGER'}
          </div>
        </div>
        {isMobile && (
          <button onClick={() => setCollapsed(true)} style={{
            background: 'none', border: 'none', color: '#94a3b8',
            fontSize: 18, cursor: 'pointer', padding: 4,
          }}>×</button>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: 'auto', padding: '8px 14px 12px', flex: 1 }}>

        {/* 2D / 3D + Visual mode */}
        <Section title="Display">
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {/* 2D/3D toggle */}
            <button
              onClick={onToggle3D}
              style={{
                flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
                fontFamily: 'var(--font-mono)', borderRadius: 6,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: is3D ? '#1e40af' : 'rgba(148,163,184,0.12)',
                color: is3D ? '#93c5fd' : '#64748b',
              }}
            >
              {is3D ? '3D' : '2D'}
            </button>
            {(['GLASS', 'HITBOX', 'SOLID'] as VisualMode[]).map(m => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600,
                  fontFamily: 'var(--font-mono)', borderRadius: 6,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: mode === m ? '#1e3a5f' : 'rgba(148,163,184,0.08)',
                  color: mode === m ? '#60a5fa' : '#64748b',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Opacity slider */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>OPACITY</span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={Math.round(opacity * 100)}
              onChange={e => onOpacityChange(parseInt(e.target.value) / 100)}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          {/* Vertical exaggeration */}
          {is3D && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>VERT EXAGGERATION</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {EXAGGERATION_PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => onExaggerationChange(p as ExaggerationValue)}
                    style={{
                      flex: 1, padding: '4px 0', fontSize: 10,
                      fontFamily: 'var(--font-mono)', borderRadius: 4,
                      border: 'none', cursor: 'pointer',
                      background: exaggeration === p ? '#1e3a5f' : 'rgba(148,163,184,0.08)',
                      color: exaggeration === p ? '#60a5fa' : '#64748b',
                    }}
                  >
                    {p}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Altitude slice */}
        <Section title="Altitude Filter">
          {/* Slice mode toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {(['INTERSECT', 'CUTAWAY'] as const).map(sm => (
              <button
                key={sm}
                onClick={() => onSliceModeChange(sm)}
                style={{
                  flex: 1, padding: '4px 0', fontSize: 9,
                  fontFamily: 'var(--font-mono)', borderRadius: 4,
                  border: 'none', cursor: 'pointer',
                  background: sliceMode === sm ? '#1e3a5f' : 'rgba(148,163,184,0.08)',
                  color: sliceMode === sm ? '#60a5fa' : '#64748b',
                }}
              >
                {sm}
              </button>
            ))}
            <button
              onClick={() => onSliceAltChange(null)}
              style={{
                padding: '4px 8px', fontSize: 9,
                fontFamily: 'var(--font-mono)', borderRadius: 4,
                border: 'none', cursor: 'pointer',
                background: sliceAlt === null ? '#0f172a' : 'rgba(148,163,184,0.08)',
                color: sliceAlt === null ? '#94a3b8' : '#64748b',
              }}
            >
              OFF
            </button>
          </div>

          {/* Slice altitude slider */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                VIEW AT
              </span>
              <span style={{ fontSize: 10, color: sliceAlt !== null ? '#60a5fa' : '#475569', fontFamily: 'var(--font-mono)' }}>
                {sliceAlt !== null ? `${sliceAlt.toLocaleString()} ft` : '—'}
              </span>
            </div>
            <input
              type="range" min={0} max={ALTITUDE_SLICE_MAX} step={100}
              value={sliceAlt ?? 0}
              onChange={e => onSliceAltChange(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          {/* Min/max filter */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>MIN</div>
              <input
                type="number" min={0} max={60000} step={500} value={minAlt}
                onChange={e => onMinAltChange(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%', background: 'rgba(148,163,184,0.06)',
                  border: '1px solid rgba(148,163,184,0.15)', borderRadius: 4,
                  padding: '3px 6px', color: '#94a3b8',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: '#475569', paddingTop: 14 }}>—</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>MAX</div>
              <input
                type="number" min={0} max={60000} step={500} value={maxAlt}
                onChange={e => onMaxAltChange(parseInt(e.target.value) || 60000)}
                style={{
                  width: '100%', background: 'rgba(148,163,184,0.06)',
                  border: '1px solid rgba(148,163,184,0.15)', borderRadius: 4,
                  padding: '3px 6px', color: '#94a3b8',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                }}
              />
            </div>
          </div>
        </Section>

        {/* Airspace layers */}
        <Section title="Airspace">
          {([
            ['TMA', 'TMA'],
            ['CTA', 'CTA'],
            ['CTR', 'CTR'],
            ['ATZ', 'ATZ'],
          ] as [LayerKey, string][]).map(([key, label]) => (
            <LayerRow
              key={key}
              label={label}
              active={layers[key]}
              onToggle={() => onToggleLayer(key)}
              color={getCategoryCSS(key as keyof typeof CATEGORY_COLORS)}
            />
          ))}
        </Section>

        <Section title="Restrictions">
          {([
            ['RESTRICTED', 'Restricted'],
            ['PROHIBITED', 'Prohibited'],
            ['DANGER', 'Danger'],
          ] as [LayerKey, string][]).map(([key, label]) => (
            <LayerRow
              key={key}
              label={label}
              active={layers[key]}
              onToggle={() => onToggleLayer(key)}
              color={getCategoryCSS(key as keyof typeof CATEGORY_COLORS)}
            />
          ))}
        </Section>

        <Section title="Helicopters">
          <LayerRow
            label="Routes (H2–H10)"
            active={layers.HELICOPTER_ROUTE}
            onToggle={() => onToggleLayer('HELICOPTER_ROUTE')}
            color={CATEGORY_COLORS.HELICOPTER_ROUTE.css}
          />
        </Section>

        <Section title="UAS / Drones">
          <LayerRow
            label="Flight Restriction Zones"
            active={layers.UAS_FRZ}
            onToggle={() => onToggleLayer('UAS_FRZ')}
            color={CATEGORY_COLORS.UAS_FRZ.css}
          />
          <LayerRow
            label="Other UAS Areas"
            active={layers.UAS_OTHER}
            onToggle={() => onToggleLayer('UAS_OTHER')}
            color={CATEGORY_COLORS.UAS_OTHER.css}
          />
        </Section>

        <Section title="Infrastructure">
          <LayerRow
            label="Aerodromes & Heliports"
            active={layers.AERODROME}
            onToggle={() => onToggleLayer('AERODROME')}
            color={CATEGORY_COLORS.AERODROME.css}
          />
        </Section>

        <Section title="Live Traffic">
          <LayerRow
            label="All Traffic"
            active={layers.ADSB_ALL}
            onToggle={() => onToggleLayer('ADSB_ALL')}
            color="#94a3b8"
          />
          <LayerRow
            label="Rotorcraft"
            active={layers.ADSB_HELICOPTERS}
            onToggle={() => onToggleLayer('ADSB_HELICOPTERS')}
            color={CATEGORY_COLORS.HELICOPTER_ROUTE.css}
            sub
          />
          <LayerRow
            label="Jets / Airliners"
            active={layers.ADSB_JETS}
            onToggle={() => onToggleLayer('ADSB_JETS')}
            color="#60a5fa"
            sub
          />
          <div style={{
            fontSize: 10, color: '#475569', padding: '4px 4px',
            fontFamily: 'var(--font-sans)', lineHeight: 1.4,
          }}>
            ODbL · adsb.lol · 10s refresh
          </div>
        </Section>

        {/* Camera presets */}
        <Section title="Camera">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {CAMERA_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => onCameraPreset(p.id)}
                style={{
                  textAlign: 'left', padding: '5px 8px',
                  background: 'rgba(148,163,184,0.06)',
                  border: '1px solid rgba(148,163,184,0.1)',
                  borderRadius: 5, cursor: 'pointer',
                  color: '#94a3b8', fontSize: 11,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(59,130,246,0.12)';
                  e.currentTarget.style.color = '#93c5fd';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(148,163,184,0.06)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Manifest / data info */}
        {manifest && (
          <div style={{
            marginTop: 8, padding: '6px 8px',
            background: 'rgba(148,163,184,0.04)',
            borderRadius: 6, border: '1px solid rgba(148,163,184,0.08)',
          }}>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
              <div>AIRAC: {manifest.airacDate}</div>
              <div>Features: {manifest.featureCount}</div>
              <div>Source: {manifest.source}</div>
              {manifest.warnings.length > 0 && (
                <div style={{ color: '#d97706', marginTop: 2 }}>⚠ {manifest.warnings[0]}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
