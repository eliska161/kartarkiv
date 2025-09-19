import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Download, Share2, ArrowRight, CheckCircle, Search, Eye } from 'lucide-react';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

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
      ]
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
      ]
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
      ]
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
      ]
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/');
    }
  };

  const handleSkip = () => {
    navigate('/');
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
                  className="px-6 py-2 bg-eok-600 text-white rounded-md hover:bg-eok-700 transition-colors flex items-center"
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
