import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import EOKLogo from '../components/EOKLogo';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <EOKLogo />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Logg inn på Kartarkiv
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Elverum Orienteringsklubb
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex justify-center">
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-eok-600 hover:bg-eok-700 text-white text-sm normal-case',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
                  formFieldInput: 'border border-gray-300 rounded-md focus:border-eok-500 focus:ring-eok-500',
                  footerActionLink: 'text-eok-600 hover:text-eok-700',
                  identityPreviewText: 'text-gray-600',
                  formFieldLabel: 'text-gray-700',
                  dividerLine: 'bg-gray-300',
                  dividerText: 'text-gray-500',
                  // Oversettelser
                  formFieldLabel__emailAddress: 'E-postadresse',
                  formFieldLabel__password: 'Passord',
                  formFieldLabel__username: 'Brukernavn',
                  formFieldLabel__phoneNumber: 'Telefonnummer',
                  formFieldInput__emailAddress: 'Skriv inn e-postadressen din',
                  formFieldInput__password: 'Skriv inn passordet ditt',
                  formFieldInput__username: 'Skriv inn brukernavnet ditt',
                  formFieldInput__phoneNumber: 'Skriv inn telefonnummeret ditt',
                  formFieldAction__forgotPassword: 'Glemt passord?',
                  formFieldAction__signIn: 'Logg inn',
                  formFieldAction__signUp: 'Registrer deg',
                  formFieldAction__continue: 'Fortsett',
                  formFieldAction__back: 'Tilbake',
                  formFieldAction__resetPassword: 'Tilbakestill passord',
                  formFieldAction__verifyEmail: 'Bekreft e-post',
                  formFieldAction__verifyPhoneNumber: 'Bekreft telefonnummer',
                  formFieldAction__verifyEmailCode: 'Bekreft kode',
                  formFieldAction__verifyPhoneNumberCode: 'Bekreft kode',
                  formFieldAction__resendCode: 'Send kode på nytt',
                  formFieldAction__signInWithEmail: 'Logg inn med e-post',
                  formFieldAction__signInWithPhoneNumber: 'Logg inn med telefon',
                  formFieldAction__signUpWithEmail: 'Registrer deg med e-post',
                  formFieldAction__signUpWithPhoneNumber: 'Registrer deg med telefon',
                  formFieldAction__signInWithUsername: 'Logg inn med brukernavn',
                  formFieldAction__signUpWithUsername: 'Registrer deg med brukernavn',
                  formFieldAction__signInWithEmailCode: 'Logg inn med e-postkode',
                  formFieldAction__signUpWithEmailCode: 'Registrer deg med e-postkode',
                  formFieldAction__signInWithPhoneNumberCode: 'Logg inn med telefonkode',
                  formFieldAction__signUpWithPhoneNumberCode: 'Registrer deg med telefonkode',
                  formFieldAction__signInWithPassword: 'Logg inn med passord',
                  formFieldAction__signUpWithPassword: 'Registrer deg med passord',
                  formFieldAction__signInWithUsernameAndPassword: 'Logg inn med brukernavn og passord',
                  formFieldAction__signUpWithUsernameAndPassword: 'Registrer deg med brukernavn og passord',
                  formFieldAction__signInWithEmailAndPassword: 'Logg inn med e-post og passord',
                  formFieldAction__signUpWithEmailAndPassword: 'Registrer deg med e-post og passord',
                  formFieldAction__signInWithPhoneNumberAndPassword: 'Logg inn med telefon og passord',
                  formFieldAction__signUpWithPhoneNumberAndPassword: 'Registrer deg med telefon og passord',
                  formFieldAction__signInWithEmailCodeAndPassword: 'Logg inn med e-postkode og passord',
                  formFieldAction__signUpWithEmailCodeAndPassword: 'Registrer deg med e-postkode og passord',
                  formFieldAction__signInWithPhoneNumberCodeAndPassword: 'Logg inn med telefonkode og passord',
                  formFieldAction__signUpWithPhoneNumberCodeAndPassword: 'Registrer deg med telefonkode og passord',
                  formFieldAction__signInWithUsernameAndEmail: 'Logg inn med brukernavn og e-post',
                  formFieldAction__signUpWithUsernameAndEmail: 'Registrer deg med brukernavn og e-post',
                  formFieldAction__signInWithUsernameAndPhoneNumber: 'Logg inn med brukernavn og telefon',
                  formFieldAction__signUpWithUsernameAndPhoneNumber: 'Registrer deg med brukernavn og telefon',
                  formFieldAction__signInWithEmailAndPhoneNumber: 'Logg inn med e-post og telefon',
                  formFieldAction__signUpWithEmailAndPhoneNumber: 'Registrer deg med e-post og telefon',
                  formFieldAction__signInWithUsernameAndEmailAndPassword: 'Logg inn med brukernavn, e-post og passord',
                  formFieldAction__signUpWithUsernameAndEmailAndPassword: 'Registrer deg med brukernavn, e-post og passord',
                  formFieldAction__signInWithUsernameAndPhoneNumberAndPassword: 'Logg inn med brukernavn, telefon og passord',
                  formFieldAction__signUpWithUsernameAndPhoneNumberAndPassword: 'Registrer deg med brukernavn, telefon og passord',
                  formFieldAction__signInWithEmailAndPhoneNumberAndPassword: 'Logg inn med e-post, telefon og passord',
                  formFieldAction__signUpWithEmailAndPhoneNumberAndPassword: 'Registrer deg med e-post, telefon og passord',
                  formFieldAction__signInWithUsernameAndEmailAndPhoneNumber: 'Logg inn med brukernavn, e-post og telefon',
                  formFieldAction__signUpWithUsernameAndEmailAndPhoneNumber: 'Registrer deg med brukernavn, e-post og telefon',
                  formFieldAction__signInWithUsernameAndEmailAndPhoneNumberAndPassword: 'Logg inn med brukernavn, e-post, telefon og passord',
                  formFieldAction__signUpWithUsernameAndEmailAndPhoneNumberAndPassword: 'Registrer deg med brukernavn, e-post, telefon og passord'
                }
              }}
              fallbackRedirectUrl="/"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;