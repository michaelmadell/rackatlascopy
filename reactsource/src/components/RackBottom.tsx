import React from 'react';

export const RackBottom = (props: React.SVGProps<SVGSVGElement>) => (
  // -400..340 (740 wide), matching RackTop/RackMiddle exactly — see
  // RackTop's own comment for why.
  <svg viewBox="-400 1035.5 740 87" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    {/* Bounding Spacer */}
    <rect x="-340" y="1035.5" width="680" height="87" fill="none" stroke="none" strokeWidth="0"></rect>

    {/* Main Bottom Structure - Inherits currentColor */}
    <g fill="none" fillRule="evenodd" stroke="currentColor">
      <polyline points="-340 1035.5 -340 1055.5 340 1055.5 340 1035.5"></polyline>
      <polyline points="-330 1035.5 -330 1045.5 330 1045.5 330 1035.5"></polyline>
      <polygon points="336.5 1055.5 -335.5 1055.5 -335.5 1061.5 336.5 1061.5"></polygon>
      <polygon points="293.5 1061.5 -295.5 1061.5 -295.5 1113.5 293.5 1113.5"></polygon>

      {/* Vent Lines - Generated cleanly via React Map instead of 45 hardcoded lines */}
      <g fillRule="nonzero" transform="translate(-255.5 1070)" fill="currentColor" stroke="none">
        {Array.from({ length: 45 }).map((_, i) => (
          <polygon key={i} points="5 0 0 0 0 35 5 35" transform={`translate(${i * 11.5})`}></polygon>
        ))}
      </g>

      {/* Feet */}
      <polygon points="282.5 1113.5 179.5 1113.5 179.5 1122.5 282.5 1122.5"></polygon>
      <polygon points="-181.5 1113.5 -284.5 1113.5 -284.5 1122.5 -181.5 1122.5"></polygon>
    </g>
  </svg>
);