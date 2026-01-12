'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, LayersControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const { BaseLayer, Overlay } = LayersControl;

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

interface Incident {
  id: string;
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  images?: string[];
  verified: boolean;
  reportedBy: 'crowdsource' | 'official';
  timestamp: number;
  upvotes: number;
  createdAt: number;
  relatedArticles?: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

interface IncidentMapProps {
  incidents: Incident[];
  selectedType?: string;
  onIncidentClick?: (incident: Incident) => void;
  dateRange?: { start: Date; end: Date };
  showHeatmap?: boolean;
}

// Color-coded custom icons for different incident types
function getIncidentIcon(type: string, verified: boolean) {
  const colors: Record<string, string> = {
    protest: '#ef4444',      // red-500
    arrest: '#f59e0b',       // amber-500
    injury: '#f97316',       // orange-500
    death: '#dc2626',        // red-600
    other: '#6366f1',        // indigo-500
  };

  const color = colors[type] || '#6366f1';
  const opacity = verified ? 1.0 : 0.6;

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z"
            fill="${color}" opacity="${opacity}" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-incident-icon',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

// Iran map boundaries (from Iran protest map reference)
const IRAN_CENTER: [number, number] = [32.4279, 53.6880];
const IRAN_BOUNDS: [[number, number], [number, number]] = [[24.5, 43.5], [40.0, 64.0]];

// Component to reset map view to Iran
function MapController() {
  const map = useMap();

  useEffect(() => {
    // Set max bounds to prevent panning outside Iran
    map.setMaxBounds(IRAN_BOUNDS);
    map.setMinZoom(5);
  }, [map]);

  return null;
}

// Heatmap layer component
function HeatmapLayer({ incidents, show }: { incidents: Incident[]; show: boolean }) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!show) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Create heatmap points with intensity based on incident type
    const heatPoints = incidents.map((incident) => {
      const intensity =
        incident.type === 'death' ? 1.0
        : incident.type === 'injury' ? 0.7
        : incident.type === 'arrest' ? 0.5
        : 0.3; // protest, other

      return [incident.location.lat, incident.location.lon, intensity] as [number, number, number];
    });

    // Remove old layer if exists
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create new heatmap layer
    heatLayerRef.current = (L as any).heatLayer(heatPoints, {
      radius: 25,
      blur: 35,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#0000ff',
        0.3: '#00ff00',
        0.5: '#ffff00',
        0.7: '#ff8800',
        1.0: '#ff0000',
      },
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [incidents, show, map]);

  return null;
}

export default function IncidentMap({ incidents, selectedType, onIncidentClick, dateRange, showHeatmap = false }: IncidentMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const mapInitialized = useRef(false);

  useEffect(() => {
    if (!mapInitialized.current) {
      mapInitialized.current = true;
      setIsMounted(true);
    }
  }, []);

  // Filter incidents by type and date range
  let filteredIncidents = incidents;

  // Filter by type
  if (selectedType) {
    filteredIncidents = filteredIncidents.filter(inc => inc.type === selectedType);
  }

  // Filter by date range
  if (dateRange) {
    filteredIncidents = filteredIncidents.filter(inc => {
      const incidentDate = new Date(inc.timestamp);
      return incidentDate >= dateRange.start && incidentDate <= dateRange.end;
    });
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / 60000);
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleString();
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      protest: 'Protest',
      arrest: 'Arrest',
      injury: 'Injury',
      death: 'Casualty',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={IRAN_CENTER}
      zoom={5}
      minZoom={5}
      maxZoom={18}
      className="w-full h-full"
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      maxBounds={IRAN_BOUNDS}
    >
      <LayersControl position="topright">
        {/* Modern Style - CartoDB Voyager (Default) */}
        <BaseLayer checked name="Modern (Default)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        </BaseLayer>

        {/* Topographic Map - OpenTopoMap */}
        <BaseLayer name="Topographic">
          <TileLayer
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            maxZoom={17}
          />
        </BaseLayer>

        {/* Satellite Imagery - Esri World Imagery */}
        <BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </BaseLayer>

        {/* Dark Mode - CartoDB Dark Matter */}
        <BaseLayer name="Dark Mode">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        </BaseLayer>
      </LayersControl>

      <MapController />
      <HeatmapLayer incidents={filteredIncidents} show={showHeatmap} />

      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
      >
        {filteredIncidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.location.lat, incident.location.lon]}
            icon={getIncidentIcon(incident.type, incident.verified)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                onIncidentClick?.(incident);
              },
            }}
          >
            {/* Tooltip for hover - sticky so it doesn't disappear immediately */}
            <Tooltip
              direction="top"
              opacity={0.95}
              offset={[0, -32]}
              permanent={false}
              sticky={true}
            >
              <div className="text-center px-2 py-1">
                <div className="font-semibold text-sm mb-1">{incident.title}</div>
                <div className="text-xs text-gray-600 font-medium">👆 Click marker for details</div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
