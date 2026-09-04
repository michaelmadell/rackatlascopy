import React from 'react';

export const DotLottieReact: React.FC<{
  src?: string;
  autoplay?: boolean;
  loop?: boolean;
  className?: string;
}> = ({ className }) => {
  return (
    <div className={`flex items-center justify-center p-4 ${className || ''}`}>
      <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-500 flex items-center justify-center text-emerald-400">
        ✓
      </div>
    </div>
  );
};
