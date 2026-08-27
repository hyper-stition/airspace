/**
 * Map overlay widgets: compass/axes gizmo + scale bar + coordinate readout.
 */

// ---- Compass + 3D axes gizmo ----------------------------------------

interface CompassProps {
  bearing: number; // degrees CW from north
  pitch: number;   // degrees from vertical (0 = top-down, 85 = near-horizontal)
}

/**
 * Projects an ENU (East-North-Up) unit vector onto screen (SVG) space given
 * the current map bearing and pitch, using an orthographic camera model.
 *
 * Screen +X = right, Screen +Y = down.
 *
 * Derivation:
 *   camera_right  = (cos β, −sin β, 0)      [ENU, β = bearing in radians]
 *   camera_up     = (sin β · cos p, cos β · cos p, sin p)   [ENU, p = pitch rad]
 *   sx = dot(d, camera_right)
 *   sy = −dot(d, camera_up)          [negate because SVG Y is flipped]
 */
function projectENU(
  dx: number, dy: number, dz: number,
  bearingRad: number, pitchRad: number,
  armLength: number,
  cx: number, cy: number,
): [number, number] {
  const cosB = Math.cos(bearingRad);
  const sinB = Math.sin(bearingRad);
  const cosP = Math.cos(pitchRad);
  const sinP = Math.sin(pitchRad);

  const sx = dx * cosB - dy * sinB;
  const sy = -(dx * sinB * cosP + dy * cosB * cosP + dz * sinP);

  return [cx + sx * armLength, cy + sy * armLength];
}

export function CompassWidget({ bearing, pitch }: CompassProps) {
  const SIZE = 108;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const ARM = 34; // axis arm pixels from centre

  const β = (bearing * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;

  const proj = (dx: number, dy: number, dz: number) =>
    projectENU(dx, dy, dz, β, p, ARM, CX, CY);

  const eastPt  = proj(1, 0, 0);
  const northPt = proj(0, 1, 0);
  const upPt    = proj(0, 0, 1);

  // Painter's algorithm: draw the "furthest back" axis first (highest screen Y
  // for its tip means it is closest; lowest = furthest → draw first).
  const axes = [
    { id: 'E', end: eastPt,  color: '#ef4444', negEnd: proj(-1, 0, 0) },
    { id: 'N', end: northPt, color: '#22c55e', negEnd: proj(0, -1, 0) },
    { id: 'Z', end: upPt,    color: '#60a5fa', negEnd: proj(0, 0, -1) },
  ].sort((a, b) => a.end[1] - b.end[1]); // furthest (lowest screen Y) first

  const bearingNorm = Math.round(((bearing % 360) + 360) % 360);
  const pitchNorm   = Math.round(pitch);

  // Label offset: push label slightly beyond the tip
  function labelPos(tip: [number, number]): [number, number] {
    const dx = tip[0] - CX;
    const dy = tip[1] - CY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return [tip[0] + (dx / len) * 11, tip[1] + (dy / len) * 11];
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 72,
        right: 14,
        zIndex: 200,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <svg width={SIZE} height={SIZE} style={{ display: 'block', overflow: 'visible' }}>
        {/* Panel background */}
        <circle
          cx={CX} cy={CY} r={SIZE / 2 - 1}
          fill="rgba(10,14,20,0.82)"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={1}
        />

        {/* Faint ring at arm radius */}
        <circle
          cx={CX} cy={CY} r={ARM}
          fill="none"
          stroke="rgba(148,163,184,0.08)"
          strokeWidth={1}
        />

        {/* Axes — back to front */}
        {axes.map(({ id, end, color, negEnd }) => {
          const [lx, ly] = labelPos(end);
          return (
            <g key={id}>
              {/* Dashed negative half */}
              <line
                x1={CX} y1={CY} x2={negEnd[0]} y2={negEnd[1]}
                stroke={color} strokeWidth={1.5}
                strokeOpacity={0.3} strokeDasharray="3 3"
              />
              {/* Solid positive half */}
              <line
                x1={CX} y1={CY} x2={end[0]} y2={end[1]}
                stroke={color} strokeWidth={2}
              />
              {/* Arrowhead dot */}
              <circle cx={end[0]} cy={end[1]} r={3.5} fill={color} />
              {/* Axis label */}
              <text
                x={lx} y={ly + 3.5}
                fill={color}
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {id}
              </text>
            </g>
          );
        })}

        {/* Centre pivot */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(148,163,184,0.55)" />

        {/* North cardinal tick on outer ring */}
        {(() => {
          const nx = northPt[0];
          const ny = northPt[1];
          const dx = nx - CX;
          const dy = ny - CY;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          // short tick mark just outside the arm ring
          const r0 = ARM + 4;
          const r1 = ARM + 9;
          return (
            <line
              x1={CX + (dx / len) * r0}
              y1={CY + (dy / len) * r0}
              x2={CX + (dx / len) * r1}
              y2={CY + (dy / len) * r1}
              stroke="#22c55e"
              strokeWidth={1.5}
            />
          );
        })()}

        {/* Bearing / pitch readout */}
        <text
          x={CX} y={SIZE - 5}
          fill="rgba(148,163,184,0.65)"
          fontSize={8.5}
          textAnchor="middle"
          fontFamily="monospace"
        >
          {bearingNorm.toString().padStart(3, '0')}° · {pitchNorm}°P
        </text>
      </svg>
    </div>
  );
}

// ---- Scale bar + coordinate readout ---------------------------------

interface ScaleBarProps {
  zoom: number;
  latitude: number;
  longitude: number;
}

/** Ground resolution in metres per CSS pixel at the given zoom and latitude. */
function metersPerPixel(zoom: number, latDeg: number): number {
  return (156543.03392 * Math.cos((latDeg * Math.PI) / 180)) / Math.pow(2, zoom);
}

/** Candidate scale distances in nautical miles. */
const SCALE_STEPS_NM = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
const NM_TO_M = 1852;
const MAX_BAR_PX = 140;

export function ScaleBar({ zoom, latitude, longitude }: ScaleBarProps) {
  const mpp = metersPerPixel(zoom, latitude);

  // Find the largest nice NM value whose pixel width fits within MAX_BAR_PX
  let chosenNm = SCALE_STEPS_NM[0];
  for (const nm of SCALE_STEPS_NM) {
    if ((nm * NM_TO_M) / mpp <= MAX_BAR_PX) chosenNm = nm;
  }

  const barPx = Math.round((chosenNm * NM_TO_M) / mpp);
  const kmLabel = chosenNm * NM_TO_M >= 1000
    ? `${(chosenNm * NM_TO_M / 1000).toFixed(chosenNm * NM_TO_M < 10000 ? 1 : 0)} km`
    : `${Math.round(chosenNm * NM_TO_M)} m`;
  const nmLabel = chosenNm >= 1
    ? `${chosenNm} nm`
    : `${Math.round(chosenNm * 10) / 10} nm`;

  // Coordinate strings
  const latAbs = Math.abs(latitude);
  const latDeg = Math.floor(latAbs);
  const latMin = ((latAbs - latDeg) * 60).toFixed(3);
  const latHem = latitude >= 0 ? 'N' : 'S';

  const lonAbs = Math.abs(longitude);
  const lonDeg = Math.floor(lonAbs);
  const lonMin = ((lonAbs - lonDeg) * 60).toFixed(3);
  const lonHem = longitude >= 0 ? 'E' : 'W';

  const coordStr = `${latDeg}° ${latMin}′ ${latHem}   ${lonDeg}° ${lonMin}′ ${lonHem}`;

  // SVG scale bar dimensions
  const SVG_W = barPx + 40;
  const SVG_H = 18;
  const Y = 10;
  const X0 = 20;
  const X1 = X0 + barPx;
  const TICK = 5;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 26,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Scale bar SVG */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 9, color: 'rgba(148,163,184,0.6)',
          fontFamily: 'monospace', whiteSpace: 'nowrap',
        }}>
          {kmLabel}
        </span>
        <svg width={SVG_W} height={SVG_H} style={{ display: 'block' }}>
          {/* Outer ticks */}
          <line x1={X0} y1={Y - TICK} x2={X0} y2={Y} stroke="rgba(148,163,184,0.7)" strokeWidth={1.5} />
          <line x1={X1} y1={Y - TICK} x2={X1} y2={Y} stroke="rgba(148,163,184,0.7)" strokeWidth={1.5} />
          {/* Horizontal bar */}
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="rgba(148,163,184,0.7)" strokeWidth={1.5} />
          {/* Half-way tick */}
          <line
            x1={(X0 + X1) / 2} y1={Y - TICK / 2}
            x2={(X0 + X1) / 2} y2={Y}
            stroke="rgba(148,163,184,0.5)" strokeWidth={1}
          />
        </svg>
        <span style={{
          fontSize: 9, color: 'rgba(148,163,184,0.6)',
          fontFamily: 'monospace', whiteSpace: 'nowrap',
        }}>
          {nmLabel}
        </span>
      </div>

      {/* Coordinate readout */}
      <div style={{
        fontSize: 9.5,
        color: 'rgba(148,163,184,0.55)',
        fontFamily: 'monospace',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}>
        {coordStr}
      </div>
    </div>
  );
}
