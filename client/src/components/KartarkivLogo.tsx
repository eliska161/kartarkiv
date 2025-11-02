import React, { useState } from 'react';

type LogoSize = 'sm' | 'md' | 'lg';

interface KartarkivLogoProps {
  size?: LogoSize;
  className?: string;
  src?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: 'h-8 object-contain',
  md: 'h-10 object-contain',
  lg: 'h-12 object-contain',
};

const publicBase = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
export const DEFAULT_KARTARKIV_LOGO_SRC = `${publicBase}/uploads/logo/kartarkiv.png`;

const KartarkivLogo: React.FC<KartarkivLogoProps> = ({ size = 'md', className = '', src }) => {
  const [hasError, setHasError] = useState(false);
  const fallbackSrc = DEFAULT_KARTARKIV_LOGO_SRC;
  const requestedSrc = src || fallbackSrc;
  const resolvedSrc = hasError ? fallbackSrc : requestedSrc;
  return (
    <img
      src={resolvedSrc}
      alt="Kartarkiv"
      className={['w-auto', sizeClasses[size], className].filter(Boolean).join(' ')}
      onError={() => {
        if (!hasError && resolvedSrc !== fallbackSrc) {
          setHasError(true);
        }
      }}
    />
  );
};

export default KartarkivLogo;
