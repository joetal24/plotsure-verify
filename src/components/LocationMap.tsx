import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const UGANDA_CENTER: L.LatLngExpression = [1.3733, 32.2903];
const UGANDA_BOUNDS: L.LatLngBoundsExpression = [
  [-1.4784, 29.5734],
  [4.2340, 35.0007],
];

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  latitude: string;
  longitude: string;
  onLatLngChange: (lat: string, lng: string) => void;
}

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prev = useRef({ lat, lng });

  useEffect(() => {
    map.setMaxBounds(UGANDA_BOUNDS);
    map.options.minZoom = 7;

    if (lat !== prev.current.lat || lng !== prev.current.lng) {
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 14);
      }
      prev.current = { lat, lng };
    }
  }, [map, lat, lng]);

  return null;
}

function MapClickHandler({
  onLatLngChange,
  hasPin,
}: {
  onLatLngChange: (lat: string, lng: string) => void;
  hasPin: boolean;
}) {
  useMapEvents({
    click(e) {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      if (
        lat >= -1.4784 && lat <= 4.2340 &&
        lng >= 29.5734 && lng <= 35.0007
      ) {
        onLatLngChange(String(lat), String(lng));
      }
    },
  });
  return null;
}

export default function LocationMap({ latitude, longitude, onLatLngChange }: LocationMapProps) {
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  const hasValidPin = !isNaN(latNum) && !isNaN(lngNum);

  const center = useMemo(() => {
    if (hasValidPin) return [latNum, lngNum] as L.LatLngExpression;
    return UGANDA_CENTER;
  }, [hasValidPin, latNum, lngNum]);

  const zoom = hasValidPin ? 14 : 7;

  return (
    <div className="relative h-[300px] w-full rounded-xl overflow-hidden border bg-muted/10">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        maxBounds={UGANDA_BOUNDS}
        minZoom={7}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController lat={latNum} lng={lngNum} />
        <MapClickHandler onLatLngChange={onLatLngChange} hasPin={hasValidPin} />
        {hasValidPin && (
          <Marker
            position={[latNum, lngNum]}
            icon={markerIcon}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const pos = e.target.getLatLng();
                const lat = parseFloat(pos.lat.toFixed(6));
                const lng = parseFloat(pos.lng.toFixed(6));
                if (
                  lat >= -1.4784 && lat <= 4.2340 &&
                  lng >= 29.5734 && lng <= 35.0007
                ) {
                  onLatLngChange(String(lat), String(lng));
                } else {
                  e.target.setLatLng([latNum, lngNum]);
                }
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
