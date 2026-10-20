import React from 'react';

interface PlazzioLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}

export const PlazzioLogo: React.FC<PlazzioLogoProps> = ({ 
  className = '', 
  size = 'md',
  light = false 
}) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Custom Plaza/Pin Geometric Symbol */}
      <div className={`relative flex items-center justify-center rounded-lg bg-orange-500 text-white ${iconSizes[size]} shrink-0 shadow-sm`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-4/5 h-4/5 text-white"
        >
          {/* Stylized shopping square + store awning */}
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      
      {/* Wordmark in clean lowercase */}
      <div className="flex items-baseline">
        <span className={`font-bold tracking-tight ${textSizes[size]} ${light ? 'text-white' : 'text-slate-900'}`}>
          plazzio
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5 mb-1" />
      </div>
    </div>
  );
};
