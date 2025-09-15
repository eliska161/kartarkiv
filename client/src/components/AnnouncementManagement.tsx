import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, AlertCircle, Info, CheckCircle, AlertTriangle, History, RotateCcw, X } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { useToast } from '../contexts/ToastContext';
import { useConfirmation } from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  priority: number;
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

const AnnouncementManagement: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState<number | null>(null);
  const [versions, setVersions] = useState<AnnouncementVersion[]>([]);
  const { showSuccess, showError } = useToast();
  const { confirm, isOpen, options, onClose, onConfirm } = useConfirmation();

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    expires_at: '',
    priority: 0
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await apiClient.get('/api/announcements/admin');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showError('Kunne ikke hente kunngjøringer');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionHistory = async (announcementId: number) => {
    try {
      const response = await apiClient.get(`/api/announcements/${announcementId}/versions`);
      setVersions(response.data);
    } catch (error) {
      console.error('Error fetching version history:', error);
      showError('Kunne ikke hente versjonshistorikk');
    }
  };

  const restoreVersion = async (announcementId: number, versionId: number) => {
    try {
      await apiClient.post(`/api/announcements/${announcementId}/restore/${versionId}`, {
        reason: 'Gjenopprettet fra admin-dashboard'
      });
      showSuccess('Versjon gjenopprettet');
      fetchAnnouncements();
      setShowVersionHistory(null);
    } catch (error) {
      console.error('Error restoring version:', error);
      showError('Kunne ikke gjenopprette versjon');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAnnouncement) {
        await apiClient.put(`/api/announcements/${editingAnnouncement.id}`, {
          ...formData,
          is_active: editingAnnouncement.is_active
        });
        showSuccess('Kunngjøring oppdatert');
      } else {
        await apiClient.post('/api/announcements', formData);
        showSuccess('Kunngjøring opprettet');
      }
      
      setShowModal(false);
      setEditingAnnouncement(null);
      setFormData({ title: '', message: '', type: 'info', expires_at: '', priority: 0 });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      showError('Kunne ikke lagre kunngjøring');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : '',
      priority: announcement.priority
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Slett kunngjøring',
      message: 'Er du sikker på at du vil slette denne kunngjøringen?'
    });
    
    if (confirmed) {
      try {
        await apiClient.delete(`/api/announcements/${id}`);
        showSuccess('Kunngjøring slettet');
        fetchAnnouncements();
      } catch (error) {
        console.error('Error deleting announcement:', error);
        showError('Kunne ikke slette kunngjøring');
      }
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/api/announcements/${id}/toggle`);
      showSuccess(`Kunngjøring ${currentStatus ? 'deaktivert' : 'aktivert'}`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      showError('Kunne ikke endre kunngjøring');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eok-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kunngjøringer</h2>
          <p className="text-gray-600 mt-1">Administrer systemvise kunngjøringer</p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setFormData({ title: '', message: '', type: 'info', expires_at: '', priority: 0 });
            setShowModal(true);
          }}
          className="bg-eok-600 hover:bg-eok-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ny kunngjøring
        </button>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen kunngjøringer</h3>
            <p className="mt-1 text-sm text-gray-500">Opprett din første kunngjøring for å komme i gang.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kunngjøring
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioritet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utløper
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opprettet
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {announcements.map((announcement) => (
                  <tr key={announcement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {announcement.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {announcement.message}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeStyles(announcement.type)}`}>
                        {getTypeIcon(announcement.type)}
                        <span className="ml-1 capitalize">{announcement.type}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        announcement.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {announcement.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {announcement.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {announcement.expires_at ? new Date(announcement.expires_at).toLocaleDateString('nb-NO') : 'Aldri'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(announcement.created_at).toLocaleDateString('nb-NO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(announcement.id, announcement.is_active)}
                          className="text-gray-400 hover:text-gray-600"
                          title={announcement.is_active ? 'Deaktiver' : 'Aktiver'}
                        >
                          {announcement.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="text-eok-600 hover:text-eok-900"
                          title="Rediger"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setShowVersionHistory(announcement.id);
                            fetchVersionHistory(announcement.id);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Versjonshistorikk"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Slett"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingAnnouncement ? 'Rediger kunngjøring' : 'Ny kunngjøring'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tittel</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-eok-500 focus:border-eok-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Melding</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-eok-500 focus:border-eok-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-eok-500 focus:border-eok-500"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Advarsel</option>
                      <option value="success">Suksess</option>
                      <option value="error">Feil</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prioritet</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-eok-500 focus:border-eok-500"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Utløper (valgfritt)</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-eok-500 focus:border-eok-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-eok-600 text-white rounded-md text-sm font-medium hover:bg-eok-700"
                  >
                    {editingAnnouncement ? 'Oppdater' : 'Opprett'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={onConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        type={options.type}
        autoClose={options.autoClose}
      />

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Versjonshistorikk</h3>
              <button
                onClick={() => setShowVersionHistory(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 ${
                    version.is_current_version 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">
                        Versjon {version.version_number}
                      </span>
                      {version.is_current_version && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Nåværende
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(version.created_at).toLocaleString('nb-NO')}
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">{version.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{version.message}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>Type: {version.type}</span>
                      <span>Prioritet: {version.priority}</span>
                      <span>Status: {version.is_active ? 'Aktiv' : 'Inaktiv'}</span>
                    </div>
                    {!version.is_current_version && (
                      <button
                        onClick={() => restoreVersion(showVersionHistory, version.id)}
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Gjenopprett</span>
                      </button>
                    )}
                  </div>
                  
                  {version.change_reason && (
                    <div className="mt-2 text-xs text-gray-500">
                      <strong>Endringsårsak:</strong> {version.change_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManagement;
