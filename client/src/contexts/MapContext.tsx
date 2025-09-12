import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface MapFile {
  id: number;
  map_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  version: string;
  is_primary: boolean;
  uploaded_at: string;
}

interface MapMetadata {
  [key: string]: string;
}

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
  files?: MapFile[];
  metadata?: MapMetadata;
}

interface MapContextType {
  maps: Map[];
  loading: boolean;
  error: string | null;
  fetchMaps: () => Promise<void>;
  fetchMap: (id: number) => Promise<Map | null>;
  createMap: (mapData: CreateMapData) => Promise<Map>;
  updateMap: (id: number, mapData: Partial<Map>) => Promise<Map>;
  deleteMap: (id: number) => Promise<void>;
  uploadMapFiles: (mapId: number, files: File[], version?: string) => Promise<MapFile[]>;
  uploadPreviewImage: (mapId: number, file: File) => Promise<any>;
}

interface CreateMapData {
  name: string;
  description?: string;
  scale?: string;
  contourInterval?: number;
  areaBounds?: any;
  centerLat: number;
  centerLng: number;
  zoomLevel?: number;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMap = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/maps`);
      setMaps(response.data.maps);
    } catch (error: any) {
      console.error('Error fetching maps:', error);
      
      // Handle different types of errors
      if (error.response?.status === 429 || error.response?.status === 503) {
        setError('API er midlertidig utilgjengelig på grunn av for mange forespørsler. Vennligst vent et minutt og prøv igjen.');
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        setError('Nettverksfeil. Sjekk internettforbindelsen og prøv igjen.');
      } else if (error.response?.status >= 500) {
        setError('Serverfeil. Vennligst prøv igjen senere.');
      } else {
        setError(error.response?.data?.message || 'Kunne ikke hente kart');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMap = async (id: number): Promise<Map | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/maps/${id}`);
      return response.data.map;
    } catch (error: any) {
      console.error('Error fetching map:', error);
      
      // Handle rate limiting for individual map fetch
      if (error.response?.status === 429 || error.response?.status === 503) {
        console.log('⏳ Rate limited while fetching map, will retry automatically');
        // Don't set error state for individual map fetch, let retry logic handle it
      }
      
      return null;
    }
  };

  const createMap = async (mapData: CreateMapData): Promise<Map> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/maps`, mapData);
      const newMap = response.data.map;
      setMaps(prev => [newMap, ...prev]);
      return newMap;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kunne ikke opprette kart');
    }
  };

  const updateMap = async (id: number, mapData: Partial<Map>): Promise<Map> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/maps/${id}`, mapData);
      const updatedMap = response.data.map;
      setMaps(prev => prev.map(map => map.id === id ? updatedMap : map));
      return updatedMap;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kunne ikke oppdatere kart');
    }
  };

  const deleteMap = async (id: number): Promise<void> => {
    try {
      await axios.delete(`${API_BASE_URL}/api/maps/${id}`);
      setMaps(prev => prev.filter(map => map.id !== id));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kunne ikke slette kart');
    }
  };

  const uploadMapFiles = async (mapId: number, files: File[], version?: string): Promise<MapFile[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (version) {
      formData.append('version', version);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/maps/${mapId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.files;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kunne ikke laste opp filer');
    }
  };

  const uploadPreviewImage = async (mapId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('previewImage', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/maps/${mapId}/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.preview;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kunne ikke laste opp forhåndsvisningsbilde');
    }
  };

  // Fetch maps on mount
  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const value: MapContextType = {
    maps,
    loading,
    error,
    fetchMaps,
    fetchMap,
    createMap,
    updateMap,
    deleteMap,
    uploadMapFiles,
    uploadPreviewImage
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};
