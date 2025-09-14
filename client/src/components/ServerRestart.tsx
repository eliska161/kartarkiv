import React, { useState } from 'react';
import { RefreshCw, Server, Activity, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { apiPost, apiGet } from '../utils/apiClient';

interface ServerStatus {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: string;
}

const ServerRestart: React.FC = () => {
  const [isRestarting, setIsRestarting] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [lastRestart, setLastRestart] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirmation();

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}t ${minutes}m`;
    if (hours > 0) return `${hours}t ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const fetchServerStatus = async () => {
    try {
      const response = await apiGet('/api/restart/status');
      setServerStatus(response.data);
    } catch (error) {
      console.error('Error fetching server status:', error);
    }
  };

  const handleRestart = async () => {
    const confirmed = await confirm({
      title: 'Restart Server',
      message: 'Er du sikker på at du vil restarte serveren? Dette vil midlertidig stoppe tjenesten.',
      confirmText: 'Restart',
      cancelText: 'Avbryt',
      type: 'warning'
    });

    if (!confirmed) return;

    setIsRestarting(true);
    setLastRestart(new Date().toLocaleString('nb-NO'));

    try {
      const response = await apiPost('/api/restart/restart');
      
      showSuccess('Server restart initiated! Serveren vil starte på nytt om et øyeblikk.');
      
      // Show countdown
      let countdown = 10;
      const countdownInterval = setInterval(() => {
        if (countdown > 0) {
          showSuccess(`Server restarting in ${countdown} seconds...`);
          countdown--;
        } else {
          clearInterval(countdownInterval);
          setIsRestarting(false);
          // Refresh status after restart
          setTimeout(() => {
            fetchServerStatus();
          }, 5000);
        }
      }, 1000);

    } catch (error) {
      console.error('Error restarting server:', error);
      showError('Failed to restart server. Please try again.');
      setIsRestarting(false);
    }
  };

  // Fetch status on component mount
  React.useEffect(() => {
    fetchServerStatus();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Server className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Server Management</h2>
        </div>
        <button
          onClick={fetchServerStatus}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="Refresh Status"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Server Status */}
      {serverStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Status</span>
            </div>
            <p className="text-green-700 mt-1 capitalize">{serverStatus.status}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Uptime</span>
            </div>
            <p className="text-blue-700 mt-1">{formatUptime(serverStatus.uptime)}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-800">Memory</span>
            </div>
            <p className="text-purple-700 mt-1">{formatMemory(serverStatus.memory.heapUsed)}</p>
          </div>
        </div>
      )}

      {/* Restart Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Restart Server</h3>
            <p className="text-sm text-gray-600 mt-1">
              Restart serveren for å oppdatere kode eller løse problemer
            </p>
            {lastRestart && (
              <p className="text-xs text-gray-500 mt-1">
                Sist restartet: {lastRestart}
              </p>
            )}
          </div>
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isRestarting
                ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isRestarting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Restarting...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Restart Server</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerRestart;
