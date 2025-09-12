import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Filter, Search, Clock, Globe, Database, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

interface ApiLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  status: number;
  responseTime: number;
  userAgent: string;
  ip: string;
  userId?: string;
  error?: string;
}

const ApiLogs: React.FC = () => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for demonstration - in real app, this would come from backend
  const mockLogs: ApiLog[] = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: '/api/maps',
      status: 200,
      responseTime: 145,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip: '192.168.1.100',
      userId: 'user_123'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      method: 'POST',
      url: '/api/maps',
      status: 201,
      responseTime: 234,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip: '192.168.1.100',
      userId: 'user_123'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      method: 'GET',
      url: '/api/admin/users',
      status: 401,
      responseTime: 89,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip: '192.168.1.100',
      error: 'Token expired'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      method: 'DELETE',
      url: '/api/maps/123',
      status: 200,
      responseTime: 156,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip: '192.168.1.100',
      userId: 'user_456'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      method: 'PUT',
      url: '/api/maps/123',
      status: 500,
      responseTime: 1200,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip: '192.168.1.100',
      userId: 'user_123',
      error: 'Internal server error'
    }
  ];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status >= 400 && status < 500) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    } else if (status >= 500) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Info className="h-4 w-4 text-gray-500" />;
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'text-green-600 bg-green-100';
    } else if (status >= 400 && status < 500) {
      return 'text-yellow-600 bg-yellow-100';
    } else if (status >= 500) {
      return 'text-red-600 bg-red-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'text-blue-600 bg-blue-100';
      case 'POST':
        return 'text-green-600 bg-green-100';
      case 'PUT':
        return 'text-yellow-600 bg-yellow-100';
      case 'DELETE':
        return 'text-red-600 bg-red-100';
      case 'PATCH':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.userId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'all' || log.method === methodFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'success' && log.status >= 200 && log.status < 300) ||
                         (statusFilter === 'client-error' && log.status >= 400 && log.status < 500) ||
                         (statusFilter === 'server-error' && log.status >= 500);
    
    return matchesSearch && matchesMethod && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eok-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-eok-500" />
          <h2 className="text-2xl font-bold text-gray-900">API Logs</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-eok-500 text-white rounded-lg hover:bg-eok-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Oppdater</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Søk i logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
            />
          </div>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
          >
            <option value="all">Alle metoder</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
          >
            <option value="all">Alle statuser</option>
            <option value="success">Suksess (2xx)</option>
            <option value="client-error">Klient feil (4xx)</option>
            <option value="server-error">Server feil (5xx)</option>
          </select>

          {/* Stats */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Database className="h-4 w-4" />
            <span>{filteredLogs.length} logs</span>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bruker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodColor(log.method)}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-mono">
                      {log.url}
                    </div>
                    {log.error && (
                      <div className="text-xs text-red-600 mt-1">
                        {log.error}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(log.timestamp).toLocaleString('no-NO')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.userId ? (
                      <span className="font-mono">{log.userId}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Globe className="h-3 w-3" />
                      <span className="font-mono">{log.ip}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`font-mono ${log.responseTime > 1000 ? 'text-red-600' : log.responseTime > 500 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {log.responseTime}ms
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen logs funnet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Prøv å endre søkekriteriene eller oppdater siden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiLogs;
