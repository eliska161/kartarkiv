import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

interface WebmasterRouteProps {
  children: React.ReactNode;
}

const WebmasterRoute: React.FC<WebmasterRouteProps> = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  const metadata = (user?.publicMetadata || {}) as { isAdmin?: boolean; isSuperAdmin?: boolean; roles?: any[] };
  const roles = Array.isArray(metadata.roles)
    ? metadata.roles.map(role => String(role).toLowerCase())
    : [];

  const isSuperAdmin = roles.includes('superadmin') || Boolean(metadata.isSuperAdmin);
  const isWebmaster = roles.includes('webmaster') || isSuperAdmin;

  if (!isWebmaster) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default WebmasterRoute;
