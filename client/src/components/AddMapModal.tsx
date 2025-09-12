import React, { useState } from 'react';
import { X, Upload, File } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMap as useLeafletMap } from 'react-leaflet';
import { useMap } from '../contexts/MapContext';
import axios from 'axios';
import { handleApiError, showErrorToast, showSuccessToast, validateFile, validateMapForm } from '../utils/errorHandler';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface AddMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapToEdit?: any;
  onSuccess?: () => void;
}

interface MapClickHandlerProps {
  isDrawing: boolean;
  onPointAdd: (point: [number, number]) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ isDrawing, onPointAdd }) => {
  const map = useLeafletMap();

  React.useEffect(() => {
    if (!isDrawing || !map) return;

    const handleClick = (e: any) => {
      const { lat, lng } = e.latlng;
      onPointAdd([lat, lng]);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [isDrawing, map, onPointAdd]);

  return null;
};

const AddMapModal: React.FC<AddMapModalProps> = ({ isOpen, onClose, mapToEdit, onSuccess }) => {
  const { createMap } = useMap();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'info' | 'polygon' | 'files' | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Map data
  const [mapData, setMapData] = useState({
    name: '',
    description: '',
    scale: '',
    contourInterval: 0,
    centerLat: 60.8832,
    centerLng: 11.5519,
    zoomLevel: 10,
    areaBounds: null as any
  });
  
  // File upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileVersion, setFileVersion] = useState('1.0');
  const [isPrimaryFile, setIsPrimaryFile] = useState(false);
  
  // Preset states
  const [scalePreset, setScalePreset] = useState<string>('');
  const [contourPreset, setContourPreset] = useState<string>('');
  const [customScale, setCustomScale] = useState<string>('');
  const [customContour, setCustomContour] = useState<string>('');
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  
  // Preset options
  const scalePresets = [
    { value: '1:4000', label: '1:4 000' },
    { value: '1:7500', label: '1:7 500' },
    { value: '1:10000', label: '1:10 000' },
    { value: '1:15000', label: '1:15 000' },
    { value: '1:25000', label: '1:25 000' },
    { value: '1:50000', label: '1:50 000' },
    { value: '1:100000', label: '1:100 000' }
  ];

  const contourPresets = [
    { value: '2.5', label: '2.5 m' },
    { value: '5', label: '5 m' },
    { value: '10', label: '10 m' },
    { value: '20', label: '20 m' },
    { value: '25', label: '25 m' },
    { value: '50', label: '50 m' }
  ];

  // Removed unused functions to fix ESLint warnings

  const handleCustomContourChange = (value: string) => {
    setCustomContour(value);
    setMapData(prev => ({ ...prev, contourInterval: parseFloat(value) || 0 }));
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPolygon([]);
  };

  const finishDrawing = () => {
    if (currentPolygon.length >= 3) {
      // Close the polygon by adding the first point at the end
      const closedPolygon = [...currentPolygon, currentPolygon[0]];
      const polygon = {
        type: 'Polygon',
        coordinates: [closedPolygon]
      };
      setMapData(prev => ({ ...prev, areaBounds: polygon }));
      setIsDrawing(false);
      setCurrentPolygon([]);
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPolygon([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });
    
    if (errors.length > 0) {
      showErrorToast(errors.join('\n'));
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
    
    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };


  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });
    
    if (errors.length > 0) {
      showErrorToast(errors.join('\n'));
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate form data
    const formValidation = validateMapForm(mapData);
    if (!formValidation.isValid) {
      setError(formValidation.errors.join('\n'));
      setIsSubmitting(false);
      return;
    }

    // Valider at polygon er tegnet (kun for nye kart)
    if (!mapToEdit && !mapData.areaBounds) {
      setError('Du må tegne et polygon før du kan opprette kartet');
      setIsSubmitting(false);
      return;
    }

    // Valider at minst én fil er lastet opp (kun for nye kart)
    if (!mapToEdit && selectedFiles.length === 0) {
      setError('Du må laste opp minst én fil');
      setIsSubmitting(false);
      return;
    }

    try {
      if (mapToEdit) {
        // Update existing map
        await axios.put(`${API_BASE_URL}/api/maps/${mapToEdit.id}`, mapData);
        
        // Upload new files if any
        if (selectedFiles.length > 0) {
          const formData = new FormData();
          selectedFiles.forEach(file => {
            formData.append('files', file);
          });
          formData.append('version', fileVersion);
          formData.append('isPrimary', isPrimaryFile.toString());

          await axios.post(`${API_BASE_URL}/api/maps/${mapToEdit.id}/files`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
        // Create new map
        const newMap = await createMap(mapData);
        
        // Upload files if any
        if (selectedFiles.length > 0) {
          const formData = new FormData();
          selectedFiles.forEach(file => {
            formData.append('files', file);
          });
          formData.append('version', fileVersion);
          formData.append('isPrimary', isPrimaryFile.toString());

          await axios.post(`${API_BASE_URL}/api/maps/${newMap.id}/files`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      showSuccessToast(mapToEdit ? 'Kartet ble oppdatert!' : 'Kartet ble opprettet!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      showErrorToast(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mapToEdit ? 'Rediger kart' : 'Legg til nytt kart'}
            </h2>
            {mapToEdit && (
              <p className="text-sm text-gray-600 mt-1">
                Rediger "{mapToEdit.name}" - velg hva du vil endre
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Edit mode selection for existing maps */}
          {mapToEdit && step === 1 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Hva vil du redigere?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditMode('polygon');
                    setStep(2);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-eok-500 hover:bg-eok-50 transition-colors text-left"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900">Rediger polygon</h4>
                  </div>
                  <p className="text-sm text-gray-600">Endre kartområdet ved å tegne et nytt polygon</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setEditMode('files');
                    setStep(3);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-eok-500 hover:bg-eok-50 transition-colors text-left"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <Upload className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Rediger filer</h4>
                  </div>
                  <p className="text-sm text-gray-600">Legg til, fjern eller erstatt kartfiler</p>
                </button>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Eller rediger grunnleggende informasjon</h4>
                <p className="text-sm text-gray-600 mb-3">Du kan også endre navn, beskrivelse, målestokk og ekvidistanse</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode('info');
                    setStep(1);
                  }}
                  className="text-eok-600 hover:text-eok-700 font-medium text-sm"
                >
                  Fortsett med grunnleggende informasjon →
                </button>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepNumber
                        ? 'bg-eok-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        step > stepNumber ? 'bg-eok-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (!mapToEdit || editMode === 'info') && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Grunnleggende informasjon</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Fyll ut grunnleggende informasjon om kartet
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kartnavn *
                  </label>
                  <input
                    type="text"
                    value={mapData.name}
                    onChange={(e) => setMapData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                    placeholder="F.eks. Elverum Sentrum"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beskrivelse
                  </label>
                  <textarea
                    value={mapData.description}
                    onChange={(e) => setMapData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                    rows={3}
                    placeholder="Beskrivelse av kartet..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Målestokk *
                    </label>
                    <select
                      value={scalePreset}
                      onChange={(e) => {
                        setScalePreset(e.target.value);
                        if (e.target.value !== 'custom') {
                          setMapData(prev => ({ ...prev, scale: e.target.value }));
                          setCustomScale('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                      required
                    >
                      <option value="">Velg målestokk</option>
                      {scalePresets.map(preset => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                      <option value="custom">Egendefinert</option>
                    </select>
                    
                    {scalePreset === 'custom' && (
                      <input
                        type="text"
                        value={customScale}
                        onChange={(e) => {
                          setCustomScale(e.target.value);
                          setMapData(prev => ({ ...prev, scale: e.target.value }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500 mt-2"
                        placeholder="F.eks. 1:15000"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ekvidistanse (m) *
                    </label>
                    <select
                      value={contourPreset}
                      onChange={(e) => {
                        setContourPreset(e.target.value);
                        if (e.target.value !== 'custom') {
                          setMapData(prev => ({ ...prev, contourInterval: parseFloat(e.target.value) }));
                          setCustomContour('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                      required
                    >
                      <option value="">Velg ekvidistanse</option>
                      {contourPresets.map(preset => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                      <option value="custom">Egendefinert</option>
                    </select>
                    
                    {contourPreset === 'custom' && (
                      <input
                        type="number"
                        step="0.5"
                        value={customContour}
                        onChange={(e) => handleCustomContourChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500 mt-2"
                        placeholder="F.eks. 3.0"
                        required
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Draw Map Area */}
          {step === 2 && (!mapToEdit || editMode === 'polygon') && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tegn kartområde</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tegn et polygon rundt kartområdet på kartet nedenfor
                </p>
              </div>

              {!mapData.areaBounds ? (
                <div className="space-y-4">
                  <div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
                    <MapContainer
                      center={[60.8832, 11.5519]} // Default center for Norway
                      zoom={10}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      
                      {isDrawing && currentPolygon.length > 0 && (
                        <Polygon
                          positions={currentPolygon}
                          color="#dc2626"
                          fillColor="#dc2626"
                          fillOpacity={0.2}
                          weight={2}
                        />
                      )}
                      
                      {isDrawing && currentPolygon.length > 0 && (
                        <Polyline
                          positions={currentPolygon}
                          color="#dc2626"
                          weight={2}
                          dashArray="5, 5"
                        />
                      )}
                      
                      {currentPolygon.map((point, index) => (
                        <CircleMarker
                          key={index}
                          center={point}
                          radius={4}
                          color="#dc2626"
                          fillColor="#dc2626"
                        />
                      ))}
                      
                      <MapClickHandler
                        isDrawing={isDrawing}
                        onPointAdd={(point) => {
                          setCurrentPolygon(prev => [...prev, point]);
                        }}
                      />
                    </MapContainer>
                  </div>
                  
                  <div className="flex space-x-3">
                    {!isDrawing ? (
                      <button
                        type="button"
                        onClick={startDrawing}
                        className="btn-primary flex-1"
                      >
                        Start tegning
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={finishDrawing}
                          disabled={currentPolygon.length < 3}
                          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Fullfør polygon
                        </button>
                        <button
                          type="button"
                          onClick={cancelDrawing}
                          className="btn-secondary flex-1"
                        >
                          Avbryt
                        </button>
                      </>
                    )}
                  </div>
                  
                  {isDrawing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            Tegning aktiv
                          </h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Klikk på kartet for å legge til punkter. Du trenger minst 3 punkter for å fullføre polygonen.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
                    <MapContainer
                      center={[60.8832, 11.5519]}
                      zoom={10}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      
                      <Polygon
                        positions={mapData.areaBounds.coordinates[0]}
                        color="#dc2626"
                        fillColor="#dc2626"
                        fillOpacity={0.2}
                        weight={2}
                      />
                    </MapContainer>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Kartområde definert
                        </h3>
                        <p className="text-sm text-green-700 mt-1">
                          Polygonen er tegnet. Du kan fortsette til neste steg eller tegne på nytt.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setMapData(prev => ({ ...prev, areaBounds: null }))}
                      className="btn-secondary flex-1"
                    >
                      Tegn på nytt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Upload Files */}
          {step === 3 && (!mapToEdit || editMode === 'files') && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {mapToEdit ? 'Rediger filer' : 'Last opp filer'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {mapToEdit 
                    ? 'Legg til nye filer eller fjern eksisterende filer'
                    : 'Last opp kartfiler og eventuelle bildefiler'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Versjon
                  </label>
                  <input
                    type="text"
                    value={fileVersion}
                    onChange={(e) => setFileVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                    placeholder="F.eks. 1.0"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimaryFile}
                    onChange={(e) => setIsPrimaryFile(e.target.checked)}
                    className="h-4 w-4 text-eok-600 focus:ring-eok-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPrimary" className="ml-2 block text-sm text-gray-700">
                    Dette er hovedfilen for kartet
                  </label>
                </div>
              </div>
              
              {/* Show existing files when editing */}
              {mapToEdit && mapToEdit.files && mapToEdit.files.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Eksisterende filer:</h4>
                  <div className="space-y-2">
                    {mapToEdit.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center">
                          <File className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">{file.original_filename || file.filename}</span>
                          <span className="text-xs text-gray-500 ml-2">({file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(1)} MB` : 'Ukjent størrelse'})</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Er du sikker på at du vil slette filen "${file.original_filename || file.filename}"?`)) {
                              setIsDeletingFile(file.id);
                              try {
                                const response = await axios.delete(`${API_BASE_URL}/api/maps/files/${file.id}`);
                                if (response.status === 200) {
                                  // File deleted successfully - refresh the map data
                                  showSuccessToast('Filen ble slettet!');
                                  // Notify parent component to refresh
                                  onSuccess?.();
                                }
                              } catch (error) {
                                const errorMessage = handleApiError(error);
                                showErrorToast(errorMessage);
                              } finally {
                                setIsDeletingFile(null);
                              }
                            }
                          }}
                          disabled={isDeletingFile === file.id}
                          className={`text-red-500 hover:text-red-700 ${isDeletingFile === file.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={isDeletingFile === file.id ? 'Sletter...' : 'Slett fil'}
                        >
                          {isDeletingFile === file.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver 
                    ? 'border-eok-500 bg-eok-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragOver ? 'text-eok-500' : 'text-gray-400'}`} />
                <p className={`text-sm mb-2 ${isDragOver ? 'text-eok-700' : 'text-gray-600'}`}>
                  {isDragOver 
                    ? 'Slipp filene her...' 
                    : mapToEdit 
                      ? 'Dra filer hit eller klikk for å legge til nye filer' 
                      : 'Dra filer hit eller klikk for å laste opp OCAD, PDF eller bildefiler'
                  }
                </p>
                <input
                  type="file"
                  multiple
                  accept=".ocd,.pdf,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="btn-primary cursor-pointer"
                >
                  {mapToEdit ? 'Legg til filer' : 'Velg filer'}
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Valgte filer:</h4>
                  <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tilbake
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && !mapData.areaBounds) {
                    setError('Du må tegne et polygon før du kan fortsette');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="btn-primary"
              >
                Neste
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (mapToEdit ? 'Oppdaterer...' : 'Oppretter...') : (mapToEdit ? 'Oppdater kart' : 'Opprett kart')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMapModal;