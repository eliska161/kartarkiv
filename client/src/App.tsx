import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
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
    <ClerkProvider 
      publishableKey={clerkPubKey}
      localization={{
        locale: 'nb-NO',
        unstable__errors: {
          not_allowed_access: 'Din e-postadresse har ikke tilgang til denne applikasjonen. Kontakt administrator for hjelp.',
          form_password_pwned: 'Dette passordet er kompromittert. Vennligst velg et annet passord.',
          form_username_invalid_length: 'Brukernavnet må være mellom 3 og 30 tegn.',
          form_username_exists: 'Dette brukernavnet er allerede i bruk.',
          form_email_address_exists: 'Denne e-postadressen er allerede registrert.',
          form_password_validation_failed: 'Passordet oppfyller ikke kravene.',
          form_identifier_exists: 'Denne e-postadressen eller brukernavnet er allerede i bruk.',
          form_password_not_strong_enough: 'Passordet er ikke sterkt nok. Prøv å legge til tall, symboler eller store bokstaver.',
          form_password_size_in_bytes_exceeded: 'Passordet er for langt. Maksimalt 128 tegn tillatt.',
          form_password_size_in_bytes_not_met: 'Passordet er for kort. Minimum 8 tegn påkrevd.'
        }
      }}
    >
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
    </ClerkProvider>
  );
}

export default App;