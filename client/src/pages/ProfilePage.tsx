import React from 'react';
import { useUser, UserProfile } from '@clerk/clerk-react';
import Header from '../components/Header';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/kart')}
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
                profileSectionContent: 'text-gray-600'
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
