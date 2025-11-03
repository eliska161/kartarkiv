import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { useTenant } from '../contexts/TenantContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireOrganization = true }) => {
  const location = useLocation();
  const { isSignedIn, isLoaded, user } = useUser();
  const { organization, isLoaded: organizationLoaded } = useOrganization();
  const { userMemberships, isLoaded: membershipsLoaded, setActive } = useOrganizationList({ userMemberships: true });
  const { clubSlug, isDefaultTenant, setClubSlug, setOrganizationId } = useTenant();
  const [activatingOrganizationId, setActivatingOrganizationId] = useState<string | null>(null);

  const metadata = useMemo(() => (user?.publicMetadata || {}) as { isAdmin?: boolean; isSuperAdmin?: boolean; roles?: any[] }, [user]);
  const roles = useMemo(() => (Array.isArray(metadata.roles) ? metadata.roles.map(role => String(role).toLowerCase()) : []), [metadata.roles]);
  const isSuperAdmin = roles.includes('superadmin') || Boolean(metadata.isSuperAdmin);
  const isWebmaster = roles.includes('webmaster') || isSuperAdmin;

  useEffect(() => {
    if (organization) {
      setOrganizationId(organization.id);
      setClubSlug(organization.slug || null);
    } else if (!organization && !activatingOrganizationId && !requireOrganization) {
      setOrganizationId(null);
    }
  }, [organization, activatingOrganizationId, requireOrganization, setClubSlug, setOrganizationId]);

  useEffect(() => {
    if (!requireOrganization || !membershipsLoaded || !isSignedIn || organization || activatingOrganizationId) {
      return;
    }

    const memberships = Array.isArray(userMemberships?.data) ? userMemberships.data : [];

    if (!isDefaultTenant && clubSlug) {
      const matchingMembership = memberships.find(membership => membership.organization?.slug === clubSlug);
      if (matchingMembership) {
        setActivatingOrganizationId(matchingMembership.organization?.id || matchingMembership.id || null);
        setActive({ organization: matchingMembership.organization })
          .catch(error => {
            console.error('Failed to activate organization based on subdomain:', error);
          })
          .finally(() => {
            setActivatingOrganizationId(null);
          });
        return;
      }
    }

    if (memberships.length === 1) {
      const soleMembership = memberships[0];
      setActivatingOrganizationId(soleMembership.organization?.id || soleMembership.id || null);
      setActive({ organization: soleMembership.organization })
        .catch(error => {
          console.error('Failed to activate sole organization membership:', error);
        })
        .finally(() => {
          setActivatingOrganizationId(null);
        });
    }
  }, [requireOrganization, membershipsLoaded, isSignedIn, organization, activatingOrganizationId, userMemberships, clubSlug, isDefaultTenant, setActive]);

  if (!isLoaded || !organizationLoaded || (requireOrganization && !membershipsLoaded)) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!requireOrganization) {
    return <>{children}</>;
  }

  const memberships = Array.isArray(userMemberships?.data) ? userMemberships.data : [];

  if (activatingOrganizationId) {
    return <LoadingScreen />;
  }

  if (!organization) {
    if (memberships.length === 0) {
      if (isWebmaster) {
        return <>{children}</>;
      }
      return <Navigate to="/select-club" replace state={{ from: location.pathname }} />;
    }

    return <Navigate to="/select-club" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
