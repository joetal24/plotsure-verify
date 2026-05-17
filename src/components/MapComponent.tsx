import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  onDistrictSelect?: (district: string) => void;
  selectedDistrict?: string;
}

const KAMPALA_CENTER: [number, number] = [0.3476, 32.5825];

const DISTRICT_COLORS: Record<string, string> = {
  "Kampala": "#dc2626",
  "Wakiso": "#ea580c",
  "Mukono": "#ca8a04",
  "Jinja": "#16a34a",
  "Entebbe": "#0891b2",
  "Mbarara": "#7c3aed",
  "Gulu": "#4f46e5",
  "Lira": "#db2777",
  "default": "#64748b",
};

export function MapComponent({
  center = KAMPALA_CENTER,
  zoom = 12,
  onDistrictSelect,
  selectedDistrict,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const popup = L.popup();

    map.on("click", (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      let district = "Kampala";
      
      if (lat >= -0.1 && lat <= 0.9 && lng >= 31.8 && lng <= 33.5) {
        if (lng <= 32.6 && lat >= 0.2 && lat <= 0.5) {
          district = "Kampala";
        } else {
          district = "Kampala";
        }
      }

      popup.setLatLng(e.latlng).setContent(`District: ${district}`).openOn(map);

      if (onDistrictSelect) {
        onDistrictSelect(district);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (selectedDistrict && mapInstanceRef.current) {
      mapInstanceRef.current.setView(KAMPALA_CENTER, 12, { animate: true });
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-gray-200">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 z-[1000] bg-white px-3 py-2 rounded shadow-md text-sm">
        <p className="font-medium text-gray-700">Kampala District</p>
        {selectedDistrict && (
          <p className="text-green-600 font-semibold">Selected: {selectedDistrict}</p>
        )}
      </div>
    </div>
  );
}

export { KAMPALA_CENTER };