import React from 'react';

interface RackMiddleProps extends React.SVGProps<SVGSVGElement> {
  unitNumber: number; // Pass in the number (e.g., 42, 41, ... 1)
}

export const RackMiddle = ({ unitNumber, className = '', ...props }: RackMiddleProps) => {
  // MATH: Unit 1's top starts natively at 985.5. 
  // Each unit above it subtracts 50px.
  // This preserves your exact native absolute coordinate system for cables!
  const yTop = 985.5 - (unitNumber - 1) * 50;
  const yBottom = yTop + 50;

  return (
    <svg 
      viewBox={`-550 ${yTop} 1100 50`} 
      xmlns="http://www.w3.org/2000/svg" 
      aria-hidden="true" 
      className={className} 
      {...props}
    >
      {/* Bounding Spacer */}
      <rect x="-340" y={yTop} width="680" height="50" fill="none" stroke="none" strokeWidth="0"></rect>

      <g data-height-unit={unitNumber}>
        {/* Number Indicator */}
        <g className="pointer-events-none" stroke="currentColor">
          <line x1="-390" x2="-390" y1={yTop} y2={yBottom} strokeWidth="1"></line>
          <line x1="-390" x2="-385" y1={yTop + 0.5} y2={yTop + 0.5} strokeWidth="1"></line>
          <line x1="-390" x2="-385" y1={yBottom - 0.5} y2={yBottom - 0.5} strokeWidth="1"></line>
          <text 
            x="-400" 
            y={yTop + 25} 
            textAnchor="end" 
            dominantBaseline="middle" 
            className="text-xs leading-none" 
            fill="currentColor" 
            stroke="none"
          >
            {unitNumber}
          </text>
        </g>

        {/* Rack Inner/Outer Rails */}
        <g className="pointer-events-none" stroke="currentColor" strokeWidth="1">
          <line x1="-340" x2="-340" y1={yTop} y2={yBottom}></line>
          <line x1="-330" x2="-330" y1={yTop} y2={yBottom}></line>
          <line x1="330" x2="330" y1={yTop} y2={yBottom}></line>
          <line x1="340" x2="340" y1={yTop} y2={yBottom}></line>
        </g>
        
        {/* Slot Placeholder */}
        <g fill="none" fillRule="evenodd" style={{ cursor: 'pointer' }}>
          <rect className="fill-gray-200" width="540" height="50" x="-270" y={yTop}></rect>
          <rect className="fill-white" width="500" height="50" x="-250" y={yTop}></rect>
          <line className="stroke-gray-300" x1="-250" y1={yTop + 0.5} x2="250" y2={yTop + 0.5} strokeDasharray="4" strokeWidth="1"></line>
          <line className="stroke-gray-300" x1="-250" y1={yBottom - 0.5} x2="250" y2={yBottom - 0.5} strokeDasharray="4" strokeWidth="1"></line>
          
          {/* Left Ear */}
          <rect className="fill-gray-200" width="20" height="50" x="-270" y={yTop}></rect>
          <rect className="fill-white" width="6" height="6" x="-266" y={yTop + 4}></rect>
          <rect className="fill-white" width="6" height="6" x="-266" y={yTop + 22}></rect>
          <rect className="fill-white" width="6" height="6" x="-266" y={yTop + 40}></rect>
          
          {/* Right Ear */}
          <rect className="fill-gray-200" width="20" height="50" x="250" y={yTop}></rect>
          <rect className="fill-white" width="6" height="6" x="260" y={yTop + 4}></rect>
          <rect className="fill-white" width="6" height="6" x="260" y={yTop + 22}></rect>
          <rect className="fill-white" width="6" height="6" x="260" y={yTop + 40}></rect>
          
          {/* Plus Icon */}
          <g transform={`translate(0, ${yTop + 13})`}>
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path className="stroke-blue-500 opacity-60" d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path className="stroke-blue-500 opacity-60" d="M9 12h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path className="stroke-blue-500 opacity-60" d="M12 9v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
          </g>
        </g>
      </g>
    </svg>
  );
};