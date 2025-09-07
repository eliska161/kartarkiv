import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapPin, Settings, LogOut, User, Users, X } from 'lucide-react';
import UserManagement from './UserManagement';
import EOKLogo from './EOKLogo';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    // Try to load custom logo from static files
    const loadCustomLogo = async () => {
      try {
        // Check if logo exists in static files
        const logoExtensions = ['png', 'jpg', 'jpeg', 'svg', 'gif'];
        for (const ext of logoExtensions) {
          try {
            const response = await fetch(`/uploads/logo/logo.${ext}`);
            if (response.ok) {
              setCustomLogo(`/uploads/logo/logo.${ext}`);
              return;
            }
          } catch (error) {
            // Continue to next extension
          }
        }
      } catch (error) {
        // No custom logo, use default
      }
    };
    
    loadCustomLogo();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-eokDark-500 p-2 rounded-lg">
                {customLogo ? (
                  <img 
                    src={customLogo} 
                    alt="Elverum O-Klubb Logo" 
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <EOKLogo size="md" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Elverum O-Klubb Kartarkiv</h1>
                <p className="text-xs text-gray-500">Elverum Orienteringsklubb</p>
              </div>
            </div>
          </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Kart
              </button>
              
              {user?.isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Admin
                </button>
              )}
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="bg-eok-100 p-1 rounded-full">
                  <User className="h-4 w-4 text-eok-600" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-gray-500">
                    {user?.isAdmin ? 'Administrator' : 'Bruker'}
                  </div>
                </div>
              </div>
              
              {user?.isAdmin && (
                <button
                  onClick={() => setShowUserManagement(true)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                  title="Brukeradministrasjon"
                >
                  <Users className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                title="Logg ut"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User Management Modal */}
      {showUserManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Brukeradministrasjon</h2>
              <button
                onClick={() => setShowUserManagement(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-full overflow-y-auto">
              <UserManagement />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
