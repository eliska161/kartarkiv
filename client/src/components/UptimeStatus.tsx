import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface UptimeStatusProps {
  className?: string;
  showDetails?: boolean;
}

interface MonitorStatus {
  id: string;
  name: string;
  status: 'up' | 'down' | 'paused' | 'unknown';
  uptime: number;
  lastCheck: string;
}

const UptimeStatus: React.FC<UptimeStatusProps> = ({ className = '', showDetails = true }) => {
  const [status, setStatus] = useState<MonitorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate UptimeRobot API call (you'll need to replace with actual API)
    const fetchStatus = async () => {
      try {
        setLoading(true);
        
        // Mock data - replace with actual UptimeRobot API call
        const mockStatus: MonitorStatus[] = [
          {
            id: '1',
            name: 'Kartarkiv API',
            status: 'up',
            uptime: 99.9,
            lastCheck: new Date().toISOString()
          },
          {
            id: '2', 
            name: 'Kartarkiv Frontend',
            status: 'up',
            uptime: 99.8,
            lastCheck: new Date().toISOString()
          }
        ];
        
        setStatus(mockStatus);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch uptime status:', err);
        setError('Kunne ikke hente status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'up':
        return 'Operativ';
      case 'down':
        return 'Nede';
      case 'paused':
        return 'Pauset';
      default:
        return 'Ukjent';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gray-400 animate-pulse" />
          <span className="text-sm text-gray-600">Henter status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Activity className="h-5 w-5 text-eok-600" />
        <h3 className="text-sm font-medium text-gray-900">Systemstatus</h3>
      </div>
      
      <div className="space-y-2">
        {status.map((monitor) => (
          <div key={monitor.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(monitor.status)}
              <span className="text-sm text-gray-700">{monitor.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(monitor.status)}`}>
                {getStatusText(monitor.status)}
              </span>
              {showDetails && (
                <span className="text-xs text-gray-500">
                  {monitor.uptime}% uptime
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Sist oppdatert: {new Date().toLocaleTimeString('nb-NO')}
        </p>
        <p className="text-xs text-gray-500">
          <a 
            href="https://stats.uptimerobot.com/your-status-page" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-eok-600 hover:text-eok-700"
          >
            Se full status side →
          </a>
        </p>
      </div>
    </div>
  );
};

export default UptimeStatus;
