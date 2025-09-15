import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          {/* Logo */}
          <div className="flex items-center mb-1 sm:mb-0">
            <img 
              src="/uploads/logo/kartarkiv.png" 
              alt="Kartarkiv Logo" 
              className="h-7 w-auto"
            />
          </div>
          
          {/* Copyright */}
          <div className="text-center sm:text-right">
            <p className="text-xs text-gray-600">
              Opphavsrett © 2025, Kartarkiv av Elias Skaug-Danielsen
            </p>
            <p className="text-xs text-gray-500">
              Alle rettigheter forbeholdt
            </p>
          </div>
        </div>
        
        {/* Bottom info */}
        <div className="mt-2 pt-2 border-t border-gray-100">
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
