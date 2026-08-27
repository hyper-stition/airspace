import React from 'react';
import type { AdsbAircraft } from '../types/uk-airspace';
import { classifyAircraft, getAircraftAltitudeFt } from '../hooks/useAdsbData';
import { AIRCRAFT_COLORS } from '../utils/colorUtils';
import type { ExaggerationValue } from '../config/london';

interface AdsbPanelProps {
  aircraft: AdsbAircraft;
  exaggeration: ExaggerationValue;
  onClose: () => void;
  isMobile: boolean;
}

function Row({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 11, color: warn ? '#f59e0b' : '#e2e8f0',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  );
}

function colorToCSS(rgba: [number, number, number, number]): string {
  return `rgb(${rgba[0]},${rgba[1]},${rgba[2]})`;
}

function formatRate(rate: number | undefined): string {
  if (rate === undefined) return '—';
  if (rate > 0) return `+${rate.toLocaleString()} fpm`;
  if (rate < 0) return `${rate.toLocaleString()} fpm`;
  return '0 fpm';
}

function formatSquawk(squawk: string | undefined): string {
  if (!squawk) return '—';
  const special: Record<string, string> = {
    '7500': '7500 HIJACK',
    '7600': '7600 COMMS FAIL',
    '7700': '7700 EMERGENCY',
  };
  return special[squawk] ?? squawk;
}

function classLabel(cls: string): string {
  switch (cls) {
    case 'helicopter': return 'HELICOPTER';
    case 'jet': return 'JET';
    case 'prop': return 'PROP';
    default: return 'UNKNOWN';
  }
}

export function AdsbPanel({ aircraft, onClose, isMobile }: AdsbPanelProps) {
  const cls = classifyAircraft(aircraft);
  const altFt = getAircraftAltitudeFt(aircraft);
  const css = colorToCSS(AIRCRAFT_COLORS[cls]);

  const isEmergency = aircraft.emergency && aircraft.emergency !== 'none' && aircraft.emergency !== '';
  const squawkWarning = aircraft.squawk === '7500' || aircraft.squawk === '7600' || aircraft.squawk === '7700';

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        borderRadius: '16px 16px 0 0',
        borderBottom: 'none',
        animation: 'slideUp 0.2s ease-out',
        zIndex: 1000,
      }
    : {
        position: 'fixed',
        bottom: 24, right: 16,
        width: 300,
        borderRadius: 12,
        animation: 'slideIn 0.2s ease-out',
        zIndex: 1000,
      };

  return (
    <div style={{
      ...panelStyle,
      background: 'rgba(10,14,20,0.96)',
      border: `1px solid ${isEmergency ? 'rgba(239,68,68,0.4)' : 'rgba(148,163,184,0.12)'}`,
      backdropFilter: 'blur(20px)',
      boxShadow: isEmergency
        ? '0 8px 40px rgba(239,68,68,0.3)'
        : '0 8px 40px rgba(0,0,0,0.6)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
        background: `linear-gradient(135deg, ${css}14 0%, transparent 60%)`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{
              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: `${css}25`, color: css, fontFamily: 'var(--font-mono)',
              border: `1px solid ${css}40`,
            }}>
              {classLabel(cls)}
            </div>
            {isEmergency && (
              <div style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: 'rgba(239,68,68,0.2)', color: '#ef4444',
                fontFamily: 'var(--font-mono)', border: '1px solid rgba(239,68,68,0.4)',
                animation: 'none',
              }}>
                EMERGENCY
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3, fontFamily: 'var(--font-mono)' }}>
            {aircraft.flight?.trim() || aircraft.hex.toUpperCase()}
          </div>
          {aircraft.flight && (
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {aircraft.hex.toUpperCase()}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)',
            background: 'rgba(148,163,184,0.08)', color: '#94a3b8',
            fontSize: 16, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* Data rows */}
      <div style={{ padding: '12px 16px' }}>

        {/* Altitude */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Altitude</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {altFt !== null ? altFt.toLocaleString() : '—'}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                {aircraft.alt_geom !== undefined ? 'ft GEOM' : 'ft BARO'}
              </div>
            </div>
            {(() => {
              // Use geometric rate when showing geometric altitude; baro rate otherwise.
              const vrate = aircraft.alt_geom !== undefined
                ? (aircraft.geom_rate ?? aircraft.baro_rate)
                : aircraft.baro_rate;
              if (vrate === undefined) return null;
              return (
                <div style={{
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: vrate > 100 ? '#22c55e' : vrate < -100 ? '#f87171' : '#94a3b8',
                  paddingBottom: 4,
                }}>
                  {vrate > 100 ? '▲' : vrate < -100 ? '▼' : '→'}{' '}
                  {formatRate(vrate)}
                </div>
              );
            })()}
          </div>
          {aircraft.alt_baro === 'ground' && (
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>On ground</div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(148,163,184,0.08)', paddingTop: 8 }}>
          {aircraft.r && <Row label="Registration" value={aircraft.r} mono />}
          {aircraft.t && <Row label="Type" value={aircraft.t} mono />}
          {aircraft.gs !== undefined && (
            <Row label="Ground Speed" value={`${Math.round(aircraft.gs)} kts`} mono />
          )}
          {(aircraft.true_heading ?? aircraft.track) !== undefined && (
            <Row label="Heading" value={`${Math.round(aircraft.true_heading ?? aircraft.track!)}°`} mono />
          )}
          {aircraft.squawk && (
            <Row
              label="Squawk"
              value={formatSquawk(aircraft.squawk)}
              mono
              warn={squawkWarning}
            />
          )}
          {aircraft.dst !== undefined && (
            <Row label="Distance" value={`${aircraft.dst.toFixed(1)} nm`} mono />
          )}
          {aircraft.seen_pos !== undefined && (
            <Row label="Last pos" value={`${Math.round(aircraft.seen_pos)}s ago`} warn={aircraft.seen_pos > 30} />
          )}
          {aircraft.seen !== undefined && (
            <Row label="Last msg" value={`${Math.round(aircraft.seen)}s ago`} warn={aircraft.seen > 60} />
          )}
          {aircraft.category && (
            <Row label="ADS-B Cat" value={aircraft.category.toUpperCase()} mono />
          )}
        </div>

        {/* Emergency details */}
        {isEmergency && (
          <div style={{
            marginTop: 8, padding: '8px 10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 6, fontSize: 11,
            color: '#fca5a5', fontFamily: 'var(--font-mono)',
          }}>
            EMERGENCY: {aircraft.emergency?.toUpperCase()}
          </div>
        )}

        {/* Source note */}
        <div style={{ marginTop: 10, fontSize: 9, color: '#334155', fontFamily: 'var(--font-mono)' }}>
          Source: adsb.lol · ODbL · live data
        </div>
      </div>
    </div>
  );
}
