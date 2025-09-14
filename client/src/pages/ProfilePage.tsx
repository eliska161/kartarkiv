import React from 'react';
import { useUser, UserProfile } from '@clerk/clerk-react';
import Header from '../components/Header';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til kart
          </button>
        </div>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Min Profil</h1>
          <p className="mt-2 text-gray-600">
            Administrer din konto og personlige innstillinger
          </p>
        </div>

        {/* User profile component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <UserProfile 
            appearance={{
              elements: {
                card: 'shadow-none border-0',
                headerTitle: 'text-2xl font-bold text-gray-900',
                headerSubtitle: 'text-gray-600',
                formButtonPrimary: 'bg-eok-600 hover:bg-eok-700 text-white',
                formFieldInput: 'border border-gray-300 rounded-md focus:border-eok-500 focus:ring-eok-500',
                formFieldLabel: 'text-gray-700 font-medium',
                identityPreviewText: 'text-gray-600',
                formFieldSuccessText: 'text-green-600',
                formFieldErrorText: 'text-red-600',
                footerActionLink: 'text-eok-600 hover:text-eok-700',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-gray-500',
                badge: 'bg-eok-100 text-eok-800',
                profileSectionTitle: 'text-lg font-semibold text-gray-900',
                profileSectionContent: 'text-gray-600',
                // Norske oversettelser
                formFieldLabel__emailAddress: 'E-postadresse',
                formFieldLabel__password: 'Passord',
                formFieldLabel__username: 'Brukernavn',
                formFieldLabel__phoneNumber: 'Telefonnummer',
                formFieldLabel__firstName: 'Fornavn',
                formFieldLabel__lastName: 'Etternavn',
                formFieldAction__forgotPassword: 'Glemt passord?',
                formFieldAction__resetPassword: 'Tilbakestill passord',
                formFieldAction__verifyEmail: 'Bekreft e-post',
                formFieldAction__verifyPhoneNumber: 'Bekreft telefonnummer',
                formFieldAction__resendCode: 'Send kode på nytt',
                formFieldAction__addEmail: 'Legg til e-post',
                formFieldAction__addPhoneNumber: 'Legg til telefon',
                formFieldAction__removeEmail: 'Fjern e-post',
                formFieldAction__removePhoneNumber: 'Fjern telefon',
                formFieldAction__setAsPrimary: 'Sett som primær',
                formFieldAction__setAsPrimaryEmail: 'Sett som primær e-post',
                formFieldAction__setAsPrimaryPhoneNumber: 'Sett som primær telefon',
                formFieldAction__deleteAccount: 'Slett konto',
                formFieldAction__signOut: 'Logg ut',
                formFieldAction__back: 'Tilbake',
                formFieldAction__continue: 'Fortsett',
                formFieldAction__cancel: 'Avbryt',
                formFieldAction__save: 'Lagre',
                formFieldAction__edit: 'Rediger',
                formFieldAction__delete: 'Slett',
                formFieldAction__add: 'Legg til',
                formFieldAction__remove: 'Fjern',
                formFieldAction__update: 'Oppdater',
                formFieldAction__create: 'Opprett',
                formFieldAction__confirm: 'Bekreft',
                formFieldAction__verify: 'Bekreft',
                formFieldAction__resend: 'Send på nytt',
                formFieldAction__send: 'Send',
                formFieldAction__submit: 'Send inn',
                formFieldAction__next: 'Neste',
                formFieldAction__previous: 'Forrige',
                formFieldAction__finish: 'Fullfør',
                formFieldAction__complete: 'Fullfør',
                formFieldAction__done: 'Ferdig',
                formFieldAction__close: 'Lukk',
                formFieldAction__open: 'Åpne',
                formFieldAction__show: 'Vis',
                formFieldAction__hide: 'Skjul',
                formFieldAction__expand: 'Utvid',
                formFieldAction__collapse: 'Skjul',
                formFieldAction__more: 'Mer',
                formFieldAction__less: 'Mindre',
                formFieldAction__all: 'Alle',
                formFieldAction__none: 'Ingen',
                formFieldAction__select: 'Velg',
                formFieldAction__deselect: 'Fjern valg',
                formFieldAction__clear: 'Tøm',
                formFieldAction__reset: 'Tilbakestill',
                formFieldAction__refresh: 'Oppdater',
                formFieldAction__reload: 'Last på nytt',
                formFieldAction__retry: 'Prøv igjen',
                formFieldAction__tryAgain: 'Prøv igjen',
                formFieldAction__learnMore: 'Lær mer',
                formFieldAction__help: 'Hjelp',
                formFieldAction__support: 'Support',
                formFieldAction__contact: 'Kontakt',
                formFieldAction__feedback: 'Tilbakemelding',
                formFieldAction__report: 'Rapporter',
                formFieldAction__reportBug: 'Rapporter feil',
                formFieldAction__reportIssue: 'Rapporter problem',
                formFieldAction__reportProblem: 'Rapporter problem',
                formFieldAction__reportError: 'Rapporter feil'
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
