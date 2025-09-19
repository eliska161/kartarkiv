import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Download, Share2, ArrowRight, CheckCircle, Search, Eye, MousePointer, ZoomIn, ZoomOut, FileText, Link, Play, Pause, RotateCcw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      icon: <Map className="h-12 w-12 text-eok-600" />,
      title: "Velkommen til Kartarkiv!",
      description: "Din plattform for å utforske og laste ned kartdata.",
      details: [
        "Utforsk kart i interaktivt kartvisning",
        "Søk og filtrer kart etter dine behov", 
        "Last ned kartfiler direkte fra kartet",
        "Del kart med andre via engangs-lenker"
      ],
      interactive: false
    },
    {
      icon: <Search className="h-12 w-12 text-eok-600" />,
      title: "Utforsk kartet",
      description: "Naviger og utforsk kartene i det interaktive kartet.",
      details: [
        "Zoom inn/ut med musehjulet eller knappene",
        "Klikk på kartmarkører for å se detaljer",
        "Velg kart fra listen for å fokusere på dem",
        "Bruk søkefeltet for å finne spesifikke kart"
      ],
      interactive: true,
      demo: "map"
    },
    {
      icon: <Download className="h-12 w-12 text-eok-600" />,
      title: "Last ned kart",
      description: "Hent kartfiler direkte fra kartvisningen.",
      details: [
        "Klikk på kartmarkører for å se tilgjengelige filer",
        "Last ned enkeltfiler eller hele kartsettet",
        "Filer lastes ned i original kvalitet",
        "Støtter PDF, JPG, PNG og TIFF formater"
      ],
      interactive: true,
      demo: "download"
    },
    {
      icon: <Share2 className="h-12 w-12 text-eok-600" />,
      title: "Del kart",
      description: "Del kart med andre via engangs-lenker.",
      details: [
        "Bruk 'Del'-knappen på hvert kart",
        "Kopier lenken og send til mottakere",
        "Lenker utløper automatisk etter 5 timer",
        "Mottakere kan laste ned uten å logge inn"
      ],
      interactive: true,
      demo: "share"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/');
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  const handleTryDemo = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setCompletedSteps(prev => [...prev, currentStep]);
    }, 3000);
  };

  const handleResetDemo = () => {
    setIsAnimating(false);
    setCompletedSteps(prev => prev.filter(step => step !== currentStep));
  };

  // Interactive Demo Components
  const MapDemo = () => {
    const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
    
    // Sample map data for demo
    const demoMaps = [
      {
        id: 1,
        name: "Oslo Sentrum",
        coordinates: [59.9139, 10.7522],
        type: "bykart",
        files: ["oslo_sentrum.pdf", "oslo_satellitt.jpg"]
      },
      {
        id: 2,
        name: "Bergen Havn",
        coordinates: [60.3913, 5.3221],
        type: "havnekart",
        files: ["bergen_havn.pdf", "bergen_topografi.tiff"]
      },
      {
        id: 3,
        name: "Trondheim Universitet",
        coordinates: [63.4194, 10.4026],
        type: "campus",
        files: ["trondheim_campus.pdf"]
      }
    ];

    const handleMarkerClick = (mapId: number) => {
      setSelectedMarker(mapId);
      if (isAnimating) {
        setTimeout(() => setSelectedMarker(null), 2000);
      }
    };

    return (
      <div className="relative bg-white rounded-lg border border-gray-300 overflow-hidden" style={{ height: '400px' }}>
        {/* Search bar overlay */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="bg-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Søk kart..." 
              className="border-none outline-none text-sm"
              disabled
            />
          </div>
        </div>

        {/* Map controls overlay */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
          <button className={`p-2 rounded-full bg-white shadow-lg transition-all ${isAnimating ? 'bg-eok-100 text-eok-600' : 'text-gray-600'}`}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button className={`p-2 rounded-full bg-white shadow-lg transition-all ${isAnimating ? 'bg-eok-100 text-eok-600' : 'text-gray-600'}`}>
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>

        {/* Real Leaflet Map */}
        <MapContainer
          center={[59.9139, 10.7522]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Demo markers */}
          {demoMaps.map((map) => (
            <Marker
              key={map.id}
              position={[map.coordinates[0], map.coordinates[1]]}
              eventHandlers={{
                click: () => handleMarkerClick(map.id)
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900 mb-2">{map.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">Type: {map.type}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Tilgjengelige filer:</p>
                    {map.files.map((file, index) => (
                      <div key={index} className="flex items-center space-x-1 text-xs">
                        <FileText className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">{file}</span>
                      </div>
                    ))}
                  </div>
                  {isAnimating && (
                    <div className="mt-2 p-2 bg-eok-50 rounded text-xs text-eok-700 animate-pulse">
                      Klikk for å se detaljer og laste ned filer
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Instruction overlay */}
        {isAnimating && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <MousePointer className="h-4 w-4 text-eok-600" />
              <span>Klikk på markørene for å se kartdetaljer</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const DownloadDemo = () => {
    const [selectedMap, setSelectedMap] = useState<number | null>(null);
    const [downloadingFiles, setDownloadingFiles] = useState<number[]>([]);
    
    const demoMaps = [
      {
        id: 1,
        name: "Oslo Sentrum",
        coordinates: [59.9139, 10.7522],
        files: [
          { name: "oslo_sentrum.pdf", size: "2.4 MB", type: "PDF" },
          { name: "oslo_satellitt.jpg", size: "1.8 MB", type: "JPG" }
        ]
      },
      {
        id: 2,
        name: "Bergen Havn",
        coordinates: [60.3913, 5.3221],
        files: [
          { name: "bergen_havn.pdf", size: "3.1 MB", type: "PDF" },
          { name: "bergen_topografi.tiff", size: "4.2 MB", type: "TIFF" }
        ]
      }
    ];

    const handleMapClick = (mapId: number) => {
      setSelectedMap(mapId);
      if (isAnimating) {
        setTimeout(() => {
          setDownloadingFiles([0, 1]);
          setTimeout(() => setDownloadingFiles([]), 2000);
        }, 1000);
      }
    };

    const handleDownload = (mapId: number, fileIndex: number) => {
      setDownloadingFiles(prev => [...prev, fileIndex]);
      if (isAnimating) {
        setTimeout(() => {
          setDownloadingFiles(prev => prev.filter(f => f !== fileIndex));
        }, 2000);
      }
    };

    return (
      <div className="relative bg-white rounded-lg border border-gray-300 overflow-hidden" style={{ height: '400px' }}>
        {/* Map view */}
        <div className="h-1/2">
          <MapContainer
            center={[59.9139, 10.7522]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {demoMaps.map((map) => (
              <Marker
                key={map.id}
                position={[map.coordinates[0], map.coordinates[1]]}
                eventHandlers={{
                  click: () => handleMapClick(map.id)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 mb-2">{map.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {map.files.length} filer tilgjengelig
                    </p>
                    {isAnimating && (
                      <div className="mt-2 p-2 bg-eok-50 rounded text-xs text-eok-700">
                        Klikk for å se og laste ned filer
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* File list view */}
        <div className="h-1/2 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Kartfiler</h3>
            {selectedMap && (
              <span className="text-sm text-gray-600">
                {demoMaps.find(m => m.id === selectedMap)?.name}
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedMap ? (
              demoMaps.find(m => m.id === selectedMap)?.files.map((file, index) => (
                <div 
                  key={file.name}
                  className={`bg-white px-3 py-2 rounded-lg shadow-sm transition-all duration-300 ${
                    downloadingFiles.includes(index) ? 'bg-eok-50 border border-eok-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.size} • {file.type}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(selectedMap, index)}
                      disabled={downloadingFiles.includes(index)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        downloadingFiles.includes(index)
                          ? 'bg-eok-600 text-white'
                          : 'bg-eok-600 text-white hover:bg-eok-700'
                      }`}
                    >
                      {downloadingFiles.includes(index) ? 'Laster ned...' : 'Last ned'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Klikk på et kart for å se tilgjengelige filer</p>
              </div>
            )}
          </div>

          {/* Download progress */}
          {downloadingFiles.length > 0 && (
            <div className="mt-3 bg-white px-3 py-2 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Download className="h-4 w-4 text-eok-600" />
                <span className="text-sm font-medium text-gray-700">
                  Laster ned {downloadingFiles.length} fil(er)...
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-eok-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ShareDemo = () => {
    const [selectedMap, setSelectedMap] = useState<number | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareLink, setShareLink] = useState('');
    
    const demoMaps = [
      {
        id: 1,
        name: "Oslo Sentrum",
        coordinates: [59.9139, 10.7522],
        files: ["oslo_sentrum.pdf", "oslo_satellitt.jpg"]
      },
      {
        id: 2,
        name: "Bergen Havn", 
        coordinates: [60.3913, 5.3221],
        files: ["bergen_havn.pdf", "bergen_topografi.tiff"]
      }
    ];

    const handleMapClick = (mapId: number) => {
      setSelectedMap(mapId);
      if (isAnimating) {
        setTimeout(() => {
          setShowShareModal(true);
          setShareLink(`https://kartarkiv.co/download/demo_${mapId}_${Date.now()}`);
        }, 1000);
      }
    };

    const handleShare = () => {
      if (isAnimating) {
        setShowShareModal(true);
        setShareLink(`https://kartarkiv.co/download/demo_${selectedMap}_${Date.now()}`);
        setTimeout(() => {
          setShowShareModal(false);
        }, 3000);
      }
    };

    return (
      <div className="relative bg-white rounded-lg border border-gray-300 overflow-hidden" style={{ height: '400px' }}>
        {/* Map view */}
        <div className="h-1/2">
          <MapContainer
            center={[59.9139, 10.7522]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {demoMaps.map((map) => (
              <Marker
                key={map.id}
                position={[map.coordinates[0], map.coordinates[1]]}
                eventHandlers={{
                  click: () => handleMapClick(map.id)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 mb-2">{map.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {map.files.length} filer tilgjengelig
                    </p>
                    <button 
                      onClick={() => handleShare()}
                      className="w-full px-3 py-1 bg-eok-600 text-white rounded text-xs font-medium hover:bg-eok-700"
                    >
                      Del kart
                    </button>
                    {isAnimating && (
                      <div className="mt-2 p-2 bg-eok-50 rounded text-xs text-eok-700">
                        Klikk for å dele dette kartet
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Share interface */}
        <div className="h-1/2 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Del kart</h3>
            {selectedMap && (
              <span className="text-sm text-gray-600">
                {demoMaps.find(m => m.id === selectedMap)?.name}
              </span>
            )}
          </div>

          {selectedMap ? (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-2">
                  Generer en engangs-lenke for å dele dette kartet
                </p>
                <button 
                  onClick={handleShare}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                    isAnimating 
                      ? 'bg-green-600 text-white' 
                      : 'bg-eok-600 text-white hover:bg-eok-700'
                  }`}
                >
                  {isAnimating ? 'Genererer lenke...' : 'Generer del-lenke'}
                </button>
              </div>

              {shareLink && (
                <div className="bg-white p-3 rounded-lg shadow-sm border border-eok-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Engangs-lenke (utløper om 5 timer)
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                    />
                    <button className="px-4 py-2 bg-eok-600 text-white rounded-md text-sm font-medium hover:bg-eok-700">
                      Kopier
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mt-2">
                    <Link className="h-3 w-3" />
                    <span>Lenken kan brukes kun én gang</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <Share2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Klikk på et kart for å dele det</p>
            </div>
          )}
        </div>

        {/* Share modal overlay */}
        {showShareModal && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Kart delt!</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Lenke generert!</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Engangs-lenke
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                    />
                    <button className="px-4 py-2 bg-eok-600 text-white rounded-md text-sm font-medium hover:bg-eok-700">
                      Kopier
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Link className="h-4 w-4" />
                  <span>Lenken utløper om 5 timer</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Progress bar */}
          <div className="bg-gray-200 h-2">
            <div 
              className="bg-eok-600 h-2 transition-all duration-300 ease-in-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-8 sm:p-12">
            {/* Step indicator */}
            <div className="flex justify-center mb-8">
              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index <= currentStep 
                        ? 'bg-eok-600' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                {currentStepData.icon}
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {currentStepData.title}
              </h1>
              
              <p className="text-lg text-gray-600 mb-8">
                {currentStepData.description}
              </p>

              {/* Interactive Demo */}
              {currentStepData.interactive && (
                <div className="mb-8">
                  <div className="mb-4 text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      {!completedSteps.includes(currentStep) 
                        ? "Klikk 'Prøv demo' for å se hvordan det fungerer i praksis"
                        : "Bra jobbet! Du har testet funksjonaliteten."
                      }
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    {currentStepData.demo === 'map' && <MapDemo />}
                    {currentStepData.demo === 'download' && <DownloadDemo />}
                    {currentStepData.demo === 'share' && <ShareDemo />}
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    {!completedSteps.includes(currentStep) && (
                      <button
                        onClick={handleTryDemo}
                        disabled={isAnimating}
                        className="px-6 py-2 bg-eok-600 text-white rounded-md hover:bg-eok-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {isAnimating ? 'Demo kjører...' : 'Prøv demo'}
                      </button>
                    )}
                    
                    {completedSteps.includes(currentStep) && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Demo fullført!</span>
                      </div>
                    )}
                    
                    {completedSteps.includes(currentStep) && (
                      <button
                        onClick={handleResetDemo}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Prøv igjen
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Feature list */}
              <div className="text-left max-w-2xl mx-auto">
                <ul className="space-y-3">
                  {currentStepData.details.map((detail, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-md transition-colors"
              >
                Hopp over
              </button>

              <div className="flex space-x-4">
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Tilbake
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  disabled={currentStepData.interactive && !completedSteps.includes(currentStep) && !isAnimating}
                  className="px-6 py-2 bg-eok-600 text-white rounded-md hover:bg-eok-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {currentStep === steps.length - 1 ? 'Kom i gang' : 'Neste'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Trenger du hjelp? Kontakt oss på{' '}
            <a 
              href="mailto:elias@kartarkiv.co" 
              className="text-eok-600 hover:text-eok-700"
            >
              elias@kartarkiv.co
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
