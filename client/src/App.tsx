import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { nbNO } from '@clerk/localizations';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AnnouncementBar from './components/AnnouncementBar';
import SessionExpiredScreen from './components/SessionExpiredScreen';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import AdminDashboard from './pages/AdminDashboard';
import PaymentCompletePage from './pages/PaymentCompletePage';
import MapDetailPage from './pages/MapDetailPage';
import ProfilePage from './pages/ProfilePage';
import PublicDownloadPage from './pages/PublicDownloadPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ApiDocPage from './pages/ApiDocPage';

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
          state: { from: location.pathname },
        });
      }
      return;
    }

    if (location.pathname === '/session-expired') {
      const state = (location.state as LocationState) || {};
      const from = state.from && state.from !== '/session-expired' ? state.from : '/app';
      navigate(from, { replace: true });
    }
  }, [sessionExpired, location, navigate]);

  return null;
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-brandSurface">
      <AnnouncementBar />
      <SessionExpiryHandler />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<LoginPage />} />
        <Route path="/session-expired" element={<SessionExpiredScreen />} />
        <Route path="/download/:token" element={<PublicDownloadPage />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/api-doc" element={<ApiDocPage />} />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/map/:id"
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
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
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
      <AuthProvider>
        <MapProvider>
          <ToastProvider>
            <Router>
              <AppContent />
            </Router>
          </ToastProvider>
        </MapProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;
