import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import apiClient from '../utils/apiClient';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  created_at: string;
  expires_at?: string;
}

const AnnouncementBar: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

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
        </div>
      ))}
    </div>
  );
};

export default AnnouncementBar;
