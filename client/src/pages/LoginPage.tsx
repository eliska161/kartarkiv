import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import EOKLogo from '../components/EOKLogo';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Load custom logo
  useEffect(() => {
    const loadCustomLogo = async () => {
      try {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      navigate('/'); // Redirect after successful login
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-eok-50 to-eok-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-eokDark-500 p-3 rounded-full">
              {customLogo ? (
                <img 
                  src={customLogo} 
                  alt="Elverum O-Klubb Logo" 
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <EOKLogo size="md" />
              )}
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Elverum O-Klubb Kartarkiv
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Elverum Orienteringsklubb
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Brukernavn
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Ditt brukernavn"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Passord
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Ditt passord"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex justify-center items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Logg inn
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Kontakt administrator for å få tilgang til systemet
              </p>
            </div>
          </form>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Elverum Orienteringsklubb - Kartarkiv</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
