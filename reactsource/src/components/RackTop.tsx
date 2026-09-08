import React from 'react';

export const RackTop = ({ className = '', ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    // Tight to the real content (-340..340, matched against
    // app.patchdocs.io's own rack-outline rect) plus RackMiddle's ruler
    // strip (-400..-340) so all three rack pieces share one scale/origin
    // and stack with pixel-identical edges. The old `-550 ... 1100` viewBox
    // had ~150-210 units of dead space on each side with nothing drawn in
    // it — DeviceBlock's own CSS insets were sized against the *container*
    // width, not the fraction of it this SVG actually painted, so devices
    // rendered wider than the visible rack body and spilled past it.
    viewBox="-400 -1122.5 740 58"
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