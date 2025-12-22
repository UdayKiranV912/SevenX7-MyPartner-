import React from 'react';

interface SevenX7LogoProps {
  size?: 'xs' | 'small' | 'medium' | 'large';
  onNewsClick?: () => void;
  hideBrandName?: boolean;
}

const SevenX7Logo: React.FC<SevenX7LogoProps> = ({ size = 'small', onNewsClick, hideBrandName = false }) => {
  
  const getTextSize = () => {
    switch(size) {
      case 'xs': return 'text-[10px]';
      case 'small': return 'text-xs';
      case 'medium': return 'text-xl';
      case 'large': return 'text-5xl';
      default: return 'text-xs';
    }
  };

  const isLarge = size === 'large';
  const isMedium = size === 'medium';
  const isXS = size === 'xs';
  const textSizeClass = getTextSize();
  
  const xSizeClass = isLarge ? 'text-7xl' : isMedium ? 'text-4xl' : isXS ? 'text-sm' : 'text-2xl';
  
  const getOverlapMargin = () => {
    switch(size) {
      case 'large': return 'mx-[-16px]';
      case 'medium': return 'mx-[-8px]';
      case 'xs': return 'mx-[-2px]';
      default: return 'mx-[-5px]';
    }
  };

  const marginClass = getOverlapMargin();

  return (
    <div className="flex flex-col items-center select-none relative w-fit">
      <div className="group flex items-center justify-center font-display leading-none h-fit">
        
        {/* LEFT BLOCK: SEVEN + INNOVATIONS */}
        <div className="flex flex-col items-start leading-none">
            <span 
              className={`${textSizeClass} text-black font-black uppercase leading-none z-0`}
              style={{ letterSpacing: '-0.02em' }}
            >
              Seven
            </span>
            
            {!hideBrandName && (
               <span 
                className="font-black uppercase tracking-[0.3em] text-slate-400 leading-none whitespace-nowrap"
                style={{ 
                  fontSize: isLarge ? '8px' : isMedium ? '5.5px' : isXS ? '3px' : '4px',
                  marginTop: isLarge ? '2px' : '1px',
                  opacity: 0.8
                }}
              >
                Innovations
              </span>
            )}
        </div>

        {/* CENTER: X */}
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

        {/* RIGHT BLOCK: 7 */}
        <span 
          className={`${textSizeClass} text-black font-black uppercase leading-none z-0`}
          style={{ letterSpacing: '-0.02em' }}
        >
          7
        </span>
      </div>
      
      {!hideBrandName && (
        <span 
          className={`font-black uppercase tracking-[0.08em] text-slate-900 leading-none text-center whitespace-nowrap ${
            isXS ? 'text-[5px] mt-3' : 
            size === 'small' ? 'text-[7px] mt-4' : 
            isMedium ? 'text-[10px] mt-5' : 
            'text-[14px] mt-7'
          }`}
        >
          My Partner Grocesphere
        </span>
      )}
    </div>
  );
};

export default SevenX7Logo;