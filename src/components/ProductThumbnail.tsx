import React, { useState } from 'react';
import { Package, Image as ImageIcon } from 'lucide-react';

interface ProductThumbnailProps {
  src?: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackText?: string;
}

export const ProductThumbnail: React.FC<ProductThumbnailProps> = ({
  src,
  alt,
  className = '',
  size = 'md',
  fallbackText,
}) => {
  const [hasError, setHasError] = useState(false);

  // Size definitions
  const sizeClasses = {
    sm: 'w-9 h-9 min-w-9 text-[10px] rounded-lg',
    md: 'w-12 h-12 min-w-12 text-xs rounded-xl',
    lg: 'w-16 h-16 min-w-16 text-sm rounded-xl',
    xl: 'w-20 h-20 min-w-20 text-base rounded-2xl',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
    xl: 'h-9 w-9',
  };

  const initial = fallbackText
    ? fallbackText.slice(0, 2).toUpperCase()
    : alt
    ? alt.trim().slice(0, 2).toUpperCase()
    : '📦';

  // Normalize image url (handle Google Drive sharing links)
  const normalizedSrc = React.useMemo(() => {
    if (!src) return undefined;
    const trimmed = src.trim();
    if (!trimmed) return undefined;
    const driveMatch = trimmed.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w500`;
    }
    return trimmed;
  }, [src]);

  if (normalizedSrc && !hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-[#0F1115] border border-[#2D333E] shrink-0 flex items-center justify-center ${sizeClasses[size]} ${className}`}
      >
        <img
          src={normalizedSrc}
          alt={alt}
          onError={() => setHasError(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Graceful Fallback
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#1C212B] to-[#12151B] border border-[#2D333E] shrink-0 flex flex-col items-center justify-center text-slate-400 font-bold ${sizeClasses[size]} ${className}`}
      title={alt}
    >
      <Package className={`${iconSizes[size]} text-slate-500 opacity-60`} />
      {size !== 'sm' && (
        <span className="text-[9px] text-slate-400 font-mono mt-0.5 leading-none truncate max-w-full px-1">
          {initial}
        </span>
      )}
    </div>
  );
};
