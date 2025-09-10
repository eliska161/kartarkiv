import React from 'react';

interface EOKLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EOKLogo: React.FC<EOKLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img 
        src="/uploads/logo/logo.png" 
        alt="EOK Logo" 
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to custom logo if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      {/* Fallback custom logo */}
      <div className="hidden w-full h-full relative">
        <div className="absolute inset-0 flex flex-col items-center">
          {/* Tree trunk */}
          <div className="w-1 h-2 bg-eokDark-700 absolute bottom-0 left-1/2 transform -translate-x-1/2"></div>
          
          {/* Tree branches */}
          <div className="w-4 h-1 bg-eok-600 absolute top-1 left-1/2 transform -translate-x-1/2"></div>
          <div className="w-3 h-1 bg-eok-600 absolute top-2 left-1/2 transform -translate-x-1/2"></div>
          <div className="w-2 h-1 bg-eok-600 absolute top-3 left-1/2 transform -translate-x-1/2"></div>
          
          {/* Orienteering symbol in center */}
          <div className="w-2 h-2 bg-white absolute top-1.5 left-1/2 transform -translate-x-1/2">
            <div className="w-full h-full bg-red-500 transform rotate-45"></div>
            <div className="w-full h-full bg-white transform rotate-45 absolute top-0 left-0"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EOKLogo;
