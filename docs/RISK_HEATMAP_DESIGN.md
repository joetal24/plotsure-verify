# Risk Heatmap Zone — Design Document

## Understanding Summary

- **What**: Enhance the existing district polygon on PlotSure's result map — increase fill opacity to 0.3 with the risk color, make it interactive (click to show risk breakdown), and add a color legend
- **Why**: Make fraud risk visible at a geographic level so users intuitively grasp risk zones
- **Who**: Desktop land buyers/sellers verifying titles (<10 concurrent users)
- **Key constraints**: Uses existing `geocodeLocation` → `polygon_geojson` API and `SearchResult` risk data; no new backend work; mobile not required
- **Non-goals**: No grid heatmap, no landmark pins, no mobile responsiveness, no custom marker redesign

## Assumptions

- `polygon_geojson` from the geocode endpoint accurately represents the relevant district boundary
- Leaflet's GeoJSON click events work reliably for polygon interaction
- The existing risk color palette (LOW=green, MEDIUM=amber, HIGH=red) is sufficient
- The `fraudScore` field may be `undefined` for older results — popup displays "N/A" as fallback

## Decision Log

| Decision | Choice | Alternatives Considered |
|---|---|---|
| Heatmap approach | B: District-level area fill | Past result markers, gradient radius, hex grid |
| Visual richness | Interactive zone with popup | Simple opacity bump, layered hatch pattern |
| Fill opacity | Semi-transparent (0.3) | Bold fill (0.5+), gradient fill |
| Scope | Lean (Approach A) | Full treatment (hatch patterns, animated borders) |
| Scale | <10 concurrent | No optimization needed |
| Form factor | Desktop-only | No mobile considerations |

## Final Design

**File modified**: `src/components/PlotMap.tsx`

**Changes** (~30 lines):

### 1. GeoJSON Risk Zone Fill
- `fillOpacity`: 0.15 → **0.3**
- `weight`: 2 → **2.5**
- Polygon stays visible always; toggle checkbox changes to control only the optional Circle radius

### 2. Interactive Polygon Popup
- Add `onEachFeature` callback on the `<GeoJSON>` component
- Clicking the filled zone opens a Leaflet popup at click position with:
  - Plot reference
  - Risk level + fraud score
  - Title status (CLEAN/ENCUMBERED)
  - Anomaly flag count
- Uses same typography/color tokens as the existing marker popup

### 3. Color Legend Overlay
- Positioned bottom-right of the map
- Same visual style as the existing top-left toggle: `bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow`  
- Three horizontal items: `● LOW` `● MEDIUM` `● HIGH` with respective risk colors

### 4. Toggle Cleanup
- Existing "Show Point Only" / "Show Approximate Area" toggle simplified to control only the Circle radius
- Polygon risk zone is always visible (no toggle to hide it)

## Data Flow

```
SearchResult (riskLevel, fraudScore, etc.)
    ↓
PlotMap receives props
    ↓
geocodeLocation(district, county) → GeocodeResponse (lat, lng, polygon_geojson)
    ↓
GeoJSON renders polygon with risk color at fillOpacity 0.3
    ↓
onEachFeature click → popup with formatted risk data
```

## Implementation Order

1. Update polygon style (opacity, weight)
2. Add `onEachFeature` click → popup
3. Add legend overlay
4. Clean up toggle behavior
