import React, { useState, useEffect, useCallback } from 'react';
import { History, User, Calendar, FileText } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface VersionHistoryProps {
  mapId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface VersionEntry {
  id: number;
  version_number: string;
  change_description: string;
  changed_by: string;
  changed_at: string;
  changes: any;
  username?: string;
  first_name?: string;
  last_name?: string;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ mapId, isOpen, onClose }) => {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVersionHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/maps/${mapId}/versions`);
      setVersions(response.data);
    } catch (error) {
      console.error('Error fetching version history:', error);
    } finally {
      setLoading(false);
    }
  }, [mapId]);

  useEffect(() => {
    if (isOpen && mapId) {
      fetchVersionHistory();
    }
  }, [fetchVersionHistory, isOpen, mapId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nb-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserDisplayName = (version: VersionEntry) => {
    if (version.first_name || version.last_name) {
      return `${version.first_name || ''} ${version.last_name || ''}`.trim();
    }
    if (version.username) {
      return version.username;
    }
    return 'Ukjent bruker';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <History className="h-6 w-6 text-brand-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Versjonshistorikk</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen versjonshistorikk</h3>
              <p className="text-gray-500">Endringer i dette kartet vil vises her</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-brand-600">
                            v{version.version_number}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {version.change_description}
                        </h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <User className="h-4 w-4 mr-1" />
                          {getUserDisplayName(version)}
                          <Calendar className="h-4 w-4 ml-3 mr-1" />
                          {formatDate(version.changed_at)}
                        </div>
                      </div>
                    </div>
                    {index === 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Nåværende
                      </span>
                    )}
                  </div>
                  
                  {version.changes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center mb-2">
                        <FileText className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Endringer:</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {Object.entries(version.changes).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
