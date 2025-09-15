import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          {/* Logo */}
          <div className="flex items-center mb-2 sm:mb-0">
            <img 
              src="/uploads/logo/kartarkiv.png" 
              alt="Kartarkiv Logo" 
              className="h-16 w-auto"
            />
          </div>
          
          {/* Copyright */}
          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-600">
              Opphavsrett © 2025, Kartarkiv av Elias Skaug-Danielsen
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Alle rettigheter forbeholdt
            </p>
          </div>
        </div>
        
        {/* Bottom info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
            <p>Utviklet for EOK</p>
            <p>Powered by React & Node.js</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
