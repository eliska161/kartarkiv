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

const UptimeStatus: React.FC<UptimeStatusProps> = ({ className = '', showDetails = true }) => {
  const [status, setStatus] = useState<MonitorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const normalizeStatus = (rawStatus: string | undefined): MonitorStatus['status'] => {
    if (!rawStatus) {
      return 'unknown';
    }

    switch (rawStatus.toLowerCase()) {
      case 'up':
      case 'available':
        return 'up';
      case 'down':
      case 'critical':
        return 'down';
      case 'paused':
      case 'maintenance':
      case 'under_maintenance':
      case 'degraded':
        return 'paused';
      default:
        return 'unknown';
    }
  };

  const parseTimestamp = (value: unknown): string => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value * (value < 1e12 ? 1000 : 1));
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return new Date().toISOString();
  };

  const toNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        
        // Fetch monitor data through the backend proxy to avoid CORS issues
        const response = await fetch('/api/monitoring/monitors', {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.data)) {
          throw new Error('Invalid response from Better Stack API');
        }

        const monitors: MonitorStatus[] = data.data.map((monitor: any) => {
          const attributes = monitor?.attributes || {};

          const monitorName =
            attributes.name ||
            attributes.url ||
            monitor?.name ||
            `Monitor ${monitor?.id ?? ''}`;

          const uptimeValue =
            attributes.uptime_percentage ??
            attributes.uptime ??
            attributes.sla ??
            attributes.sla_percentage ??
            attributes.custom_uptime_ratio;

          const responseTimeValue =
            attributes.response_time ??
            attributes.last_response_time ??
            attributes.average_response_time ??
            attributes.avg_response_time;

          const details =
            attributes.incident_note ||
            attributes.status_description ||
            attributes.last_incident_note ||
            attributes.paused_note;

          const lastCheck = parseTimestamp(
            attributes.last_checked_at ??
              attributes.last_status_change_at ??
              attributes.created_at ??
              attributes.updated_at ??
              monitor?.lastCheckedAt ??
              monitor?.last_status_change_at
          );

          return {
            id: String(monitor?.id ?? monitorName),
            name: monitorName,
            status: normalizeStatus(attributes.status ?? monitor?.status),
            uptime: Number(toNumber(uptimeValue).toFixed(2)),
            lastCheck,
            responseTime: responseTimeValue ? `${Math.round(toNumber(responseTimeValue))} ms` : undefined,
            details: typeof details === 'string' ? details : undefined
          };
        });

        setStatus(monitors);
        setError(null);
        setLastUpdated(new Date());
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
        setLastUpdated(new Date());
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
        <Activity className="h-5 w-5 text-brand-600" />
        <h3 className="text-sm font-medium text-gray-900">Systemstatus</h3>
      </div>
      
      <div className="space-y-3">
        {status.map((monitor) => (
          <div key={monitor.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(monitor.status)}
                <span className="text-sm text-gray-700">{monitor.name}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(monitor.status)}`}>
                {getStatusText(monitor.status)}
              </span>
            </div>
            {showDetails && (
              <div className="mt-1 pl-6 grid gap-x-4 gap-y-1 text-xs text-gray-500 sm:grid-cols-2">
                <span>Oppetid: {monitor.uptime}%</span>
                {monitor.responseTime && <span>Responstid: {monitor.responseTime}</span>}
                {monitor.lastCheck && (
                  <span>
                    Sist sjekket:{' '}
                    {new Date(monitor.lastCheck).toLocaleTimeString('nb-NO')}
                  </span>
                )}
                {monitor.details && (
                  <span className="sm:col-span-2 text-gray-400">{monitor.details}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Sist oppdatert:{' '}
          {lastUpdated ? lastUpdated.toLocaleTimeString('nb-NO') : 'ukjent'}
        </p>
        <p className="text-xs text-gray-500">
          <a
            href="https://status.kartarkiv.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:text-brand-700"
          >
            Se full status side →
          </a>
        </p>
      </div>
    </div>
  );
};

export default UptimeStatus;
