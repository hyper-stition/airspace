import React, { useState } from 'react';
import type { ProcessedVolume } from '../types/uk-airspace';
import { getCategoryCSS, getCategoryLabel } from '../utils/colorUtils';

interface InfoPanelProps {
  volume: ProcessedVolume;
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

export function InfoPanel({ volume, onClose, isMobile }: InfoPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const css = getCategoryCSS(volume.category);

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
        width: 320,
        borderRadius: 12,
        animation: 'slideIn 0.2s ease-out',
        zIndex: 1000,
      };

  return (
    <div style={{
      ...panelStyle,
      background: 'rgba(10,14,20,0.96)',
      border: '1px solid rgba(148,163,184,0.12)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
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
              {getCategoryLabel(volume.category)}
            </div>
            {volume.airspaceClass && (
              <div style={{
                padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                fontFamily: 'var(--font-mono)',
              }}>
                Class {volume.airspaceClass}
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>
            {volume.name}
          </div>
          {volume.designator && volume.designator !== volume.name && (
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {volume.designator}
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

      {/* Altitude section */}
      <div style={{ padding: '12px 16px' }}>
        {/* Visual altitude bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 8, background: 'rgba(148,163,184,0.1)',
            borderRadius: 4, position: 'relative', minHeight: 72, flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', bottom: `${Math.min(volume.lower.renderFeet / 600, 95)}%`,
              left: 0, right: 0,
              height: `${Math.max(Math.min((volume.upper.renderFeet - volume.lower.renderFeet) / 600, 100), 5)}%`,
              background: `linear-gradient(to top, ${css}, ${css}88)`,
              borderRadius: 3,
              boxShadow: `0 0 6px ${css}60`,
              minHeight: 8,
            }} />
          </div>
          <div style={{ flex: 1 }}>
            {/* Ceiling */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Ceiling</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-mono)' }}>
                {volume.upper.label}
              </div>
              {volume.upper.renderApprox && (
                <div style={{ fontSize: 9, color: '#d97706', marginTop: 1 }}>
                  nominal render: {volume.upper.renderFeet.toLocaleString()} ft
                  {volume.upper.reference === 'STD' && ' (FL = pressure surface)'}
                  {volume.upper.reference === 'AGL' && ' (AGL approx, no terrain)'}
                  {volume.upper.reference === 'UNL' && ' (visual cap only)'}
                </div>
              )}
            </div>
            <div style={{ height: 1, background: `linear-gradient(to right, ${css}40, transparent)`, marginBottom: 8 }} />
            {/* Floor */}
            <div>
              <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Floor</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-mono)' }}>
                {volume.lower.label}
              </div>
              {volume.lower.renderApprox && (
                <div style={{ fontSize: 9, color: '#d97706', marginTop: 1 }}>
                  nominal render: {volume.lower.renderFeet.toLocaleString()} ft
                  {volume.lower.reference === 'STD' && ' (FL = pressure surface)'}
                  {volume.lower.reference === 'AGL' && ' (AGL approx, no terrain)'}
                </div>
              )}
            </div>
          </div>
          {/* Vertical extent */}
          <div style={{
            padding: '8px 10px', background: `${css}12`,
            border: `1px solid ${css}25`, borderRadius: 8,
            textAlign: 'right', flexShrink: 0, alignSelf: 'center',
          }}>
            <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', marginBottom: 2 }}>Range</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: css, fontFamily: 'var(--font-mono)' }}>
              {Math.round(volume.upper.renderFeet - volume.lower.renderFeet).toLocaleString()}
            </div>
            <div style={{ fontSize: 9, color: '#64748b' }}>ft</div>
          </div>
        </div>

        {/* Metadata rows */}
        <div style={{ borderTop: '1px solid rgba(148,163,184,0.08)', paddingTop: 8 }}>
          <Row label="Source" value={volume.source} />
          {volume.airac && <Row label="AIRAC" value={volume.airac} mono />}
          {volume.metadataIncomplete && (
            <Row label="Note" value="Metadata incomplete (no AIXM join)" warn />
          )}
        </div>

        {/* Advanced / raw properties */}
        {volume.properties && Object.keys(volume.properties).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{
                width: '100%', textAlign: 'left', background: 'none',
                border: '1px solid rgba(148,163,184,0.08)', borderRadius: 5,
                padding: '5px 8px', cursor: 'pointer',
                color: '#64748b', fontSize: 10,
                fontFamily: 'var(--font-mono)',
                display: 'flex', justifyContent: 'space-between',
              }}
            >
              RAW PROPERTIES
              <span style={{ opacity: 0.5 }}>{showAdvanced ? '▲' : '▼'}</span>
            </button>
            {showAdvanced && (
              <div style={{
                marginTop: 4, padding: '8px', borderRadius: 5,
                background: 'rgba(148,163,184,0.04)',
                border: '1px solid rgba(148,163,184,0.08)',
                fontSize: 10, fontFamily: 'var(--font-mono)', color: '#64748b',
                maxHeight: 180, overflowY: 'auto', lineHeight: 1.6,
              }}>
                {Object.entries(volume.properties).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#475569', minWidth: 90 }}>{k}:</span>
                    <span style={{ color: '#94a3b8', wordBreak: 'break-all' }}>
                      {v === null ? 'null' : String(v).slice(0, 120)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
