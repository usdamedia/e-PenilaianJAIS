import React from 'react';
import logoAsset from './logo.png';

export const DRIVE_LOGO_URL = "https://lh3.googleusercontent.com/d/1uKBsYsg0tRZo_htqikSnnG0ZCyguEIxJ";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  alt?: string;
}

export const LogoImage: React.FC<LogoProps> = ({ 
  className = "w-full h-full object-contain", 
  alt = "Logo JAIS", 
  ...props 
}) => {
  return (
    <img
      src={logoAsset || "/logo.png"}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={(e) => {
        const target = e.currentTarget;
        if (target.src !== DRIVE_LOGO_URL) {
          target.src = DRIVE_LOGO_URL;
        }
      }}
      {...props}
    />
  );
};

export default LogoImage;
