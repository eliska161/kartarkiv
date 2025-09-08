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
          EOK (Elverum Orienteringsklubb)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex justify-center">
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
                  formFieldInput: 'border border-gray-300 rounded-md',
                }
              }}
              redirectUrl="/"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;