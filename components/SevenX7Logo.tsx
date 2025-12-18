
import React from 'react';

interface SevenX7LogoProps {
  size?: 'xs' | 'small' | 'medium' | 'large';
  isWelcome?: boolean;
  onNewsClick?: () => void;
}

const SevenX7Logo: React.FC<SevenX7LogoProps> = ({ size = 'small', onNewsClick }) => {
  
  const getTextSize = () => {
      switch(size) {
          case 'xs': return 'text-[8px]';
          case 'small': return 'text-[10px]';
          case 'medium': return 'text-base';
          case 'large': return 'text-3xl';
          default: return 'text-[10px]';
      }
  };

  const isLarge = size === 'large';
  const textSizeClass = getTextSize();
  
  // Minimal gaps to make it look like one word
  const gapClass = 'gap-0';
  
  const xSize = isLarge ? 'text-5xl' : size === 'medium' ? 'text-2xl' : size === 'xs' ? 'text-[10px]' : 'text-lg';
  // Tight tracking for "one word" feel
  const trackingClass = 'tracking-tighter';

  return (
    <div className={`group flex items-center font-display ${gapClass} select-none`}>
      
      {/* SEVEN - Black, standard bold */}
      <span 
        className={`${textSizeClass} text-black font-black uppercase ${trackingClass} leading-none`}
      >
        Seven
      </span>

      {/* X - Black, extra bold - Centered vertically with text */}
      <div 
        className={`relative flex items-center justify-center ${xSize} leading-none px-[0.05em]`} 
        onClick={onNewsClick}
      >
         <span 
            className="relative z-10 text-black font-black inline-block origin-center" 
            style={{ fontFamily: 'sans-serif', fontWeight: 950 }}
         >
            X
         </span>
      </div>

      {/* 7 - Reverting back from 'Store' as requested */}
      <span className={`${textSizeClass} text-black font-black uppercase ${trackingClass} leading-none`}>7</span>

    </div>
  );
};

export default SevenX7Logo;
