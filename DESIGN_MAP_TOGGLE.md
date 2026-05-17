# Map Toggle Feature Design

## Understanding Summary

- **What**: A map visualization toggle allowing users to switch between point location and approximate area visualization
- **Why**: To provide visual distinction between approximate location (point) and parcel size context
- **Who**: PlotSure users verifying land parcels in Uganda
- **Constraints**: 
  - No parcel boundary data available from UgNLIS or other sources
  - Must work with existing verification data (point location + user-provided plot size)
  - Comply with ANTIGRAVITY.md (no ML models in MVP)
- **Non-goals**: 
  - Implementing complex GIS analysis
  - Generating boundary data from scratch
  - ML-based boundary detection

## Assumptions

1. Users provide plot size during verification that can be used for visualization
2. Approximate radius based on plot size gives meaningful spatial context
3. Users understand the radius represents an approximation, not exact boundaries
4. Administrative boundaries from Nominatim can serve as secondary context when available
5. UI toggle should be intuitive and not overwhelm the map interface

## Decision Log

| Decision | Alternatives Considered | Why Chosen |
|----------|------------------------|------------|
| Show radius circle based on parcel size for boundary view | 1. Administrative boundary proxy<br>2. Data availability indicator<br>3. Point-only view | Directly uses user inputs, provides tangible scale, technically straightforward, maintains workflow consistency |
| Use checkbox toggle in map corner | 1. Button toggle below map<br>2. Separate view selector component<br>3. Automatic switching based on zoom | Space-efficient, familiar UI pattern, keeps focus on map, follows existing UI conventions |
| Remove "Decimals" from plot size units | Keep all three unit options | Simplifies radius calculation (Decimals conversion less common), Acres and Square Metres are more universally understood |
| Calculate radius using area/π formula | 1. Fixed radius values<br>2. User-adjustable radius<br>3. Show diameter instead | Mathematically accurate representation of area, consistent with circular approximation of irregular parcels |

## Final Design

### Component Modifications

#### PlotMap.tsx
1. **Extended Props**: Added `plotSize?: number` and `plotSizeUnit?: "Acres" | "Square Metres"`
2. **Added State**: `showBoundary` boolean to track toggle state
3. **Helper Function**: `calculateRadiusMeters()` converts plot size to radius in meters
4. **Enhanced Rendering**:
   - Always shows administrative boundary polygon when available from geocoding
   - Conditionally renders radius circle when `showBoundary` is true and size data exists
   - Always shows location marker with popup
   - Popup shows approximate radius when in boundary view
   - Added toggle control (checkbox) in map corner

#### LandSearch.tsx
1. **Updated Form Initialization**: Changed default `plotSizeUnit` from "Decimals" to "Square Metres"
2. **Updated Unit Selector**: Removed "Decimals" option, kept "Acres" and "Square Metres"
3. **Enhanced PlotMap Usage**: Pass `plotSize` and `plotSizeUnit` from search results

### Data Flow

1. User enters plot size and unit in LandSearch form
2. Form data stored in SearchContext and sent to verification API
3. Verification result includes plot size data in SearchResult
4. LandSearch passes plot size data to PlotMap component
5. PlotMap calculates radius and renders based on toggle state
6. User toggles between point-only view and point-with-radius view

### User Experience

- **Point View**: Shows only the location marker
- **Boundary View**: Shows marker + semi-transparent circle representing approximate parcel area
- **Toggle**: Checkbox labeled "Show Point Only" / "Show Approximate Area"
- **Popup Info**: Shows approximate radius in meters when in boundary view
- **Administrative Context**: When available, shows district/county boundary from geocoding

### Implementation Notes

- Radius calculation: `sqrt(area_in_m² / π)`
- Unit conversions:
  - Acres: × 4046.86 to get m²
  - Square Metres: direct use
- Visual styling uses risk-level colors for consistency
- Toggle uses familiar checkbox interaction to minimize cognitive load
- Loading states and error handling preserved from original implementation

This design provides immediate value using existing data while laying groundwork for future enhancement when actual boundary data becomes available.