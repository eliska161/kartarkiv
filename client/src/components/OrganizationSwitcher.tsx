import React, { useMemo, useState } from 'react';
import { useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { ChevronsUpDown, RefreshCw } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

interface OrganizationSwitcherProps {
  allowPlatform: boolean;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({ allowPlatform }) => {
  const { organization } = useOrganization();
  const { userMemberships, isLoaded, setActive } = useOrganizationList({ userMemberships: true });
  const { setClubSlug, setOrganizationId } = useTenant();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberships = useMemo(() => (Array.isArray(userMemberships?.data) ? userMemberships.data : []), [userMemberships]);
  const activeId = organization?.id || null;

  const hasMultipleOptions = allowPlatform ? memberships.length > 0 : memberships.length > 1;

  if (!isLoaded || !hasMultipleOptions) {
    return null;
  }

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    setError(null);

    try {
      setIsSwitching(true);
      if (nextId === '__platform__') {
        await setActive({ organization: null });
        setOrganizationId(null);
        setClubSlug(null);
        return;
      }

      const membership = memberships.find(item => item.organization?.id === nextId || item.id === nextId);
      if (!membership) {
        setError('Fant ikke valgt organisasjon.');
        return;
      }

      await setActive({ organization: membership.organization });
      setOrganizationId(membership.organization?.id || null);
      setClubSlug(membership.organization?.slug || null);
    } catch (switchError) {
      console.error('Kunne ikke bytte organisasjon:', switchError);
      setError('Kunne ikke bytte klubb. Prøv igjen senere.');
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="flex flex-col items-end">
      <label className="sr-only" htmlFor="organization-switcher">Bytt klubb</label>
      <div className="relative">
        <select
          id="organization-switcher"
          className="appearance-none border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          value={activeId ?? '__platform__'}
          onChange={handleChange}
          disabled={isSwitching}
        >
          {allowPlatform && (
            <option value="__platform__">Plattform (global)</option>
          )}
          {memberships.map(membership => (
            <option key={membership.id} value={membership.organization?.id || membership.id}>
              {membership.organization?.name || membership.organization?.slug || membership.id}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute inset-y-0 right-2 h-4 w-4 text-gray-400" />
        {isSwitching && (
          <RefreshCw className="absolute inset-y-0 right-6 my-auto h-4 w-4 animate-spin text-brand-500" />
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default OrganizationSwitcher;
