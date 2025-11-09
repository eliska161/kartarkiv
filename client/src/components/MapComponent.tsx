import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Download, Eye } from 'lucide-react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Map {
  id: number;
  name: string;
  description?: string;
  scale?: string;
  contour_interval?: number;
  area_bounds?: any;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  preview_image?: string;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  file_count: number;
}

interface MapComponentProps {
  maps: Map[];
  selectedMap: number | null;
  onSelectMap: (mapId: number) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ maps, selectedMap, onSelectMap }) => {
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState<[number, number]>([60.8832, 11.5519]); // New center coordinates
  const [mapZoom, setMapZoom] = useState(10);

  // Update map center when a map is selected
  useEffect(() => {
    if (selectedMap) {
      const selectedMapData = maps.find(map => map.id === selectedMap);
      if (selectedMapData) {
        // If area_bounds exists, calculate center and optimal zoom from polygon
        if (selectedMapData.area_bounds && selectedMapData.area_bounds.coordinates && selectedMapData.area_bounds.coordinates[0]) {
          const coords = selectedMapData.area_bounds.coordinates[0];
          let sumLat = 0;
          let sumLng = 0;
          let minLat = coords[0][0];
          let maxLat = coords[0][0];
          let minLng = coords[0][1];
          let maxLng = coords[0][1];
          
          coords.forEach((coord: [number, number]) => {
            sumLat += coord[0];
            sumLng += coord[1];
            minLat = Math.min(minLat, coord[0]);
            maxLat = Math.max(maxLat, coord[0]);
            minLng = Math.min(minLng, coord[1]);
            maxLng = Math.max(maxLng, coord[1]);
          });
          
          const centerLat = sumLat / coords.length;
          const centerLng = sumLng / coords.length;
          setMapCenter([centerLat, centerLng]);
          
          // Calculate optimal zoom level based on polygon bounds
          const latDiff = maxLat - minLat;
          const lngDiff = maxLng - minLng;
          const maxDiff = Math.max(latDiff, lngDiff);
          
          // Adjust zoom based on polygon size
          let optimalZoom = 15;
          if (maxDiff > 0.1) optimalZoom = 10;
          else if (maxDiff > 0.05) optimalZoom = 12;
          else if (maxDiff > 0.01) optimalZoom = 14;
          else if (maxDiff > 0.005) optimalZoom = 16;
          else optimalZoom = 18;
          
          setMapZoom(optimalZoom);
        } else {
          // Fallback to stored center
          setMapCenter([selectedMapData.center_lat, selectedMapData.center_lng]);
          setMapZoom(selectedMapData.zoom_level || 13);
        }
      }
    }
  }, [selectedMap, maps]);

  // Custom icon for map markers
  const mapIcon = L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="bg-brand-600 text-white rounded-full p-2 shadow-lg border-2 border-white">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  const selectedMapIcon = L.divIcon({
    className: 'custom-map-icon selected',
    html: `
      <div class="bg-red-600 text-white rounded-full p-2 shadow-lg border-2 border-white">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  return (
    <div className="h-full relative">
      <style>{`
        .leaflet-interactive {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .leaflet-interactive:hover {
          filter: brightness(1.1);
        }
        .animate-pulse {
          animation: pulse 1s ease-in-out;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} // Force re-render when center changes
        zoomControl={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          tileSize={256}
          zoomOffset={0}
        />
        
        {maps.map(map => {
          // Calculate polygon center if area_bounds exists
          let markerPosition: [number, number] = [map.center_lat, map.center_lng];
          
          if (map.area_bounds && map.area_bounds.coordinates && map.area_bounds.coordinates[0]) {
            const coords = map.area_bounds.coordinates[0];
            let sumLat = 0;
            let sumLng = 0;
            
            coords.forEach((coord: [number, number]) => {
              sumLat += coord[0];
              sumLng += coord[1];
            });
            
            const centerLat = sumLat / coords.length;
            const centerLng = sumLng / coords.length;
            markerPosition = [centerLat, centerLng] as [number, number];
          }
          
          return (
          <React.Fragment key={map.id}>
            {/* Map marker */}
            <Marker
              position={markerPosition}
              icon={selectedMap === map.id ? selectedMapIcon : mapIcon}
              eventHandlers={{
                click: () => onSelectMap(map.id)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-gray-900 mb-2">{map.name}</h3>
                  
                  {map.description && (
                    <p className="text-sm text-gray-600 mb-3">{map.description}</p>
                  )}
                  
                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    {map.scale && <div>Målestokk: {map.scale}</div>}
                    {map.contour_interval && <div>Ekvidistanse: {map.contour_interval}m</div>}
                    <div>Filer: {map.file_count}</div>
                    <div>Opprettet: {new Date(map.created_at).toLocaleDateString('no-NO')}</div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/kart/${map.id}`)}
                      className="flex items-center text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Se detaljer
                    </button>
                    {map.file_count > 0 && (
                      <button
                        onClick={() => navigate(`/kart/${map.id}`)}
                        className="flex items-center text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Last ned
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
            
            {/* Map area polygon */}
            {map.area_bounds && map.area_bounds.coordinates && map.area_bounds.coordinates[0] && (
              <Polygon
                positions={map.area_bounds.coordinates[0]}
                color={selectedMap === map.id ? "#16a34a" : "#dc2626"}
                weight={selectedMap === map.id ? 3 : 2}
                opacity={selectedMap === map.id ? 1.0 : 0.8}
                fillColor={selectedMap === map.id ? "#16a34a" : "#dc2626"}
                fillOpacity={selectedMap === map.id ? 0.3 : 0.2}
                dashArray={selectedMap === map.id ? "5, 5" : undefined}
                eventHandlers={{
                  click: () => {
                    onSelectMap(map.id);
                    // Add visual feedback
                    const polygon = document.querySelector(`[data-map-id="${map.id}"]`);
                    if (polygon) {
                      polygon.classList.add('animate-pulse');
                      setTimeout(() => {
                        polygon.classList.remove('animate-pulse');
                      }, 1000);
                    }
                  },
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: 3,
                      opacity: 1.0,
                      fillOpacity: 0.4
                    });
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      weight: selectedMap === map.id ? 3 : 2,
                      opacity: selectedMap === map.id ? 1.0 : 0.8,
                      fillOpacity: selectedMap === map.id ? 0.3 : 0.2
                    });
                  }
                }}
                data-map-id={map.id}
              />
            )}
          </React.Fragment>
          );
        })}
      </MapContainer>
      
      {/* Map info overlay */}
      <div className="absolute top-2 left-2 right-2 lg:top-4 lg:left-4 lg:right-auto bg-white rounded-lg shadow-lg p-3 lg:p-4 z-[1000] max-w-sm lg:max-w-sm">
        <div className="flex items-center mb-2">
          <MapPin className="h-4 w-4 text-brand-600 mr-2" />
          <h3 className="font-semibold text-gray-900">Instruksjoner</h3>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
            Tilgjengelige kart
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-brand-600 rounded-full mr-2"></div>
            Valgt kart
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 border-2 border-brand-600 rounded-full mr-2"></div>
            Kartområde
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Tips:</strong> Bruk musen til å zoome og panne. Klikk på kart for å velge.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
