import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Circle } from "react-leaflet";
import L, { type LatLngExpression, type GeoJsonObject } from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeLocation, type GeocodeResponse } from "@/lib/api";

interface PlotMapProps {
  district?: string;
  county?: string;
  plotNumber: string;
  landType: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  plotSize?: number;
  plotSizeUnit?: "Acres" | "Square Metres";
  plotRef?: string;
  fraudScore?: number;
  titleStatus?: string;
  anomalyFlags?: string[];
  latitude?: number;
  longitude?: number;
}

const KAMPALA_CENTER: LatLngExpression = [0.3476, 32.5825];
const UGANDA_CENTER: LatLngExpression = [1.3733, 32.2903];

const riskColors: Record<PlotMapProps["riskLevel"], string> = {
  LOW: "#16a34a",
  MEDIUM: "#eab308",
  HIGH: "#dc2626",
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function PlotMap({
  district,
  county,
  plotNumber,
  landType,
  riskLevel,
  plotSize,
  plotSizeUnit,
  fraudScore,
  titleStatus,
  anomalyFlags,
  latitude,
  longitude,
}: PlotMapProps) {
  const [geo, setGeo] = useState<GeocodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBoundary, setShowBoundary] = useState(false);

  // Calculate radius in meters from plot size
  const calculateRadiusMeters = (size: number | undefined, unit: PlotMapProps["plotSizeUnit"] | undefined) => {
    if (!size || !unit) return 0;
    
    let sizeInSqMeters = 0;
    switch (unit) {
      case "Acres":
        sizeInSqMeters = size * 4046.86; // 1 acre = 4046.86 m²
        break;
      case "Square Metres":
        sizeInSqMeters = size;
        break;
    }
    
    // Radius = sqrt(area/π)
    return Math.sqrt(sizeInSqMeters / Math.PI);
  };

  useEffect(() => {
    let active = true;
    if (!district && !county) return;

    setLoading(true);
    geocodeLocation(district || "", county)
      .then((res) => {
        if (!active) return;
        setGeo(res);
      })
      .catch(() => {
        if (!active) return;
        setGeo(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [district, county]);

  const hasExactCoords = typeof latitude === "number" && typeof longitude === "number" && !(latitude === 0 && longitude === 0);

  const center: LatLngExpression = useMemo(() => {
    if (hasExactCoords) return [latitude!, longitude!];
    if (geo) return [geo.lat, geo.lng];
    return UGANDA_CENTER;
  }, [hasExactCoords, latitude, longitude, geo]);

  const zoom = hasExactCoords ? 14 : geo ? 10 : 7;

  const polygon = useMemo(() => {
    if (!geo?.polygon_geojson) return null;
    return geo.polygon_geojson as GeoJsonObject;
  }, [geo]);

  return (
    <div className="relative h-[360px] w-full rounded-xl overflow-hidden border bg-muted/10">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polygon && (
          <GeoJSON
            key={riskLevel}
            data={polygon}
            style={{
              color: riskColors[riskLevel],
              weight: 2.5,
              fillColor: riskColors[riskLevel],
              fillOpacity: 0.3,
            }}
            onEachFeature={(feature, layer) => {
              layer.on({
                click: (e) => {
                  const popup = L.popup()
                    .setLatLng(e.latlng)
                    .setContent(`
                      <div style="font-family: system-ui, sans-serif; line-height: 1.5; min-width: 180px;">
                        <div style="font-size: 11px; color: #64748b;">Plot ${plotNumber}</div>
                        <div style="font-weight: 600; font-size: 14px; margin: 2px 0;">${district || county || "Uganda"}</div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${riskColors[riskLevel]};"></span>
                          <span style="font-size: 13px; font-weight: 500;">Risk: ${riskLevel}</span>
                          ${fraudScore !== undefined ? `<span style="font-size: 12px; color: #64748b;">(${fraudScore}/100)</span>` : ""}
                        </div>
                        ${titleStatus ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">Title: ${titleStatus}</div>` : ""}
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${landType}</div>
                        ${anomalyFlags && anomalyFlags.length > 0 ? `<div style="font-size: 12px; color: #dc2626; margin-top: 4px;">⚠ ${anomalyFlags.length} anomaly flag${anomalyFlags.length > 1 ? "s" : ""}</div>` : ""}
                      </div>
                    `)
                    .openOn(e.target._map);
                },
              });
            }}
          />
        )}
        {(showBoundary && (hasExactCoords || geo)) && plotSize && plotSizeUnit && (
          <Circle
            center={hasExactCoords ? [latitude!, longitude!] : [geo!.lat, geo!.lng]}
            radius={calculateRadiusMeters(plotSize, plotSizeUnit)}
            pathOptions={{
              color: riskColors[riskLevel],
              weight: 2,
              fillColor: riskColors[riskLevel],
              fillOpacity: 0.2,
            }}
          />
        )}
        {(hasExactCoords || geo) && (
          <Marker position={hasExactCoords ? [latitude!, longitude!] : [geo!.lat, geo!.lng]} icon={markerIcon}>
            <Popup>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Plot {plotNumber}</div>
                <div className="font-medium">{district || county || "Uganda"}</div>
                <div className="text-xs">{landType}</div>
                <div className="text-xs" style={{ color: riskColors[riskLevel] }}>
                  Risk: {riskLevel}
                </div>
                {showBoundary && plotSize && plotSizeUnit && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Approx. radius: {calculateRadiusMeters(plotSize, plotSizeUnit).toFixed(0)}m
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
          Loading map...
        </div>
      )}
      {!loading && (hasExactCoords || geo) && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 text-sm font-medium shadow">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showBoundary}
              onChange={(e) => setShowBoundary(e.target.checked)}
              className="h-4 w-4 text-primary"
            />
            <span>Show Area Circle</span>
          </label>
        </div>
      )}
      {!loading && !hasExactCoords && !geo && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground z-[999]">
          Location coordinates not available for this plot
        </div>
      )}
      {!loading && (hasExactCoords || geo) && (
        <div className="absolute bottom-3 right-3 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 text-sm shadow">
          {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
            <div key={level} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: riskColors[level] }}
              />
              <span className="text-xs font-medium text-gray-700">{level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
