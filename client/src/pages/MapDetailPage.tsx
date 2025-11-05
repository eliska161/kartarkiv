import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMap } from '../contexts/MapContext';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';
import { ArrowLeft, Download, MapPin, RulerDimensionLine, Spline, Calendar, User, Image, File, History, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, useMap as useLeafletMap } from 'react-leaflet';
import L from 'leaflet';
import VersionHistory from '../components/VersionHistory';
import PdfIcon from '../assets/icon-pdf.svg';
import OcadIcon from '../assets/icon-ocad.svg';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Component to handle map bounds fitting for polygon
const MapBoundsFitter: React.FC<{ coords: [number, number][] }> = ({ coords }) => {
  const map = useLeafletMap();

  useEffect(() => {
    if (coords && coords.length > 0) {
      // Calculate bounds directly from coordinates
      let minLat = coords[0][0];
      let maxLat = coords[0][0];
      let minLng = coords[0][1];
      let maxLng = coords[0][1];
      
      coords.forEach(([lat, lng]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
      
      // Create bounds with padding
      const padding = 0.001;
      const bounds = L.latLngBounds(
        [minLat - padding, minLng - padding],
        [maxLat + padding, maxLng + padding]
      );
      
      // Fit the map to the bounds
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [coords, map]);

  return null;
};

const computePolygonCentroid = (coords: [number, number][]): { lat: number; lng: number } | null => {
  if (!coords || coords.length === 0) {
    return null;
  }

  const cleanedCoords = coords
    .map(([lat, lng]) => [Number(lat), Number(lng)] as [number, number])
    .filter(([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng));

  if (cleanedCoords.length === 0) {
    return null;
  }

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < cleanedCoords.length; i++) {
    const [lat1, lng1] = cleanedCoords[i];
    const [lat2, lng2] = cleanedCoords[(i + 1) % cleanedCoords.length];
    const factor = lng1 * lat2 - lng2 * lat1;
    twiceArea += factor;
    cx += (lng1 + lng2) * factor;
    cy += (lat1 + lat2) * factor;
  }

  if (Math.abs(twiceArea) < 1e-12) {
    const avg = cleanedCoords.reduce(
      (acc, [lat, lng]) => {
        acc.lat += lat;
        acc.lng += lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: avg.lat / cleanedCoords.length,
      lng: avg.lng / cleanedCoords.length,
    };
  }

  const area = twiceArea / 2;

  return {
    lat: cy / (6 * area),
    lng: cx / (6 * area),
  };
};

const MapDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchMap } = useMap();
  const { showSuccess, showError } = useToast();
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [currentDownloadName, setCurrentDownloadName] = useState<string | null>(null);

  const polygonCoords = useMemo<[number, number][] | null>(() => {
    const coords = map?.area_bounds?.coordinates?.[0];
    if (!Array.isArray(coords)) {
      return null;
    }

    return coords.filter((point: any) => Array.isArray(point) && point.length >= 2) as [number, number][];
  }, [map]);

  const mapCenter = useMemo(() => {
    if (polygonCoords && polygonCoords.length > 0) {
      const centroid = computePolygonCentroid(polygonCoords);
      if (centroid) {
        return centroid;
      }
    }

    const fallbackLat = Number(map?.center_lat);
    const fallbackLng = Number(map?.center_lng);

    if (!Number.isNaN(fallbackLat) && !Number.isNaN(fallbackLng)) {
      return { lat: fallbackLat, lng: fallbackLng };
    }

    return { lat: 59.9139, lng: 10.7522 };
  }, [polygonCoords, map]);

  useEffect(() => {
    const loadMap = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const mapData = await fetchMap(parseInt(id));
        if (mapData) {
          setMap(mapData);
        } else {
          setError('Kart ikke funnet');
        }
      } catch (err) {
        setError('Kunne ikke laste kartdetaljer');
      } finally {
        setLoading(false);
      }
    };

    loadMap();
  }, [id, fetchMap]);

  const handleDownload = async (file: any) => {
    const resetDownloadState = () => {
      setTimeout(() => setDownloadProgress(0), 300);
      setDownloadingFileId(null);
      setCurrentDownloadName(null);
    };

    try {
      setDownloadingFileId(file.id);
      setCurrentDownloadName(file.original_filename || file.filename);
      setDownloadProgress(10);

      try {
        const directResponse = await axios.get(`${API_BASE_URL}/api/maps/files/${file.id}/download`, {
          params: { direct: true },
          withCredentials: true,
        });

        if (directResponse.data?.downloadUrl) {
          resetDownloadState();
          window.location.href = directResponse.data.downloadUrl;
          return;
        }
      } catch (directError: any) {
        if (directError?.response?.status && directError.response.status !== 409) {
          console.warn('Direkte nedlasting feilet, faller tilbake til proxy:', directError);
        }
        // Fortsett til fallback-strømmen nedenfor
      }

      const response = await axios.get(`${API_BASE_URL}/api/maps/files/${file.id}/download`, {
        responseType: 'arraybuffer',
        withCredentials: true,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(percentCompleted);
          } else {
            setDownloadProgress((prev) => (prev >= 95 ? prev : prev + 5));
          }
        },
      });

      const contentType = response.headers['content-type'] || '';
      const arrayBuffer = response.data as ArrayBuffer;

      const blob = new Blob([arrayBuffer], { type: contentType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename || file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadProgress(100);
      showSuccess('Fil lastet ned', `Filen "${file.original_filename || file.filename}" ble lastet ned!`);
    } catch (error) {
      console.error('Download error:', error);
      showError('Nedlasting feilet', 'Kunne ikke laste ned filen. Sjekk at filen eksisterer og prøv igjen.');
    } finally {
      resetDownloadState();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType?: string) => {
    const normalizedType = fileType?.toLowerCase();

    switch (normalizedType) {
      case 'pdf':
        return <img src={PdfIcon} alt="PDF" className="h-6 w-6" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-6 w-6 text-green-500" />;
      case 'ocd':
        return <img src={OcadIcon} alt="OCAD" className="h-6 w-6" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-16">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kart ikke funnet</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/kart')}
            className="btn-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til kart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/kart')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{map.name}</h1>
                <p className="text-sm text-gray-500">Kartdetaljer</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <History className="h-4 w-4 mr-2" />
                Versjonshistorikk
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map preview */}
            {map.preview_image && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Forhåndsvisning</h2>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={`/uploads/previews/${map.preview_image.file_path}`}
                    alt={map.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            {map.description && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Beskrivelse</h2>
                <p className="text-gray-700 leading-relaxed">{map.description}</p>
              </div>
            )}

            {/* Map files */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tilgjengelige filer</h2>
              {map.files && map.files.length > 0 ? (
                <div className="space-y-3">
                  {map.files.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.file_type)}
                        <div>
                          <div className="font-medium text-gray-900">{file.original_filename || file.filename}</div>
                          <div className="text-sm text-gray-500">
                            {file.file_type} • {formatFileSize(file.file_size)} • v{file.version}
                            {file.is_primary && (
                              <span className="ml-2 bg-brand-100 text-brand-600 px-2 py-1 rounded-full text-xs">
                                Primær
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(file)}
                        className="btn-primary flex items-center"
                        disabled={downloadingFileId === file.id}
                      >
                        {downloadingFileId === file.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {downloadProgress > 0 ? `Laster ned ${downloadProgress}%` : 'Forbereder...'}
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Last ned
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <File className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Ingen filer tilgjengelige</p>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Map info */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Kartinformasjon</h2>
              <div className="space-y-4">
                {map.scale && (
                  <div className="flex items-center">
                    <RulerDimensionLine className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Målestokk</div>
                      <div className="text-sm text-gray-500">{map.scale}</div>
                    </div>
                  </div>
                )}
                
                {map.contour_interval && (
                  <div className="flex items-center">
                    <Spline className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Ekvidistanse</div>
                      <div className="text-sm text-gray-500">{map.contour_interval} m</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Posisjon</div>
                    <div className="text-sm text-gray-500">
                      {mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Opprettet</div>
                    <div className="text-sm text-gray-500">
                      {new Date(map.created_at).toLocaleDateString('no-NO')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Opprettet av</div>
                    <div className="text-sm text-gray-500">{map.created_by_username}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Polygon Area */}
            {polygonCoords && polygonCoords.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Kartområde</h2>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <MapBoundsFitter coords={polygonCoords} />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Polygon
                      positions={polygonCoords}
                      color="#059669"
                      fillColor="#10b981"
                      fillOpacity={0.3}
                      weight={2}
                    />
                  </MapContainer>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Dette området viser kartets dekningsområde
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      {downloadingFileId && currentDownloadName && (
        <div className="fixed bottom-6 right-6 z-30 max-w-sm w-full bg-white border border-gray-200 shadow-xl rounded-lg p-4 flex items-start space-x-3">
          <Loader2 className="h-6 w-6 text-brand-600 animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Nedlasting pågår</p>
            <p className="text-xs text-gray-500 truncate">{currentDownloadName}</p>
            <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all duration-200"
                style={{ width: `${Math.min(downloadProgress || 10, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <VersionHistory
        mapId={parseInt(id!)}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
      />
    </div>
  );
};

export default MapDetailPage;
