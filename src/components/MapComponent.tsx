import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  onDistrictSelect?: (district: string) => void;
  selectedDistrict?: string;
}

const UGANDA_CENTERS: Record<string, [number, number]> = {
  "Kampala": [0.3476, 32.5825],
  "Wakiso": [0.4005, 32.5920],
  "Mukono": [0.3534, 32.7502],
  "Jinja": [0.4257, 33.2044],
  "Entebbe": [0.0422, 32.4468],
  "Mbarara": [-0.6167, 30.6546],
  "Gulu": [2.7746, 32.2991],
  "Lira": [1.9274, 32.9728],
  "Kasese": [0.2389, 30.0521],
  "Mbale": [1.0820, 34.1819],
  "Tororo": [0.6936, 34.0777],
  "Masindi": [1.6765, 31.7159],
  "Luweero": [0.8497, 32.4105],
  "Nakasongola": [1.3102, 31.7442],
  "Nakaseke": [0.8373, 32.2510],
  "Kayunga": [0.4219, 32.2237],
  "Wakiso Surrounds": [0.4500, 32.6500],
};

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
  center = [1.5, 32.5],
  zoom = 7,
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

      let district = "Unknown";
      
      if (lat >= 0.2 && lat <= 0.5 && lng >= 32.2 && lng <= 32.9) {
        if (lng <= 32.55) district = "Kampala";
        else district = "Wakiso";
      } else if (lat >= 0.3 && lat <= 0.45 && lng >= 32.6 && lng <= 32.85) {
        district = "Mukono";
      } else if (lat >= 0.0 && lat <= 0.5 && lng >= 32.9 && lng <= 33.5) {
        district = "Jinja";
      } else if (lat >= -0.1 && lat <= 0.15 && lng >= 32.2 && lng <= 32.7) {
        district = "Entebbe";
      } else if (lat >= -0.9 && lat <= -0.3 && lng >= 30.3 && lng <= 31.1) {
        district = "Mbarara";
      } else if (lat >= 2.4 && lat <= 3.2 && lng >= 31.8 && lng <= 32.8) {
        district = "Gulu";
      } else if (lat >= 1.6 && lat <= 2.2 && lng >= 32.5 && lng <= 33.5) {
        district = "Lira";
      } else if (lat >= 0 && lat <= 0.6 && lng >= 29.5 && lng <= 30.5) {
        district = "Kasese";
      } else if (lat >= 0.8 && lat <= 1.4 && lng >= 33.8 && lng <= 34.5) {
        district = "Mbale";
      } else if (lat >= 0.4 && lat <= 1.0 && lng >= 33.7 && lng <= 34.4) {
        district = "Tororo";
      } else if (lat >= 1.3 && lat <= 2.0 && lng >= 31.3 && lng <= 32.0) {
        district = "Masindi";
      } else if (lat >= 0.5 && lat <= 1.2 && lng >= 32.0 && lng <= 32.7) {
        district = "Luweero";
      } else if (lat >= 1.0 && lat <= 1.6 && lng >= 31.3 && lng <= 32.0) {
        district = "Nakasongola";
      } else if (lat >= 0.5 && lat <= 1.0 && lng >= 31.8 && lng <= 32.4) {
        district = "Nakaseke";
      } else if (lat >= 0.1 && lat <= 0.6 && lng >= 31.9 && lng <= 32.5) {
        district = "Kayunga";
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
    if (selectedDistrict && UGANDA_CENTERS[selectedDistrict] && mapInstanceRef.current) {
      const newCenter = UGANDA_CENTERS[selectedDistrict];
      mapInstanceRef.current.setView(newCenter, 10, { animate: true });
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-gray-200">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 z-[1000] bg-white px-3 py-2 rounded shadow-md text-sm">
        <p className="font-medium text-gray-700">Click on map to select district</p>
        {selectedDistrict && (
          <p className="text-green-600 font-semibold">Selected: {selectedDistrict}</p>
        )}
      </div>
    </div>
  );
}

export { UGANDA_CENTERS, DISTRICT_COLORS };