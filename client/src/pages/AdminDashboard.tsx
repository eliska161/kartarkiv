import React, { useState } from 'react';
import { useUser, UserProfile } from '@clerk/clerk-react';
import { useMap } from '../contexts/MapContext';
import Header from '../components/Header';
import AddMapModal from '../components/AddMapModal';
import UserManagement from '../components/UserManagement';
import LogoManager from '../components/LogoManager';
import { Plus, MapPin, Users, BarChart3, Settings, Edit, Trash2, User } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  useUser(); // Get Clerk user data
  const { maps, loading, fetchMaps, deleteMap, fetchMap } = useMap();
  const [activeTab, setActiveTab] = useState<'maps' | 'users' | 'profile' | 'stats' | 'settings'>('maps');
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [editingMap, setEditingMap] = useState<any>(null);
  const [selectedMaps, setSelectedMaps] = useState<Set<number>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);

  const stats = {
    totalMaps: maps.length,
    totalFiles: maps.reduce((sum, map) => sum + (map.file_count || 0), 0),
    recentMaps: maps.filter(map => {
      if (!map.created_at) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(map.created_at) > weekAgo;
    }).length
  };

  const handleEditMap = async (map: any) => {
    try {
      // Fetch full map details including files
      const fullMapData = await fetchMap(map.id);
      setEditingMap(fullMapData);
    } catch (error) {
      console.error('Error fetching map details:', error);
      // Fallback to basic map data
      setEditingMap(map);
    }
  };

  const handleDeleteMap = async (mapId: number, mapName: string) => {
    if (window.confirm(`Er du sikker på at du vil slette kartet "${mapName}"? Dette kan ikke angres.`)) {
      try {
        await deleteMap(mapId);
        fetchMaps(); // Refresh the list
      } catch (error) {
        console.error('Error deleting map:', error);
        alert('Kunne ikke slette kartet. Prøv igjen.');
      }
    }
  };

  const handleSelectMap = (mapId: number) => {
    const newSelected = new Set(selectedMaps);
    if (newSelected.has(mapId)) {
      newSelected.delete(mapId);
    } else {
      newSelected.add(mapId);
    }
    setSelectedMaps(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMaps.size === maps.length) {
      setSelectedMaps(new Set());
    } else {
      setSelectedMaps(new Set(maps.map(map => map.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMaps.size === 0) return;
    
    const mapNames = maps.filter(map => selectedMaps.has(map.id)).map(map => map.name);
    if (window.confirm(`Er du sikker på at du vil slette ${selectedMaps.size} kart?\n\n${mapNames.join('\n')}\n\nDette kan ikke angres.`)) {
      try {
        for (const mapId of selectedMaps) {
          await deleteMap(mapId);
        }
        setSelectedMaps(new Set());
        setBulkActionMode(false);
        fetchMaps(); // Refresh the list
        alert(`${selectedMaps.size} kart ble slettet!`);
      } catch (error) {
        console.error('Error deleting maps:', error);
        alert('Kunne ikke slette alle kartene. Prøv igjen.');
      }
    }
  };

  const tabs = [
    { id: 'maps', label: 'Kart', icon: MapPin },
    { id: 'users', label: 'Brukere', icon: Users },
    { id: 'profile', label: 'Min Profil', icon: User },
    { id: 'stats', label: 'Statistikk', icon: BarChart3 },
    { id: 'settings', label: 'Innstillinger', icon: Settings }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Administrer kartarkiv og brukere</p>
            </div>
            <button
              onClick={() => setShowAddMapModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Legg til kart
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-eok-100 p-3 rounded-lg">
                <MapPin className="h-6 w-6 text-eok-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt antall kart</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMaps}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totalt antall filer</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Nye kart (7 dager)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentMaps}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-eok-500 text-eok-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'maps' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Kartoversikt</h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {maps.length} kart totalt
                  </div>
                  <button
                    onClick={() => setBulkActionMode(!bulkActionMode)}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      bulkActionMode 
                        ? 'bg-eok-100 text-eok-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {bulkActionMode ? 'Avbryt' : 'Velg flere'}
                  </button>
                </div>
              </div>

              {/* Bulk actions */}
              {bulkActionMode && selectedMaps.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      {selectedMaps.size} kart valgt
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Slett valgte
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eok-600"></div>
                </div>
              ) : maps.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen kart ennå</h3>
                  <p className="text-gray-500 mb-4">Legg til ditt første kart for å komme i gang</p>
                  <button
                    onClick={() => setShowAddMapModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Legg til kart
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {bulkActionMode && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedMaps.size === maps.length && maps.length > 0}
                              onChange={handleSelectAll}
                              className="h-4 w-4 text-eok-600 focus:ring-eok-500 border-gray-300 rounded"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kart
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Målestokk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Filer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opprettet
                        </th>
                        {!bulkActionMode && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Handlinger
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {maps.map((map) => (
                        <tr key={map.id} className="hover:bg-gray-50">
                          {bulkActionMode && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedMaps.has(map.id)}
                                onChange={() => handleSelectMap(map.id)}
                                className="h-4 w-4 text-eok-600 focus:ring-eok-500 border-gray-300 rounded"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{map.name}</div>
                              {map.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {map.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {map.scale || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {map.file_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {map.created_at ? new Date(map.created_at).toLocaleDateString('no-NO') : '-'}
                          </td>
                          {!bulkActionMode && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleEditMap(map)}
                                  className="text-eok-600 hover:text-eok-900 flex items-center"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Rediger
                                </button>
                                <button 
                                  onClick={() => handleDeleteMap(map.id, map.name)}
                                  className="text-red-600 hover:text-red-900 flex items-center"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Slett
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <UserManagement />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Min Profil</h2>
                <p className="text-gray-600 mt-1">Administrer din egen brukerkonto</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <UserProfile 
                  appearance={{
                    elements: {
                      card: 'shadow-none border-0',
                      headerTitle: 'text-gray-900',
                      headerSubtitle: 'text-gray-600',
                      formButtonPrimary: 'bg-eok-600 hover:bg-eok-700 text-white',
                      formFieldInput: 'border-gray-300 focus:border-eok-500 focus:ring-eok-500',
                      footerActionLink: 'text-eok-600 hover:text-eok-700',
                      identityPreviewText: 'text-gray-600',
                      formFieldLabel: 'text-gray-700',
                      dividerLine: 'bg-gray-300',
                      dividerText: 'text-gray-500',
                      navbarButton: 'text-eok-600 hover:text-eok-700',
                      navbarButtonActive: 'bg-eok-50 text-eok-700',
                      profileSectionTitle: 'text-gray-900',
                      profileSectionContent: 'text-gray-600'
                    }
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <LogoManager />
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Statistikk</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Kartoversikt</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Totalt antall kart:</span>
                      <span className="font-medium">{stats.totalMaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Totalt antall filer:</span>
                      <span className="font-medium">{stats.totalFiles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nye kart (7 dager):</span>
                      <span className="font-medium">{stats.recentMaps}</span>
                    </div>
                  </div>
                </div>
                
                <div className="card">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Siste aktivitet</h3>
                  <div className="space-y-2">
                    {maps.slice(0, 5).map((map) => (
                      <div key={map.id} className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate">{map.name}</span>
                        <span className="text-gray-500">
                          {map.created_at ? new Date(map.created_at).toLocaleDateString('no-NO') : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Map Modal */}
      {(showAddMapModal || editingMap) && (
        <AddMapModal
          isOpen={showAddMapModal || !!editingMap}
          mapToEdit={editingMap}
          onClose={() => {
            setShowAddMapModal(false);
            setEditingMap(null);
          }}
          onSuccess={() => {
            setShowAddMapModal(false);
            setEditingMap(null);
            fetchMaps(); // Refresh maps list
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
