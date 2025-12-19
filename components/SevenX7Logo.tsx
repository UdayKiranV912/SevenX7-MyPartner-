
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

  const getXSize = () => {
      switch(size) {
          case 'xs': return 'text-[12px]';
          case 'small': return 'text-sm';
          case 'medium': return 'text-2xl';
          case 'large': return 'text-5xl';
          default: return 'text-sm';
      }
  };

  const textSizeClass = getTextSize();
  const xSizeClass = getXSize();
  const trackingClass = 'tracking-tighter';

  return (
    <div 
      className="inline-flex items-center gap-0 select-none cursor-pointer group leading-none" 
      onClick={onNewsClick}
    >
      {/* SEVEN */}
      <span 
        className={`${textSizeClass} text-black font-black uppercase ${trackingClass} flex-shrink-0 flex items-center h-full`}
        style={{ fontWeight: 900 }}
      >
        Seven
      </span>

      {/* X - Centered, Bold (1000), Scaled (1.25), Padding (0.05em) */}
      <div className="flex items-center justify-center px-[0.05em] flex-shrink-0 h-full">
         <span 
            className={`${xSizeClass} text-black font-black inline-block transform scale-125`} 
            style={{ 
              fontFamily: 'system-ui, -apple-system, sans-serif', 
              fontWeight: 1000, 
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center'
            }}
         >
            X
         </span>
      </div>

      {/* 7 */}
      <span 
        className={`${textSizeClass} text-black font-black ${trackingClass} flex-shrink-0 flex items-center h-full`}
        style={{ fontWeight: 900 }}
      >
        7
      </span>
    </div>
  );
};

export default SevenX7Logo;
