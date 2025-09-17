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
  responseTime?: string;
  details?: string;
}

interface HealthCheckData {
  timestamp: string;
  status: 'healthy' | 'unhealthy';
  services: {
    database?: {
      status: 'healthy' | 'unhealthy';
      responseTime: string;
      details: string;
    };
    fileStorage?: {
      status: 'healthy' | 'unhealthy';
      responseTime: string;
      details: string;
    };
    clerkAuth?: {
      status: 'healthy' | 'unhealthy';
      responseTime: string;
      details: string;
    };
    mapRendering?: {
      status: 'healthy' | 'unhealthy';
      responseTime: string;
      details: string;
    };
  };
}

const UptimeStatus: React.FC<UptimeStatusProps> = ({ className = '', showDetails = true }) => {
  const [status, setStatus] = useState<MonitorStatus[]>([]);
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        
        // Fetch health check data from our API
        const healthResponse = await fetch('https://kartarkiv-production.up.railway.app/api/health');
        if (healthResponse.ok) {
          const healthData: HealthCheckData = await healthResponse.json();
          setHealthData(healthData);
          
          // Convert health data to monitor status format
          const monitors: MonitorStatus[] = [];
          
          if (healthData.services.database) {
            monitors.push({
              id: 'database',
              name: 'Database',
              status: healthData.services.database.status === 'healthy' ? 'up' : 'down',
              uptime: healthData.services.database.status === 'healthy' ? 99.9 : 0,
              lastCheck: healthData.timestamp,
              responseTime: healthData.services.database.responseTime,
              details: healthData.services.database.details
            });
          }
          
          if (healthData.services.fileStorage) {
            monitors.push({
              id: 'files',
              name: 'Fil-lagring',
              status: healthData.services.fileStorage.status === 'healthy' ? 'up' : 'down',
              uptime: healthData.services.fileStorage.status === 'healthy' ? 99.9 : 0,
              lastCheck: healthData.timestamp,
              responseTime: healthData.services.fileStorage.responseTime,
              details: healthData.services.fileStorage.details
            });
          }
          
          if (healthData.services.clerkAuth) {
            monitors.push({
              id: 'auth',
              name: 'Autentisering',
              status: healthData.services.clerkAuth.status === 'healthy' ? 'up' : 'down',
              uptime: healthData.services.clerkAuth.status === 'healthy' ? 99.9 : 0,
              lastCheck: healthData.timestamp,
              responseTime: healthData.services.clerkAuth.responseTime,
              details: healthData.services.clerkAuth.details
            });
          }
          
          if (healthData.services.mapRendering) {
            monitors.push({
              id: 'maps',
              name: 'Kart-rendering',
              status: healthData.services.mapRendering.status === 'healthy' ? 'up' : 'down',
              uptime: healthData.services.mapRendering.status === 'healthy' ? 99.9 : 0,
              lastCheck: healthData.timestamp,
              responseTime: healthData.services.mapRendering.responseTime,
              details: healthData.services.mapRendering.details
            });
          }
          
          setStatus(monitors);
          setError(null);
        } else {
          throw new Error(`Health check failed: ${healthResponse.status}`);
        }
        
        // Also try to fetch UptimeRobot data if API key is available
        const apiKey = process.env.REACT_APP_UPTIMEROBOT_API_KEY;
        if (apiKey) {
          try {
            const uptimeResponse = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                api_key: apiKey,
                format: 'json'
              })
            });

            if (uptimeResponse.ok) {
              const uptimeData = await uptimeResponse.json();
              
              if (uptimeData.stat === 'ok') {
                const uptimeMonitors: MonitorStatus[] = uptimeData.monitors.map((monitor: any) => {
                  let lastCheck = new Date().toISOString();
                  if (monitor.datetime && !isNaN(monitor.datetime)) {
                    const date = new Date(monitor.datetime * 1000);
                    if (!isNaN(date.getTime())) {
                      lastCheck = date.toISOString();
                    }
                  }
                  
                  return {
                    id: `uptime-${monitor.id}`,
                    name: monitor.friendly_name,
                    status: monitor.status === 2 ? 'up' : monitor.status === 9 ? 'down' : 'paused',
                    uptime: parseFloat(monitor.custom_uptime_ratio) || 0,
                    lastCheck: lastCheck
                  };
                });
                
                // Add UptimeRobot monitors to existing status
                setStatus(prev => [...prev, ...uptimeMonitors]);
              }
            }
          } catch (uptimeErr) {
            console.warn('UptimeRobot data not available:', uptimeErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
        setError('Kunne ikke hente status');
        
        // Fallback to mock data on error
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
              <div>
                <span className="text-sm text-gray-700">{monitor.name}</span>
                {showDetails && monitor.details && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {monitor.details}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(monitor.status)}`}>
                {getStatusText(monitor.status)}
              </span>
              {showDetails && monitor.responseTime && (
                <span className="text-xs text-gray-500">
                  {monitor.responseTime}
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
            href="https://stats.uptimerobot.com/jcONK7VXFW" 
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
