import React from 'react';

type LogoSize = 'sm' | 'md' | 'lg';

interface KartarkivLogoProps {
  size?: LogoSize;
  className?: string;
  src?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

export const DEFAULT_KARTARKIV_LOGO_SRC = `${process.env.PUBLIC_URL || ''}/uploads/logo/kartarkiv.png`;

const KartarkivLogo: React.FC<KartarkivLogoProps> = ({ size = 'md', className = '', src }) => {
  const resolvedSrc = src || DEFAULT_KARTARKIV_LOGO_SRC;
  return (
    <img
      src={resolvedSrc}
      alt="Kartarkiv"
      className={['w-auto', sizeClasses[size], className].filter(Boolean).join(' ')}
    />
  );
};

export default KartarkivLogo;
