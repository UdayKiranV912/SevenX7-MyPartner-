
import React from 'react';

interface SevenX7LogoProps {
  size?: 'xs' | 'small' | 'medium' | 'large';
  isWelcome?: boolean;
  onNewsClick?: () => void;
}

const SevenX7Logo: React.FC<SevenX7LogoProps> = ({ size = 'small', onNewsClick }) => {
  
  const getTextSize = () => {
      switch(size) {
          case 'xs': return 'text-[10px]';
          case 'small': return 'text-xs';
          case 'medium': return 'text-xl';
          case 'large': return 'text-4xl';
          default: return 'text-xs';
      }
  };

  const textSizeClass = getTextSize();
  
  // 'X' sizing logic - always slightly larger than base text
  const getXSize = () => {
      switch(size) {
          case 'xs': return 'text-[12px]';
          case 'small': return 'text-sm';
          case 'medium': return 'text-2xl';
          case 'large': return 'text-5xl';
          default: return 'text-sm';
      }
  };

  const xSizeClass = getXSize();
  const trackingClass = 'tracking-tighter';

  return (
    <div 
      className="inline-flex items-center gap-0 select-none cursor-pointer group" 
      onClick={onNewsClick}
    >
      {/* SEVEN - Black, Ultra Bold */}
      <span 
        className={`${textSizeClass} text-black font-black uppercase ${trackingClass} leading-none flex-shrink-0`}
        style={{ fontWeight: 900 }}
      >
        Seven
      </span>

      {/* X - Bolder, Larger, No Overlap */}
      <div className="flex items-center justify-center px-[2px] leading-none flex-shrink-0">
         <span 
            className={`${xSizeClassClass()} text-black font-black inline-block transform scale-110`} 
            style={{ 
              fontFamily: 'system-ui, sans-serif', 
              fontWeight: 1000, // Extra bold
              lineHeight: 1
            }}
         >
            X
         </span>
      </div>

      {/* 7 - Black, Ultra Bold */}
      <span 
        className={`${textSizeClass} text-black font-black ${trackingClass} leading-none flex-shrink-0`}
        style={{ fontWeight: 900 }}
      >
        7
      </span>
    </div>
  );

  // Helper for X font class to avoid duplicate logic
  function xSizeClassClass() {
      return xSizeClass;
  }
};

export default SevenX7Logo;
