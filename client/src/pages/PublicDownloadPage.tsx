import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Download, RulerDimensionLine, Spline, Calendar, User, FileText, AlertCircle, CheckCircle, Loader2, Image, Lock } from 'lucide-react';
import PdfIcon from '../assets/icon-pdf.svg';
import OcadIcon from '../assets/icon-ocad.svg';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://kartarkiv-production.up.railway.app';

interface MapFile {
  id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  download_url: string;
}

interface MapData {
  id: number;
  name: string;
  description?: string;
  scale?: string;
  contour_interval?: number;
  created_at: string;
}

interface ShareInfo {
  expiresAt: string;
  downloadCount: number;
  isOneTime: boolean;
  createdByName?: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  clubName?: string | null;
}

interface DownloadResponse {
  message: string;
  map: MapData;
  files: MapFile[];
  shareInfo: ShareInfo;
}

const PublicDownloadPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DownloadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [currentDownloadName, setCurrentDownloadName] = useState<string | null>(null);

  const fetchDownloadData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/maps/download/${token}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Kunne ikke laste ned kart');
      }

      const data = await response.json();
      setData(data);
    } catch (err: any) {
      console.error('Error fetching download data:', err);
      setError(err.message || 'En feil oppstod');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('Ugyldig delings-lenke');
      setLoading(false);
      return;
    }

    fetchDownloadData();
  }, [fetchDownloadData, token]);

  const handleDownload = async (file: MapFile) => {
    const resetDownloadState = () => {
      setDownloading(null);
      setCurrentDownloadName(null);
      setTimeout(() => setDownloadProgress(0), 300);
    };

    try {
      setDownloading(file.id);
      setCurrentDownloadName(file.filename);
      setDownloadProgress(10);

      try {
        const directResponse = await axios.get(`${API_BASE_URL}/api/maps/download/${token}/file/${file.id}`, {
          params: { direct: true },
        });

        if (directResponse.data?.downloadUrl) {
          resetDownloadState();
          window.location.href = directResponse.data.downloadUrl;
          return;
        }
      } catch (directError: any) {
        if (directError?.response?.status && directError.response.status !== 409) {
          console.warn('Direkte nedlasting for offentlig lenke feilet, faller tilbake til proxy:', directError);
        }
        // Fortsett til fallback-nedlasting nedenfor
      }

      const response = await axios.get(`${API_BASE_URL}/api/maps/download/${token}/file/${file.id}`, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(percentCompleted);
          } else {
            setDownloadProgress((prev) => (prev >= 95 ? prev : prev + 5));
          }
        }
      });

      const contentType = response.headers['content-type'] || '';
      const arrayBuffer = response.data as ArrayBuffer;

      const blob = new Blob([arrayBuffer], { type: contentType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadProgress(100);

    } catch (err: any) {
      console.error('Error downloading file:', err);
      alert('Kunne ikke laste ned fil: ' + err.message);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return <img src={PdfIcon} alt="PDF" className="h-6 w-6" />;
      case 'ocd':
        return <img src={OcadIcon} alt="OCAD" className="h-6 w-6" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-6 w-6 text-green-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laster ned kart...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Kunne ikke laste ned kart</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Gå til hjemmeside
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{data.map.name}</h1>
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Tilgjengelig for nedlasting</span>
            </div>
          </div>
          
          {data.map.description && (
            <p className="text-gray-600 mb-4">{data.map.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.map.scale && (
              <div className="flex items-center text-gray-600">
                <RulerDimensionLine className="h-5 w-5 mr-2" />
                <span className="text-sm">Målestokk: {data.map.scale}</span>
              </div>
            )}

            {data.map.contour_interval && (
              <div className="flex items-center text-gray-600">
                <Spline className="h-5 w-5 mr-2" />
                <span className="text-sm">Ekvidistanse: {data.map.contour_interval}m</span>
              </div>
            )}

            <div className="flex items-center text-gray-600">
              <Calendar className="h-5 w-5 mr-2" />
              <span className="text-sm">Opprettet: {formatDate(data.map.created_at)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {data.shareInfo.createdByName && (
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                <span>Deling opprettet av: {data.shareInfo.createdByName}</span>
              </div>
            )}

            {data.shareInfo.watermarkEnabled && data.shareInfo.watermarkText && (
              <div className="flex items-start text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Lock className="h-4 w-4 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Filen merkes automatisk for sikker deling.</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Tekst: “{data.shareInfo.watermarkText}”
                    {data.shareInfo.clubName ? ` · Synlig for ${data.shareInfo.clubName}` : ''}
                  </p>
                </div>
              </div>
            )}

            {data.shareInfo.watermarkEnabled === false && (
              <div className="flex items-start text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                <span>Vannmerking er deaktivert for denne delingen.</span>
              </div>
            )}
          </div>
        </div>

        {/* Files */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filer til nedlasting</h2>
          
          {data.files.length > 0 ? (
            <div className="space-y-3">
              {data.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.filename)}
                    <div>
                      <p className="font-medium text-gray-900">{file.filename}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.id}
                    className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {downloading === file.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{downloadProgress > 0 ? `Laster ned ${downloadProgress}%` : 'Forbereder...'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Last ned</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Ingen filer tilgjengelige</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Viktig informasjon:</p>
              <ul className="space-y-1">
                <li>• Denne lenken kan kun brukes én gang</li>
                <li>• Lenken utløper: {formatDate(data.shareInfo.expiresAt)}</li>
                <li>• Du trenger ikke å logge inn for å laste ned</li>
                {data.shareInfo.watermarkEnabled && data.shareInfo.watermarkText && (
                  <li>• Filene er vannmerket med: “{data.shareInfo.watermarkText}”</li>
                )}
                {data.shareInfo.watermarkEnabled === false && (
                  <li>• Denne delingen er levert uten vannmerke (valgt av administrator).</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {downloading && currentDownloadName && (
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
    </div>
  );
};

export default PublicDownloadPage;
