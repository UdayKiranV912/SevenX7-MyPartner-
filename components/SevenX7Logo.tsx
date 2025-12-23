
import React from 'react';

interface SevenX7LogoProps {
  size?: 'xs' | 'small' | 'medium' | 'large';
  onNewsClick?: () => void;
  hideBrandName?: boolean;
}

const SevenX7Logo: React.FC<SevenX7LogoProps> = ({ size = 'small', onNewsClick, hideBrandName = false }) => {
  
  const getTextSize = () => {
    switch(size) {
      case 'xs': return 'text-[14px]';
      case 'small': return 'text-[18px]';
      case 'medium': return 'text-2xl';
      case 'large': return 'text-6xl';
      default: return 'text-[18px]';
    }
  };

  const isLarge = size === 'large';
  const isMedium = size === 'medium';
  const isXS = size === 'xs';
  const textSizeClass = getTextSize();
  
  const xSizeClass = isLarge ? 'text-8xl' : isMedium ? 'text-5xl' : isXS ? 'text-xl' : 'text-3xl';
  
  const getOverlapMargin = () => {
    switch(size) {
      case 'large': return 'mx-[-18px]';
      case 'medium': return 'mx-[-10px]';
      case 'xs': return 'mx-[-4px]';
      default: return 'mx-[-6px]';
    }
  };

  const marginClass = getOverlapMargin();

  return (
    <div className="flex flex-col items-center select-none relative group animate-fade-in">
      {/* Main SEVEN X 7 Row */}
      <div className="flex items-center justify-center font-display leading-none h-fit">
        <span 
          className={`${textSizeClass} text-black font-black uppercase leading-none z-0 tracking-tighter`}
        >
          Seven
        </span>

        <div 
          className={`relative flex items-center justify-center ${xSizeClass} leading-none ${marginClass} z-10 transition-transform group-hover:scale-110 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]`} 
          onClick={onNewsClick}
          style={{ cursor: onNewsClick ? 'pointer' : 'default' }}
        >
           <span 
              className="text-black font-black inline-block leading-none" 
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 900,
                fontSize: '1.2em',
                filter: 'drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white) drop-shadow(0 1px 0 white) drop-shadow(0 -1px 0 white)'
              }}
           >
              X
           </span>
        </div>

        <span 
          className={`${textSizeClass} text-black font-black uppercase leading-none z-0 tracking-tighter`}
        >
          7
        </span>
      </div>
      
      {/* Subtitles: Innovations & My partner Grocesphere */}
      <div className="flex flex-col items-center w-full mt-1">
        {/* Innovations Subtitle - ALWAYS VISIBLE */}
        <span 
          className="font-black uppercase tracking-[0.55em] text-emerald-500 leading-none whitespace-nowrap text-center"
          style={{ 
            fontSize: isLarge ? '14px' : isMedium ? '10px' : isXS ? '5px' : '7px',
            opacity: 0.95,
            marginBottom: hideBrandName ? '0' : (isXS ? '4px' : '6px'),
            marginLeft: '0.55em' // Offset for tracking
          }}
        >
          Innovations
        </span>
        
        {/* Main Brand Name - TOGGLABLE */}
        {!hideBrandName && (
          <span 
            className={`font-black uppercase tracking-[0.18em] text-slate-900 leading-none transition-all duration-300 group-hover:text-emerald-600 text-center ${
              isXS ? 'text-[9px] mt-0.5' : 
              size === 'small' ? 'text-[13px] mt-1' : 
              isMedium ? 'text-[18px] mt-2' : 
              'text-[26px] mt-4'
            }`}
          >
            My partner Grocesphere
          </span>
        )}
      </div>
    </div>
  );
};

export default SevenX7Logo;
