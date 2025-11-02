import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, User, UserCircle } from 'lucide-react';
import EOKLogo from './EOKLogo';

const Header: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  const metadata = (user?.publicMetadata || {}) as { isAdmin?: boolean; isSuperAdmin?: boolean; roles?: any[] };
  const roles = Array.isArray(metadata.roles)
    ? metadata.roles.map((role) => String(role).toLowerCase())
    : [];
  const isSuperAdmin = roles.includes('superadmin') || Boolean(metadata.isSuperAdmin);
  const isAdmin = Boolean(metadata.isAdmin) || isSuperAdmin;

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
    signOut();
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
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-4">
              <>
                <button
                  onClick={() => navigate('/kart')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Kart
                </button>
                
                <button
                  onClick={() => navigate('/profile')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <UserCircle className="h-4 w-4 mr-1" />
                  Min Profil
                </button>
                
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Admin
                  </button>
                )}
              </>
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <>
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    {user?.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={`${user?.firstName || user?.lastName || 'Bruker'} profilbilde`}
                        className="h-8 w-8 object-cover"
                        onError={(e) => {
                          // Fallback to default icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="h-8 w-8 bg-eok-100 flex items-center justify-center"><svg class="h-4 w-4 text-eok-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="h-8 w-8 bg-eok-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-eok-600" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {user?.firstName || user?.lastName 
                        ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                        : 'Bruker'
                      }
                    </div>
                    <div className="text-gray-500">
                      {isSuperAdmin ? 'Superadministrator' : isAdmin ? 'Administrator' : 'Bruker'}
                    </div>
                  </div>
                </div>
                
                
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                  title="Logg ut"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            </div>
          </div>
        </div>
      </header>

    </>
  );
};

export default Header;