# London Airspace 3D Visualiser

Interactive 3D visualisation of London terminal airspace and flight restrictions, rendered as volumetric structures from official NATS AIP data. Explore TMA sectors, CTRs, UAS Flight Restriction Zones, helicopter routes, and live ADS-B traffic — all in one view.

## Running Locally

```bash
npm install
npm run dev
```

Then visit http://localhost:5173

```bash
npm run build   # production build
npm test        # run tests
```

## Features

- **Official NATS AIP data** — AIRAC 2026-08-06, 385 airspace volumes from `EG_AIS_DS_FULL_20260806_KML.zip`
- **3D volumetric rendering** — extruded volumes showing correct floor-to-ceiling altitude extent, floating sectors rendered at true altitude
- **London TMA** — all 20 sector slices with individual floor altitudes (2,500–5,500 ft ALT / FL65–FL75)
- **CTR / CTA / ATZ** — Heathrow, Gatwick, Stansted, Luton, City, Farnborough, Southend
- **UAS Flight Restriction Zones** — 134 EGR1U airport FRZs (SFC–2,000 ft AGL)
- **Central London restrictions** — Hyde Park, City of London, Isle of Dogs, Windsor Castle
- **Danger areas** — EGD ranges, GVS, HIRTA, parachute sites
- **Helicopter routes** — H2–H10 Thames corridor and network
- **Live ADS-B traffic** — via adsb.lol, 10s refresh, classified by type (helicopter/jet/prop)
- **Altitude slice filter** — INTERSECT and CUTAWAY modes
- **Vertical exaggeration** — 1×, 2×, 5×, 10×, 16.7×

## Data

Airspace geometry and metadata from official NATS AIP KML (AIRAC 2026-08-06):

```
EG_AIS_DS_FULL_20260806_KML.zip
  └── EG_AIP_DS_FULL_20260806.kmz
        └── eaip3d.kml
```

To regenerate from source:

```bash
# Extract KMZ from zip, then KML from KMZ (pre-done in .nats-cache/)
python3 scripts/ingest-nats-kml.py
```

Helicopter routes are curated from CAA AIP ENR 1.2 and AIC 13/2018 (`src/data/helicopter-routes.ts`).

**Not for operational use.**

## Stack

- React 18 + TypeScript
- deck.gl (GeoJsonLayer, ScatterplotLayer, PathLayer)
- MapLibre GL JS + react-map-gl
- Vite

## License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)
