import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Image, Trash2, Save, X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LogoManager: React.FC = () => {
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [newLogo, setNewLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurrentLogo();
  }, []);

  const fetchCurrentLogo = async () => {
    try {
      // Try to load the current logo
      const response = await axios.get(`${API_BASE_URL}/api/settings/logo`);
      if (response.data.logo) {
        setCurrentLogo(response.data.logo);
      }
    } catch (error) {
      // Logo doesn't exist yet, that's okay
      console.log('No logo found');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Kun bildefiler er tillatt');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Filen er for stor. Maksimal størrelse er 2MB');
        return;
      }
      
      setNewLogo(file);
      setError('');
    }
  };

  const handleSaveLogo = async () => {
    if (!newLogo) return;
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('logo', newLogo);
      
      await axios.post(`${API_BASE_URL}/api/settings/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update current logo to show the new one
      const logoUrl = URL.createObjectURL(newLogo);
      setCurrentLogo(logoUrl);
      setNewLogo(null);
      
      // Reload the page to update the logo everywhere
      window.location.reload();
    } catch (error: any) {
      console.error('Logo upload error:', error);
      if (error.response?.status === 401) {
        setError('Du er ikke lenger logget inn. Vennligst logg inn på nytt.');
        // Don't reload the page if authentication failed
        return;
      }
      setError(error.response?.data?.message || 'Kunne ikke laste opp logo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Er du sikker på at du vil slette logoen?')) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/settings/logo`);
      setCurrentLogo(null);
      setNewLogo(null);
      window.location.reload();
    } catch (error: any) {
      console.error('Logo delete error:', error);
      if (error.response?.status === 401) {
        setError('Du er ikke lenger logget inn. Vennligst logg inn på nytt.');
        return;
      }
      setError(error.response?.data?.message || 'Kunne ikke slette logo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Logo-administrasjon</h2>
        
        {/* Current Logo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Nåværende logo</h3>
          {currentLogo ? (
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src={currentLogo} 
                  alt="Nåværende logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <button
                onClick={handleDeleteLogo}
                disabled={loading}
                className="text-red-600 hover:text-red-800 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Slett logo
              </button>
            </div>
          ) : (
            <p className="text-gray-500">Ingen logo er lastet opp</p>
          )}
        </div>

        {/* Upload New Logo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Last opp ny logo</h3>
          
          {newLogo ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src={URL.createObjectURL(newLogo)} 
                    alt="Ny logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{newLogo.name}</p>
                  <p className="text-xs text-gray-500">
                    {(newLogo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleSaveLogo}
                  disabled={loading}
                  className="btn-primary flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Lagrer...' : 'Lagre logo'}
                </button>
                <button
                  onClick={() => setNewLogo(null)}
                  disabled={loading}
                  className="btn-secondary flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Velg en logo-fil</p>
              <p className="text-xs text-gray-500 mb-4">
                Støttede formater: JPG, PNG, SVG. Maksimal størrelse: 2MB
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="btn-primary cursor-pointer"
              >
                <Image className="h-4 w-4 mr-2" />
                Velg logo
              </label>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Retningslinjer for logo</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Logo bør være kvadratisk eller ha godt forhold for visning</li>
            <li>• Anbefalt størrelse: 200x200 piksler eller høyere</li>
            <li>• Støttede formater: JPG, PNG, SVG</li>
            <li>• Maksimal filstørrelse: 2MB</li>
            <li>• Logo vil vises i header og på alle sider</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LogoManager;
