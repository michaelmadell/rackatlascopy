import React from 'react';

export const RackTop = ({ className = '', ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="-550 -1122.5 1100 58" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-hidden="true"
    className={className}
    {...props}
  >
    <rect x="-340" y="-1122.5" width="680" height="58" fill="none" stroke="none" strokeWidth="0"></rect>

    {/* CHANGED: strokeWidth="2" is now strokeWidth="1" to match the rest of the rack */}
    <g fill="none" fillRule="evenodd" stroke="currentColor" strokeWidth="1">
      <polyline points="340 -1064.5 340 -1084.5 -340 -1084.5 -340 -1064.5"></polyline>
      <polyline points="330 -1064.5 330 -1074.5 -330 -1074.5 -330 -1064.5"></polyline>
      <polygon points="340 -1122.5 -340 -1122.5 -340 -1091.5 340 -1091.5"></polygon>
      <polygon points="337 -1091.5 -335 -1091.5 -335 -1084.5 337 -1084.5"></polygon>
    </g>
  </svg>
);