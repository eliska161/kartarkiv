import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser, useOrganizationList, useOrganization } from '@clerk/clerk-react';
import { Building2, ArrowRight, ShieldAlert } from 'lucide-react';
import KartarkivLogo from '../components/KartarkivLogo';
import { useTenant } from '../contexts/TenantContext';

interface LocationState {
  from?: string;
}

const SelectClubPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships, isLoaded, setActive } = useOrganizationList({ userMemberships: true });
  const { setClubSlug, setOrganizationId } = useTenant();
  const [error, setError] = useState<string | null>(null);

  const metadata = useMemo(() => (user?.publicMetadata || {}) as { isAdmin?: boolean; isSuperAdmin?: boolean; roles?: any[] }, [user]);
  const roles = useMemo(() => (Array.isArray(metadata.roles) ? metadata.roles.map(role => String(role).toLowerCase()) : []), [metadata.roles]);
  const isSuperAdmin = roles.includes('superadmin') || Boolean(metadata.isSuperAdmin);
  const isWebmaster = roles.includes('webmaster') || isSuperAdmin;

  const target = (location.state as LocationState | null)?.from || (isWebmaster ? '/webmaster' : '/kart');
  const memberships = useMemo(() => (Array.isArray(userMemberships?.data) ? userMemberships.data : []), [userMemberships]);

  useEffect(() => {
    if (organization) {
      setOrganizationId(organization.id);
      setClubSlug(organization.slug || null);
      navigate(target, { replace: true });
    }
  }, [organization, navigate, target, setClubSlug, setOrganizationId]);

  const handleSelect = async (membershipId: string) => {
    if (!isLoaded) {
      return;
    }

    setError(null);
    const membership = memberships.find(item => item.id === membershipId);
    if (!membership) {
      setError('Fant ikke klubbmedlemskap. Oppdater siden og prøv igjen.');
      return;
    }

    try {
      await setActive({ organization: membership.organization });
      setOrganizationId(membership.organization?.id || null);
      setClubSlug(membership.organization?.slug || null);
      navigate(target, { replace: true });
    } catch (activationError) {
      console.error('Kunne ikke bytte til valgt klubb:', activationError);
      setError('Kunne ikke aktivere klubben. Prøv igjen senere.');
    }
  };

  const handleContinueWithoutClub = async () => {
    try {
      await setActive({ organization: null });
      setOrganizationId(null);
      setClubSlug(null);
      navigate(target, { replace: true });
    } catch (error) {
      console.error('Kunne ikke velge plattformvisning:', error);
      setError('Kunne ikke velge plattformvisning. Prøv igjen senere.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="py-10 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <KartarkivLogo />
          </div>
          <div className="mt-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Velg klubbarkiv</h1>
            <p className="mt-2 text-gray-600">Logg inn i klubbens kartarkiv eller fortsett til plattformadministrasjonen.</p>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ShieldAlert className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Kunne ikke bytte klubb</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-6">
            {!isLoaded && (
              <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
                  <p className="mt-4 text-gray-500 text-sm">Laster klubber...</p>
                </div>
              </div>
            )}

            {isLoaded && memberships.length === 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-6 w-6 text-amber-500 flex-shrink-0" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Ingen klubber funnet</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Du er ikke medlem av noen klubb enda. Be en klubbadministrator invitere deg via Clerk, eller kontakt
                      supporten dersom dette er en feil.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLoaded && memberships.map(membership => (
              <button
                key={membership.id}
                type="button"
                onClick={() => handleSelect(membership.id)}
                className="bg-white shadow rounded-lg p-6 text-left transition border border-transparent hover:border-brand-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{membership.organization?.name}</h2>
                        <p className="text-sm text-gray-500">{membership.organization?.slug}.kartarkiv.co</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Rolle: {membership.role === 'admin' ? 'Klubbadministrator' : membership.role === 'owner' ? 'Eier' : membership.role}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {isWebmaster && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={handleContinueWithoutClub}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                Fortsett til plattformadministrasjonen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectClubPage;
