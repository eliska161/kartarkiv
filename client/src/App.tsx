import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { nbNO } from '@clerk/localizations';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import ClubAdminRoute from './components/ClubAdminRoute';
import WebmasterRoute from './components/WebmasterRoute';
import AnnouncementBar from './components/AnnouncementBar';
import SessionExpiredScreen from './components/SessionExpiredScreen';

// Pages
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import ClubAdminDashboard from './pages/ClubAdminDashboard';
import WebmasterDashboard from './pages/WebmasterDashboard';
import PaymentCompletePage from './pages/PaymentCompletePage';
import MapDetailPage from './pages/MapDetailPage';
import ProfilePage from './pages/ProfilePage';
import PublicDownloadPage from './pages/PublicDownloadPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ApiDocPage from './pages/ApiDocPage';
import SelectClubPage from './pages/SelectClubPage';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

type LocationState = {
  from?: string;
} | null;

const SessionExpiryHandler: React.FC = () => {
  const { sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionExpired) {
      if (location.pathname !== '/session-expired') {
        navigate('/session-expired', {
          replace: true,
          state: { from: location.pathname }
        });
      }
      return;
    }

    if (location.pathname === '/session-expired') {
      const state = (location.state as LocationState) || {};
      const from = state.from && state.from !== '/session-expired' ? state.from : '/';
      navigate(from, { replace: true });
    }
  }, [sessionExpired, location, navigate]);

  return null;
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <AnnouncementBar />
      <SessionExpiryHandler />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/session-expired" element={<SessionExpiredScreen />} />
        <Route
          path="/select-club"
          element={(
            <ProtectedRoute requireOrganization={false}>
              <SelectClubPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/download/:token" element={<PublicDownloadPage />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/api-doc" element={<ApiDocPage />} />

        {/* Protected routes */}
        <Route
          path="/kart"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kart/:id"
          element={
            <ProtectedRoute>
              <MapDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ClubAdminRoute>
              <ClubAdminDashboard />
            </ClubAdminRoute>
          }
        />

        <Route
          path="/webmaster"
          element={
            <WebmasterRoute>
              <WebmasterDashboard />
            </WebmasterRoute>
          }
        />

        <Route
          path="/admin/betaling/fullfort"
          element={
            <ProtectedRoute>
              <PaymentCompletePage />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  if (!clerkPubKey) {
    throw new Error('Missing Publishable Key');
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      localization={nbNO}
    >
      <TenantProvider>
        <AuthProvider>
          <MapProvider>
            <ToastProvider>
              <Router>
                <AppContent />
              </Router>
            </ToastProvider>
          </MapProvider>
        </AuthProvider>
      </TenantProvider>
    </ClerkProvider>
  );
}

export default App;
