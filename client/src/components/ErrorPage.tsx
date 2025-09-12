import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UptimeStatus from './UptimeStatus';

interface ErrorPageProps {
  title?: string;
  message?: string;
  showUptimeStatus?: boolean;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  title = 'Noe gikk galt',
  message = 'Det oppstod en uventet feil. Vennligst prøv igjen.',
  showUptimeStatus = true,
  onRetry,
  showHomeButton = true
}) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl w-full">
        <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-8 text-lg">{message}</p>
        
        {/* UptimeRobot Status */}
        {showUptimeStatus && (
          <div className="mb-8">
            <UptimeStatus showDetails={true} />
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <button
              onClick={handleRetry}
              className="bg-eok-600 text-white px-6 py-3 rounded-lg hover:bg-eok-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Prøv igjen</span>
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Oppdater siden</span>
          </button>
          
          {showHomeButton && (
            <button
              onClick={handleGoHome}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Tilbake til hjem</span>
            </button>
          )}
        </div>
        
        {/* Help Text */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Hvis problemet vedvarer, kan det være en midlertidig serverfeil.</p>
          <p>Sjekk statusen ovenfor eller prøv igjen om noen minutter.</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
