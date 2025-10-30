import React, { useState, useEffect } from 'react';
import { SignIn } from '@clerk/clerk-react';
import BrandLogo from '../components/BrandLogo';

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const heading = 'Logg inn for å få tilgang til ditt kartarkiv';
  const subheading = 'Kartarkiv er kun for inviterte klubber og medlemmer.';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <BrandLogo />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {heading}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {subheading}
          </p>
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {heading}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {subheading}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex justify-center">
            <SignIn
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-brand-600 hover:bg-brand-700 text-white text-sm normal-case',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
                  formFieldInput: 'border border-gray-300 rounded-md focus:border-brand-500 focus:ring-brand-500',
                  footerActionLink: 'text-brand-600 hover:text-brand-700',
                  identityPreviewText: 'text-gray-600',
                  formFieldLabel: 'text-gray-700',
                  dividerLine: 'bg-gray-300',
                  dividerText: 'text-gray-500'
                }
              }}
              fallbackRedirectUrl="/app"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
