import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Download, Share2, ArrowRight, CheckCircle, Search, Eye, MousePointer, ZoomIn, ZoomOut, FileText, Link, Play, Pause, RotateCcw } from 'lucide-react';

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
  const MapDemo = () => (
    <div className="relative bg-gray-100 rounded-lg p-6 h-64 border-2 border-dashed border-gray-300">
      <div className="absolute top-4 left-4 flex space-x-2">
        <div className="bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 shadow-sm">
          <Search className="h-4 w-4 inline mr-1" />
          Søk kart...
        </div>
      </div>
      
      <div className="absolute top-4 right-4 flex space-x-2">
        <button className={`p-2 rounded-full bg-white shadow-sm transition-all ${isAnimating ? 'bg-eok-100 text-eok-600' : 'text-gray-600'}`}>
          <ZoomIn className="h-4 w-4" />
        </button>
        <button className={`p-2 rounded-full bg-white shadow-sm transition-all ${isAnimating ? 'bg-eok-100 text-eok-600' : 'text-gray-600'}`}>
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Simulated map markers */}
      <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
        <div className={`w-6 h-6 bg-eok-600 rounded-full border-2 border-white shadow-lg transition-all duration-1000 ${isAnimating ? 'scale-150 bg-eok-500' : ''}`}>
          <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        {isAnimating && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-lg shadow-lg text-sm font-medium text-gray-700 animate-pulse">
            Klikk for detaljer
          </div>
        )}
      </div>

      <div className="absolute top-1/3 right-1/3">
        <div className={`w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg transition-all duration-1000 ${isAnimating ? 'scale-125 bg-blue-400' : ''}`}>
          <div className="w-1 h-1 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      <div className="absolute bottom-1/4 left-1/3">
        <div className={`w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg transition-all duration-1000 ${isAnimating ? 'scale-125 bg-green-400' : ''}`}>
          <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      {/* Cursor animation */}
      {isAnimating && (
        <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 animate-ping">
          <MousePointer className="h-6 w-6 text-eok-600" />
        </div>
      )}
    </div>
  );

  const DownloadDemo = () => (
    <div className="relative bg-gray-100 rounded-lg p-6 h-64 border-2 border-dashed border-gray-300">
      <div className="absolute top-4 left-4">
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Kartfiler</span>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="absolute top-16 left-4 right-4 space-y-2">
        {['kart_2024.pdf', 'satelitt_bilde.jpg', 'topografi.tiff'].map((file, index) => (
          <div 
            key={file}
            className={`bg-white px-4 py-3 rounded-lg shadow-sm transition-all duration-500 ${
              isAnimating && index < 2 ? 'bg-eok-50 border-2 border-eok-200' : ''
            }`}
            style={{ 
              transitionDelay: `${index * 200}ms`,
              transform: isAnimating && index < 2 ? 'translateX(10px)' : 'translateX(0)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{file}</span>
              </div>
              <button className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                isAnimating && index < 2 
                  ? 'bg-eok-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}>
                {isAnimating && index < 2 ? 'Laster ned...' : 'Last ned'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Download progress */}
      {isAnimating && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white px-4 py-3 rounded-lg shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Download className="h-4 w-4 text-eok-600" />
              <span className="text-sm font-medium text-gray-700">Laster ned filer...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-eok-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ShareDemo = () => (
    <div className="relative bg-gray-100 rounded-lg p-6 h-64 border-2 border-dashed border-gray-300">
      <div className="absolute top-4 left-4">
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <Share2 className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Del kart</span>
          </div>
        </div>
      </div>

      {/* Share modal simulation */}
      {isAnimating && (
        <div className="absolute inset-4 bg-white rounded-lg shadow-xl border-2 border-eok-200 animate-pulse">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Del kart</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <Pause className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engangs-lenke (utløper om 5 timer)
                </label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value="https://kartarkiv.co/download/abc123..." 
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
                <span>Lenken kan brukes kun én gang</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share button */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <button 
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            isAnimating 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-eok-600 text-white hover:bg-eok-700'
          }`}
        >
          {isAnimating ? 'Delt!' : 'Del kart'}
        </button>
      </div>
    </div>
  );

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
