
import React from 'react';

interface SevenX7LogoProps {
  size?: 'xs' | 'small' | 'medium' | 'large' | 'xl';
  onNewsClick?: () => void;
}

const SevenX7Logo: React.FC<SevenX7LogoProps> = ({ size = 'small', onNewsClick }) => {
  
  const getTextSize = () => {
      switch(size) {
          case 'xs': return 'text-[12px]';
          case 'small': return 'text-sm';
          case 'medium': return 'text-2xl';
          case 'large': return 'text-5xl';
          case 'xl': return 'text-6xl';
          default: return 'text-sm';
      }
  };

  const isLarge = size === 'large' || size === 'xl';
  const textSizeClass = getTextSize();
  
  const xSizeClass = size === 'xl' ? 'text-8xl' : size === 'large' ? 'text-7xl' : size === 'medium' ? 'text-4xl' : size === 'xs' ? 'text-lg' : 'text-2xl';
  
  const getOverlapMargin = () => {
    switch(size) {
      case 'xl': return 'mx-[-18px]';
      case 'large': return 'mx-[-14px]';
      case 'medium': return 'mx-[-8px]';
      case 'xs': return 'mx-[-3px]';
      default: return 'mx-[-5px]';
    }
  };

  const marginClass = getOverlapMargin();

  return (
    <div className="flex flex-col items-center">
      <div className="group flex items-center justify-center font-display select-none leading-none h-fit">
        {/* SEVEN */}
        <span 
          className={`${textSizeClass} text-black font-black uppercase leading-none z-0`}
          style={{ letterSpacing: '-0.02em', fontWeight: 900 }}
        >
          Seven
        </span>

        {/* X - The Overlaying Element */}
        <div 
          className={`relative flex items-center justify-center ${xSizeClass} leading-none ${marginClass} z-10 transition-transform group-hover:scale-110 duration-300`} 
          onClick={onNewsClick}
          style={{ cursor: onNewsClick ? 'pointer' : 'default' }}
        >
           <span 
              className="text-black font-black inline-block leading-none" 
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 1000,
                fontSize: '1.2em',
                filter: 'drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white) drop-shadow(0 1px 0 white) drop-shadow(0 -1px 0 white)'
              }}
           >
              X
           </span>
        </div>

        {/* 7 */}
        <span 
          className={`${textSizeClass} text-black font-black uppercase leading-none z-0`}
          style={{ letterSpacing: '-0.02em', fontWeight: 900 }}
        >
          7
        </span>
      </div>
      <span className={`font-black text-slate-400 uppercase tracking-[0.3em] ${isLarge ? 'text-sm mt-2' : 'text-[8px] mt-1'}`}>
        My Partner
      </span>
    </div>
  );
};

export default SevenX7Logo;
