import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Pages
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import AdminDashboard from './pages/AdminDashboard';
import MapDetailPage from './pages/MapDetailPage';

function App() {
  return (
    <AuthProvider>
      <MapProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
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
        </Router>
      </MapProvider>
    </AuthProvider>
  );
}

export default App;