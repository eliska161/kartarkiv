import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import apiClient from '../utils/apiClient';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  version_number?: number;
  version_created_at?: string;
}

interface AnnouncementVersion {
  id: number;
  version_number: number;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  expires_at?: string;
  priority: number;
  created_by: string;
  created_at: string;
  change_reason?: string;
  is_current_version: boolean;
}

const AnnouncementBar: React.FC = () => {
  const { isSignedIn } = useUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());
  const [versions, setVersions] = useState<Map<number, AnnouncementVersion[]>>(new Map());

  useEffect(() => {
    if (!isSignedIn) {
      setAnnouncements([]);
      return;
    }

    fetchAnnouncements();
  }, [isSignedIn]);

  const fetchAnnouncements = async () => {
    try {
      const response = await apiClient.get('/api/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = (id: number) => {
    setDismissedAnnouncements(prev => new Set([...prev, id]));
  };

  const fetchVersionHistory = async (announcementId: number) => {
    try {
      const response = await apiClient.get(`/api/announcements/${announcementId}/versions`);
      setVersions(prev => new Map(prev.set(announcementId, response.data)));
    } catch (error) {
      console.error('Error fetching version history:', error);
    }
  };

  const toggleVersions = (announcementId: number) => {
    if (expandedVersions.has(announcementId)) {
      setExpandedVersions(prev => {
        const newSet = new Set(prev);
        newSet.delete(announcementId);
        return newSet;
      });
    } else {
      setExpandedVersions(prev => new Set([...prev, announcementId]));
      if (!versions.has(announcementId)) {
        fetchVersionHistory(announcementId);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!isSignedIn) {
    return null;
  }

  if (loading) {
    return null;
  }

  // Filter out dismissed announcements and expired ones
  const activeAnnouncements = announcements.filter(announcement => {
    if (dismissedAnnouncements.has(announcement.id)) return false;
    if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) return false;
    return true;
  });

  if (activeAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {activeAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`border-l-4 p-4 rounded-r-md ${getTypeStyles(announcement.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              {getIcon(announcement.type)}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">
                {announcement.title}
              </h3>
              <p className="text-sm mt-1">
                {announcement.message}
              </p>
              <div className="text-xs text-gray-500 mt-2 flex items-center space-x-4">
                <span>
                  Opprettet: {new Date(announcement.created_at).toLocaleString('nb-NO')}
                </span>
                {announcement.updated_at !== announcement.created_at && (
                  <span>
                    Oppdatert: {new Date(announcement.updated_at).toLocaleString('nb-NO')}
                  </span>
                )}
                {announcement.version_number && announcement.version_number > 1 && (
                  <button
                    onClick={() => toggleVersions(announcement.id)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <History className="h-3 w-3" />
                    <span>Se versjoner ({announcement.version_number})</span>
                    {expandedVersions.has(announcement.id) ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={() => dismissAnnouncement(announcement.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Lukk kunngjøring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Version History Dropdown */}
          {expandedVersions.has(announcement.id) && versions.has(announcement.id) && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Versjonshistorikk:</h4>
              <div className="space-y-2">
                {versions.get(announcement.id)?.map((version) => (
                  <div
                    key={version.id}
                    className={`text-xs p-2 rounded border ${
                      version.is_current_version 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Versjon {version.version_number}</span>
                          {version.is_current_version && (
                            <span className="text-green-600 text-xs">(Nåværende)</span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{version.message}</p>
                        {version.change_reason && (
                          <p className="text-gray-500 mt-1 italic">
                            Årsak: {version.change_reason}
                          </p>
                        )}
                      </div>
                      <div className="text-gray-500 text-right">
                        {new Date(version.created_at).toLocaleString('nb-NO')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AnnouncementBar;
