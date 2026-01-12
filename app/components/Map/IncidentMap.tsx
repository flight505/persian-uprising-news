'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
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

// Component to update map view when incidents change
function MapUpdater({ incidents }: { incidents: Incident[] }) {
  const map = useMap();

  useEffect(() => {
    if (incidents.length > 0) {
      const bounds = L.latLngBounds(
        incidents.map(inc => [inc.location.lat, inc.location.lon])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [incidents, map]);

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

  // Default center on Iran (Tehran)
  const defaultCenter: [number, number] = [35.6892, 51.3890];
  const defaultZoom = 6;

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-full"
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
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

      <MapUpdater incidents={filteredIncidents} />
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
              click: () => onIncidentClick?.(incident),
            }}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                {/* Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      incident.type === 'protest'
                        ? 'bg-red-100 text-red-800'
                        : incident.type === 'arrest'
                        ? 'bg-amber-100 text-amber-800'
                        : incident.type === 'injury'
                        ? 'bg-orange-100 text-orange-800'
                        : incident.type === 'death'
                        ? 'bg-red-200 text-red-900'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {getTypeLabel(incident.type)}
                  </span>
                  {incident.verified && (
                    <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm mb-1">{incident.title}</h3>

                {/* Description */}
                <p className="text-xs text-gray-600 mb-2">{incident.description}</p>

                {/* Location */}
                {incident.location.address && (
                  <p className="text-xs text-gray-500 mb-1">
                    📍 {incident.location.address}
                  </p>
                )}

                {/* Images */}
                {incident.images && incident.images.length > 0 && (
                  <div className="my-2 grid grid-cols-2 gap-1">
                    {incident.images.map((imageUrl, idx) => (
                      <img
                        key={idx}
                        src={imageUrl}
                        alt={`Incident ${idx + 1}`}
                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition"
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-gray-400">{formatTimestamp(incident.timestamp)}</p>

                {/* Upvotes */}
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs text-gray-500">👍 {incident.upvotes}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {incident.reportedBy === 'official' ? '🔵 Official' : '👤 Crowdsourced'}
                  </span>
                </div>

                {/* Related Articles */}
                {incident.relatedArticles && incident.relatedArticles.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">📰 Sources:</p>
                    <div className="space-y-1">
                      {incident.relatedArticles.map((article, idx) => (
                        <a
                          key={idx}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <span className="text-gray-500">[{article.source}]</span> {article.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
