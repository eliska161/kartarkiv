import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Download, Eye, Calendar, RulerDimensionLine, Spline } from 'lucide-react';
import ShareButton from './ShareButton';

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

interface MapListProps {
  maps: Map[];
  selectedMap: number | null;
  onSelectMap: (mapId: number) => void;
  viewMode: 'map' | 'list';
}

const MapList: React.FC<MapListProps> = ({ maps, selectedMap, onSelectMap, viewMode }) => {
  const navigate = useNavigate();
  if (maps.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Ingen kart funnet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {maps.map(map => (
        <div
          key={map.id}
          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
            selectedMap === map.id
              ? 'border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-200'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
          }`}
          onClick={() => onSelectMap(map.id)}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {map.name}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full ${
              selectedMap === map.id
                ? 'bg-brand-100 text-brand-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {map.file_count} filer
            </span>
          </div>
          
          {map.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {map.description}
            </p>
          )}
          
          <div className="space-y-1 text-xs text-gray-500">
            {map.scale && (
              <div className="flex items-center">
                <RulerDimensionLine className="h-3 w-3 mr-1" />
                {map.scale}
              </div>
            )}
            {map.contour_interval && (
              <div className="flex items-center">
                <Spline className="h-3 w-3 mr-1" />
                {map.contour_interval}m ekvidistanse
              </div>
            )}
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(map.created_at).toLocaleDateString('no-NO')}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              av {map.created_by_username}
            </span>
            <div className="flex space-x-1">
              <ShareButton 
                mapId={map.id} 
                mapName={map.name}
                className="p-2 text-gray-400 hover:text-brand-600 transition-colors"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/map/${map.id}`);
                }}
                className="p-2 text-gray-400 hover:text-brand-600 transition-colors"
                title="Se detaljer"
              >
                <Eye className="h-5 w-5" />
              </button>
              {map.file_count > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/map/${map.id}`);
                  }}
                  className="p-2 text-gray-400 hover:text-brand-600 transition-colors"
                  title="Last ned"
                >
                  <Download className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MapList;
