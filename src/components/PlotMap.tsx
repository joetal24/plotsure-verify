import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import L, { type LatLngExpression, type GeoJsonObject } from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeLocation, type GeocodeResponse } from "@/lib/api";

interface PlotMapProps {
  district?: string;
  county?: string;
  plotNumber: string;
  landType: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

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
}: PlotMapProps) {
  const [geo, setGeo] = useState<GeocodeResponse | null>(null);
  const [loading, setLoading] = useState(false);

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

  const center: LatLngExpression = useMemo(() => {
    if (geo) return [geo.lat, geo.lng];
    return UGANDA_CENTER;
  }, [geo]);

  const polygon = useMemo(() => {
    if (!geo?.polygon_geojson) return null;
    return geo.polygon_geojson as GeoJsonObject;
  }, [geo]);

  return (
    <div className="relative h-[360px] w-full rounded-xl overflow-hidden border bg-muted/10">
      <MapContainer
        center={center}
        zoom={geo ? 10 : 7}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polygon && (
          <GeoJSON
            data={polygon}
            style={{
              color: riskColors[riskLevel],
              weight: 2,
              fillColor: riskColors[riskLevel],
              fillOpacity: 0.15,
            }}
          />
        )}
        {geo && (
          <Marker position={[geo.lat, geo.lng]} icon={markerIcon}>
            <Popup>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Plot {plotNumber}</div>
                <div className="font-medium">{district || county || "Uganda"}</div>
                <div className="text-xs">{landType}</div>
                <div className="text-xs" style={{ color: riskColors[riskLevel] }}>
                  Risk: {riskLevel}
                </div>
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
    </div>
  );
}
