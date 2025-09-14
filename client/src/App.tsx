import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import { ToastProvider } from './contexts/ToastContext';
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
          not_allowed_access: 'Din e-postadresse har ikke tilgang til denne applikasjonen. Kontakt administrator for hjelp.'
        },
        signIn: {
          start: {
            title: 'Logg inn',
            subtitle: 'for å få tilgang til {{applicationName}}',
            actionText: 'Har du ikke en konto?',
            actionLink: 'Registrer deg'
          },
          emailCode: {
            title: 'Sjekk e-posten din',
            subtitle: 'for å få tilgang til {{applicationName}}',
            formTitle: 'Bekreftelseskode',
            resendButton: 'Send kode på nytt'
          },
          phoneCode: {
            title: 'Sjekk telefonen din',
            subtitle: 'for å få tilgang til {{applicationName}}',
            formTitle: 'Bekreftelseskode',
            resendButton: 'Send kode på nytt'
          }
        },
        signUp: {
          start: {
            title: 'Registrer deg',
            subtitle: 'for å få tilgang til {{applicationName}}',
            actionText: 'Har du allerede en konto?',
            actionLink: 'Logg inn'
          },
          emailCode: {
            title: 'Sjekk e-posten din',
            subtitle: 'for å få tilgang til {{applicationName}}',
            formTitle: 'Bekreftelseskode',
            resendButton: 'Send kode på nytt'
          },
          phoneCode: {
            title: 'Sjekk telefonen din',
            subtitle: 'for å få tilgang til {{applicationName}}',
            formTitle: 'Bekreftelseskode',
            resendButton: 'Send kode på nytt'
          }
        }
      }}
    >
      <AuthProvider>
        <MapProvider>
          <ToastProvider>
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
          </ToastProvider>
        </MapProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;