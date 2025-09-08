import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Pages
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import AdminDashboard from './pages/AdminDashboard';
import MapDetailPage from './pages/MapDetailPage';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

function App() {
  if (!clerkPubKey) {
    throw new Error("Missing Publishable Key")
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AuthProvider>
        <MapProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
              {/* Public routes */}
              <Route path="/login" element={
                <SignedOut>
                  <LoginPage />
                </SignedOut>
              } />
              
              {/* Protected routes */}
              <Route path="/" element={
                <>
                  <SignedIn>
                    <ProtectedRoute>
                      <MapPage />
                    </ProtectedRoute>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              } />
              
              <Route path="/map/:id" element={
                <>
                  <SignedIn>
                    <ProtectedRoute>
                      <MapDetailPage />
                    </ProtectedRoute>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              } />
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <>
                  <SignedIn>
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              } />
              
              {/* Redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </MapProvider>
    </AuthProvider>
    </ClerkProvider>
  );
}

export default App;