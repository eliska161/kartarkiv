import React from 'react';
import logo from '../assets/kartarkiv-logo.svg';

type LogoSize = 'sm' | 'md' | 'lg';

interface KartarkivLogoProps {
  size?: LogoSize;
  className?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

const KartarkivLogo: React.FC<KartarkivLogoProps> = ({ size = 'md', className = '' }) => {
  return (
    <img
      src={logo}
      alt="Kartarkiv"
      className={['w-auto', sizeClasses[size], className].filter(Boolean).join(' ')}
    />
  );
};

export default KartarkivLogo;
