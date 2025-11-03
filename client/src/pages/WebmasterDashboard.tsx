import React from 'react';
import Header from '../components/Header';
import AnnouncementManagement from '../components/AnnouncementManagement';
import ApiLogs from '../components/ApiLogs';
import ServerRestart from '../components/ServerRestart';
import PaymentManagement from '../components/PaymentManagement';
import { useTenant } from '../contexts/TenantContext';
import { Shield, Megaphone, Server, Activity, CreditCard } from 'lucide-react';

const WebmasterDashboard: React.FC = () => {
  const { clubSlug, isDefaultTenant } = useTenant();
  const isViewingClubTenant = !isDefaultTenant && !!clubSlug;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header />
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-brand-600" />
                Webmaster kontrollsenter
              </h1>
              <p className="text-gray-600">
                Overvåk plattformstatus, send kunngjøringer og håndter klubbfakturering.
              </p>
              {isViewingClubTenant && (
                <p className="mt-2 text-sm text-amber-600">
                  Du ser kontrollpanelet fra klubbdomenet <strong>{clubSlug}</strong>. Plattformhandlinger gjelder alle klubber.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="card bg-white">
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-brand-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Kunngjøringer</h2>
                <p className="text-sm text-gray-500">Send meldinger som vises på tvers av alle klubber og brukere.</p>
              </div>
            </div>
            <div className="mt-6">
              <AnnouncementManagement />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900">API-logger</h2>
            </div>
            <ApiLogs />
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Server className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900">Serveradministrasjon</h2>
            </div>
            <ServerRestart />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Fakturering for klubber</h2>
              <p className="text-sm text-gray-500">Opprett og send fakturaer på vegne av klubber. Flere klubbvalg kommer snart.</p>
            </div>
          </div>
          <PaymentManagement isSuperAdmin={true} />
        </div>
      </div>
    </div>
  );
};

export default WebmasterDashboard;
