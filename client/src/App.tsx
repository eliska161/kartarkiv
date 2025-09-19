import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { nbNO } from '@clerk/localizations';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AnnouncementBar from './components/AnnouncementBar';

// Pages
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import AdminDashboard from './pages/AdminDashboard';
import MapDetailPage from './pages/MapDetailPage';
import ProfilePage from './pages/ProfilePage';
import PublicDownloadPage from './pages/PublicDownloadPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const AppContent: React.FC = () => {

  return (
    <div className="min-h-screen bg-gray-50">
      <AnnouncementBar />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/download/:token" element={<PublicDownloadPage />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        } />
        
        <Route path="/map/:id" element={
          <ProtectedRoute>
            <MapDetailPage />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        
        {/* Admin routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  if (!clerkPubKey) {
    throw new Error("Missing Publishable Key")
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