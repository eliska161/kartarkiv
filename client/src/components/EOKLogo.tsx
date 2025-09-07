import React from 'react';

interface EOKLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EOKLogo: React.FC<EOKLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const treeSizeClasses = {
    sm: {
      trunk: 'w-0.5 h-1',
      branch1: 'w-3 h-0.5',
      branch2: 'w-2 h-0.5',
      branch3: 'w-1.5 h-0.5',
      symbol: 'w-1.5 h-1.5'
    },
    md: {
      trunk: 'w-1 h-2',
      branch1: 'w-4 h-1',
      branch2: 'w-3 h-1',
      branch3: 'w-2 h-1',
      symbol: 'w-2 h-2'
    },
    lg: {
      trunk: 'w-1.5 h-3',
      branch1: 'w-6 h-1.5',
      branch2: 'w-4 h-1.5',
      branch3: 'w-3 h-1.5',
      symbol: 'w-3 h-3'
    }
  };

  const currentSize = treeSizeClasses[size];

  return (
    <div className={`${sizeClasses[size]} relative ${className}`}>
      {/* Tree shape */}
      <div className="absolute inset-0 flex flex-col items-center">
        {/* Tree trunk */}
        <div className={`${currentSize.trunk} bg-eokDark-700 absolute bottom-0 left-1/2 transform -translate-x-1/2`}></div>
        
        {/* Tree branches */}
        <div className={`${currentSize.branch1} bg-eok-600 absolute top-1 left-1/2 transform -translate-x-1/2`}></div>
        <div className={`${currentSize.branch2} bg-eok-600 absolute top-2 left-1/2 transform -translate-x-1/2`}></div>
        <div className={`${currentSize.branch3} bg-eok-600 absolute top-3 left-1/2 transform -translate-x-1/2`}></div>
        
        {/* Orienteering symbol in center */}
        <div className={`${currentSize.symbol} bg-white absolute top-1.5 left-1/2 transform -translate-x-1/2`}>
          <div className="w-full h-full bg-red-500 transform rotate-45"></div>
          <div className="w-full h-full bg-white transform rotate-45 absolute top-0 left-0"></div>
        </div>
      </div>
    </div>
  );
};

export default EOKLogo;
