'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  initialPosition?: { lat: number; lon: number };
  onLocationSelect: (lat: number, lon: number, address?: string) => void;
}

// Component to handle map clicks
function LocationSelector({ onSelect }: { onSelect: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ initialPosition, onLocationSelect }: LocationPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(
    initialPosition || null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLocationSelect = async (lat: number, lon: number) => {
    setPosition({ lat, lon });

    // Reverse geocode to get address
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      onLocationSelect(lat, lon, address);
    } catch (error) {
      console.error('Geocoding error:', error);
      onLocationSelect(lat, lon, `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Default center on Iran (Tehran)
  const defaultCenter: [number, number] = initialPosition
    ? [initialPosition.lat, initialPosition.lon]
    : [35.6892, 51.3890];
  const defaultZoom = initialPosition ? 12 : 6;

  if (!isMounted) {
    return (
      <div className="w-full h-64 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-64 rounded-lg"
        style={{ height: '256px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <LocationSelector onSelect={handleLocationSelect} />

        {position && (
          <Marker position={[position.lat, position.lon]} />
        )}
      </MapContainer>

      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {isGeocoding ? (
          <span>🔍 Looking up address...</span>
        ) : position ? (
          <span>
            📍 Selected: {position.lat.toFixed(4)}, {position.lon.toFixed(4)}
          </span>
        ) : (
          <span>👆 Click on the map to select a location</span>
        )}
      </div>
    </div>
  );
}
