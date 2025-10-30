import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  logoUrl?: string | null;
}

const sizeClasses: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '', logoUrl }) => {
  const resolvedLogo = logoUrl || '/assets/kartarkiv-logo.svg';

  return (
    <div className={`${sizeClasses[size]} ${className}`.trim()}>
      <img
        src={resolvedLogo}
        alt="Kartarkiv logo"
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};

export default BrandLogo;
