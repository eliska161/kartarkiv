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
          not_allowed_access: 'Din e-postadresse har ikke tilgang til denne applikasjonen. Kontakt administrator for hjelp.',
          form_username_exists: 'Brukernavnet er allerede i bruk. Velg et annet brukernavn.',
          form_password_pwned: 'Dette passordet har blitt kompromittert i en datalekkasje. Velg et tryggere passord.',
          form_password_not_strong_enough: 'Passordet er ikke sterkt nok. Velg et passord med minst 8 tegn.',
          form_password_size_in_bytes: 'Passordet må være mellom 1 og 128 tegn.',
          form_username_invalid: 'Brukernavnet kan kun inneholde bokstaver, tall og understreker.',
          form_username_max_length: 'Brukernavnet kan ikke være lengre enn 15 tegn.',
          form_username_min_length: 'Brukernavnet må være minst 2 tegn.',
          form_email_address_invalid: 'E-postadressen er ikke gyldig.',
          form_phone_number_invalid: 'Telefonnummeret er ikke gyldig.',
          form_username_required: 'Brukernavn er påkrevd.',
          form_email_address_required: 'E-postadresse er påkrevd.',
          form_password_required: 'Passord er påkrevd.',
          form_username_placeholder: 'Brukernavn',
          form_email_address_placeholder: 'E-postadresse',
          form_password_placeholder: 'Passord',
          form_username_label: 'Brukernavn',
          form_email_address_label: 'E-postadresse',
          form_password_label: 'Passord',
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
              formSubtitle: 'Skriv inn bekreftelseskoden som ble sendt til din e-postadresse',
              resendButton: 'Send kode på nytt'
            },
            phoneCode: {
              title: 'Sjekk telefonen din',
              subtitle: 'for å få tilgang til {{applicationName}}',
              formTitle: 'Bekreftelseskode',
              formSubtitle: 'Skriv inn bekreftelseskoden som ble sendt til ditt telefonnummer',
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
              formSubtitle: 'Skriv inn bekreftelseskoden som ble sendt til din e-postadresse',
              resendButton: 'Send kode på nytt'
            },
            phoneCode: {
              title: 'Sjekk telefonen din',
              subtitle: 'for å få tilgang til {{applicationName}}',
              formTitle: 'Bekreftelseskode',
              formSubtitle: 'Skriv inn bekreftelseskoden som ble sendt til ditt telefonnummer',
              resendButton: 'Send kode på nytt'
            }
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