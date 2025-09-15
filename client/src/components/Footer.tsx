import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Logo */}
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src="/uploads/logo/kartarkiv.png" 
              alt="Kartarkiv Logo" 
              className="h-12 w-auto mr-3"
            />
            <div>
              <h3 className="text-xl font-bold text-white">Kartarkiv</h3>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-300">
              Opphavsrett © 2025, Kartarkiv av Elias Skaug-Danielsen
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Alle rettigheter forbeholdt
            </p>
          </div>
        </div>
        
        {/* Bottom border */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400">
            <p>Utviklet for EOK</p>
            <p>Powered by React & Node.js</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
