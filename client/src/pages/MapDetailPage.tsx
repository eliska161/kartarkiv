import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMap } from '../contexts/MapContext';
import axios from 'axios';
import { ArrowLeft, Download, MapPin, Scale, Ruler, Calendar, User, FileText, Image, File } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MapDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchMap } = useMap();
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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


  const handleDownload = async (file: any, event?: React.MouseEvent<HTMLButtonElement>) => {
    try {
      // Show loading state
      const button = event?.currentTarget as HTMLButtonElement;
      if (button) {
        button.textContent = 'Laster ned...';
        button.disabled = true;
      }

      // Check if file_path is a Wasabi URL or local filename
      const filePath = file.file_path;
      let downloadUrl;
      
      if (filePath.startsWith('http')) {
        // It's a Wasabi URL, use it directly
        downloadUrl = filePath;
      } else {
        // It's a local filename, construct the URL
        downloadUrl = `${API_BASE_URL}/uploads/maps/${filePath}`;
      }
      
      // Use axios to download the file
      const response = await axios.get(downloadUrl, {
        responseType: 'blob',
      });
      
      // Create blob URL and download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename || file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message
      alert(`Filen "${file.original_filename || file.filename}" ble lastet ned!`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Kunne ikke laste ned filen. Sjekk at filen eksisterer og prøv igjen.');
    } finally {
      // Reset button state
      const button = event?.currentTarget as HTMLButtonElement;
      if (button) {
        button.textContent = 'Last ned';
        button.disabled = false;
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-5 w-5 text-green-500" />;
      case 'ocd':
        return <File className="h-5 w-5 text-green-600" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eok-600"></div>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kart ikke funnet</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{map.name}</h1>
                <p className="text-sm text-gray-500">Kartdetaljer</p>
              </div>
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
                          <div className="font-medium text-gray-900">{file.file_name}</div>
                          <div className="text-sm text-gray-500">
                            {file.file_type} • {formatFileSize(file.file_size)} • v{file.version}
                            {file.is_primary && (
                              <span className="ml-2 bg-eok-100 text-eok-600 px-2 py-1 rounded-full text-xs">
                                Primær
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDownload(file, e)}
                        className="btn-primary flex items-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Last ned
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
                    <Scale className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Målestokk</div>
                      <div className="text-sm text-gray-500">{map.scale}</div>
                    </div>
                  </div>
                )}
                
                {map.contour_interval && (
                  <div className="flex items-center">
                    <Ruler className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Ekvidistanse</div>
                      <div className="text-sm text-gray-500">{map.contour_interval}m</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Posisjon</div>
                    <div className="text-sm text-gray-500">
                      {parseFloat(map.center_lat).toFixed(6)}, {parseFloat(map.center_lng).toFixed(6)}
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

            {/* Metadata */}
            {map.metadata && Object.keys(map.metadata).length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tilleggsinformasjon</h2>
                <div className="space-y-2">
                  {Object.entries(map.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-sm text-gray-500">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDetailPage;
