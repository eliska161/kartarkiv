import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMap } from '../contexts/MapContext';
import MapComponent from '../components/MapComponent';
import MapList from '../components/MapList';
import Header from '../components/Header';
import { MapPin, List, Search, Filter, HelpCircle } from 'lucide-react';

const MapPage: React.FC = () => {
  useUser(); // Get Clerk user data
  const { maps, loading, error, fetchMaps } = useMap();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMap, setSelectedMap] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    scale: '',
    contourInterval: ''
  });

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]); // Now fetchMaps is stable with useCallback

  const filteredMaps = maps.filter(map => {
    const matchesSearch = map.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         map.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScale = !filters.scale || map.scale === filters.scale;
    const matchesContour = !filters.contourInterval || 
                          map.contour_interval?.toString() === filters.contourInterval;

    return matchesSearch && matchesScale && matchesContour;
  });

  const uniqueScales = Array.from(new Set(maps.map(map => map.scale).filter(Boolean)));
  const uniqueContours = Array.from(new Set(maps.map(map => map.contour_interval).filter(Boolean)));

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eok-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Henter kart...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Kunne ikke hente kart</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchMaps()}
              className="bg-eok-600 text-white px-4 py-2 rounded-lg hover:bg-eok-700 transition-colors"
            >
              Prøv igjen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-white shadow-lg h-auto lg:h-screen overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900">Kartarkiv</h2>
                <div className="ml-2 group relative">
                  <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    Velg visning: kart eller liste
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg ${
                    viewMode === 'map' 
                      ? 'bg-eok-100 text-eok-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${
                    viewMode === 'list' 
                      ? 'bg-eok-100 text-eok-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Søk i kart</label>
                <div className="group relative">
                  <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    Søk etter kartnavn eller beskrivelse
                  </div>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Søk i kart..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-eok-500 focus:border-transparent text-base"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filtrer
                </button>
                <div className="group relative">
                  <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    Filtrer etter målestokk og ekvidistanse
                  </div>
                </div>
              </div>
              
              {showFilters && (
                <div className="mt-2 space-y-2">
                  <select
                    value={filters.scale}
                    onChange={(e) => setFilters(prev => ({ ...prev, scale: e.target.value }))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-eok-500"
                  >
                    <option value="">Alle målestokker</option>
                    {uniqueScales.map(scale => (
                      <option key={scale} value={scale}>{scale}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filters.contourInterval}
                    onChange={(e) => setFilters(prev => ({ ...prev, contourInterval: e.target.value }))}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-eok-500"
                  >
                    <option value="">Alle ekvidistanse</option>
                    {uniqueContours.map(contour => (
                      <option key={contour} value={contour}>{contour}m</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Map count */}
            <div className="text-sm text-gray-500 mb-4">
              {filteredMaps.length} kart funnet
            </div>
          </div>

          {/* Map list */}
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-eok-600"></div>
              </div>
            ) : (
              <MapList 
                maps={filteredMaps}
                selectedMap={selectedMap}
                onSelectMap={setSelectedMap}
                viewMode={viewMode}
              />
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-screen">
          {viewMode === 'map' ? (
            <MapComponent 
              maps={filteredMaps}
              selectedMap={selectedMap}
              onSelectMap={setSelectedMap}
            />
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaps.map(map => (
                  <div
                    key={map.id}
                    className="card cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedMap(map.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{map.name}</h3>
                      <span className="text-xs bg-eok-100 text-eok-600 px-2 py-1 rounded">
                        {map.file_count} filer
                      </span>
                    </div>
                    
                    {map.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {map.description}
                      </p>
                    )}
                    
                    <div className="space-y-1 text-xs text-gray-500">
                      {map.scale && (
                        <div>Målestokk: {map.scale}</div>
                      )}
                      {map.contour_interval && (
                        <div>Ekvidistanse: {map.contour_interval}m</div>
                      )}
                      <div>Opprettet: {new Date(map.created_at).toLocaleDateString('no-NO')}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredMaps.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen kart funnet</h3>
                  <p className="text-gray-500">
                    {searchTerm || Object.values(filters).some(f => f) 
                      ? 'Prøv å endre søkekriteriene dine'
                      : 'Det er ingen kart i arkivet ennå'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
