import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, HardDrive, RefreshCcw, Cloud } from 'lucide-react';

import { apiGet } from '../../utils/apiClient';

interface MapUsage {
  mapId: number;
  name: string;
  bytes: number;
  fileCount: number;
}

interface StorageUsageResponse {
  bucket: string;
  totalBytes: number;
  objectCount: number;
  backblazeConfigured: boolean;
  backblazeStatus: string;
  maps: MapUsage[];
  storageCostNok: number;
  basePriceNok: number;
  estimatedMonthlyNok: number;
  generatedAt?: string;
}

const numberFormatter = new Intl.NumberFormat('nb-NO');
const currencyFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const decimalCurrencyFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatBytes = (bytes: number) => {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const decimals = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[index]}`;
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) {
    return 'Aldri';
  }

  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('nb-NO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    return 'Ukjent';
  }
};

const StorageOverview: React.FC = () => {
  const [data, setData] = useState<StorageUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiGet('/api/storage/usage');
      setData(response.data as StorageUsageResponse);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch storage usage', err);
      setError('Kunne ikke hente lagringsdata akkurat nå.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const totalGigabytes = useMemo(() => {
    if (!data) {
      return 0;
    }
    return data.totalBytes / 1024 ** 3;
  }, [data]);

  const formattedTotalGb = useMemo(() => {
    if (!data) {
      return '0 GB';
    }

    const precision = totalGigabytes >= 10 ? 1 : 2;
    return `${totalGigabytes.toFixed(precision)} GB`;
  }, [data, totalGigabytes]);

  const storageCostDisplay = useMemo(() => {
    if (!data) {
      return decimalCurrencyFormatter.format(0);
    }
    return decimalCurrencyFormatter.format(data.storageCostNok);
  }, [data]);

  const estimatedMonthlyDisplay = useMemo(() => {
    if (!data) {
      return currencyFormatter.format(49);
    }
    return decimalCurrencyFormatter.format(data.estimatedMonthlyNok);
  }, [data]);

  const handleRefresh = () => fetchUsage({ silent: true });

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lagring</h2>
          <p className="text-sm text-gray-600">
            Oversikt over Backblaze B2-bruk og kostnadsestimat. Sist oppdatert: {formatTimestamp(data?.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            data?.backblazeConfigured
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            <Cloud className="h-4 w-4 mr-2" />
            {data?.backblazeStatus || 'Tilstand ukjent'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-eok-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Oppdater
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start">
          <AlertCircle className="h-5 w-5 mr-3 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total lagring</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formattedTotalGb}</p>
              <p className="mt-1 text-sm text-gray-500">
                {data ? `${numberFormatter.format(data.objectCount)} filer i ${data.bucket}` : '...'}
              </p>
            </div>
            <div className="rounded-full bg-eok-100 p-3 text-eok-600">
              <HardDrive className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-600">Estimert månedspris</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{estimatedMonthlyDisplay}</p>
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            <p>Grunnpris: {data ? currencyFormatter.format(data.basePriceNok) : currencyFormatter.format(49)}</p>
            <p>Lagring (1 kr/GB): {storageCostDisplay}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-600">Status</p>
          <p className="mt-2 text-base text-gray-900">{data?.backblazeStatus || 'Ingen tilkoblingsdata tilgjengelig'}</p>
          <p className="mt-3 text-sm text-gray-500">
            Denne statusen oppdateres når dataene hentes fra Backblaze.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Lagring per kart</h3>
          {loading && <span className="text-sm text-gray-500">Laster data ...</span>}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Kart
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Filer
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Lagringsbruk
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data && data.maps.length > 0 ? (
                data.maps.map((map) => (
                  <tr key={map.mapId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{map.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{numberFormatter.format(map.fileCount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatBytes(map.bytes)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                    {loading ? 'Henter oversikt ...' : 'Ingen kart med lagrede filer ennå.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StorageOverview;
