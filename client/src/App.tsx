import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { nbNO } from '@clerk/localizations';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AnnouncementBar from './components/AnnouncementBar';
import Footer from './components/Footer';

// Pages
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import AdminDashboard from './pages/AdminDashboard';
import MapDetailPage from './pages/MapDetailPage';
import ProfilePage from './pages/ProfilePage';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const AppContent: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AnnouncementBar />
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
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
      </main>
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