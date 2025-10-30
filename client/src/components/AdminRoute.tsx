import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />;
  }

  const roles = Array.isArray(user?.publicMetadata?.roles)
    ? user?.publicMetadata?.roles.map(role => String(role).toLowerCase())
    : [];
  const isSuperAdmin = roles.includes('superadmin') || Boolean(user?.publicMetadata?.isSuperAdmin);
  const isAdmin = Boolean(user?.publicMetadata?.isAdmin) || isSuperAdmin;

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
