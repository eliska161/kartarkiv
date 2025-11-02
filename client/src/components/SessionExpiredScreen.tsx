import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { LogOut } from 'lucide-react';

const SessionExpiredScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-2xl max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-eok-100 rounded-full p-4">
            <LogOut className="h-10 w-10 text-eok-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Økt utløpt</h1>
          <p className="text-gray-600">Økt utløpt, vennligst logg inn igjen</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none bg-transparent p-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                formButtonPrimary: 'btn-primary w-full',
                formFieldInput:
                  'border border-gray-300 rounded-md focus:border-eok-500 focus:ring-eok-500',
                formFieldLabel: 'text-gray-700',
                footerActionLink: 'text-eok-600 hover:text-eok-700',
                socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
                dividerLine: 'bg-gray-300',
                dividerText: 'text-gray-500'
              }
            }}
            fallbackRedirectUrl="/kart"
            redirectUrl="/admin"
          />
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredScreen;
