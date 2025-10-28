import React from 'react';
import { SignInButton } from '@clerk/clerk-react';
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
          <h1 className="text-2xl font-semibold text-gray-900">Økt Utløpt</h1>
          <p className="text-gray-600">Økt utløpt, vennligst logg inn igjen med en login fra Clerk.</p>
        </div>
        <div>
          <SignInButton mode="modal">
            <button type="button" className="btn-primary w-full">
              Logg inn på nytt
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredScreen;
