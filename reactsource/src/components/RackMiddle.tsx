import React from 'react';

interface RackMiddleProps extends React.SVGProps<SVGSVGElement> {
  unitNumber: number; // Pass in the number (e.g., 42, 41, ... 1)
  /** 0-based render position from the top — matches real markup's own
   *  `data-slot-index`, distinct from `unitNumber` (`data-height-unit`,
   *  the rack's own numbering). Optional so existing call sites that
   *  don't track it don't break; falls back to `unitNumber` itself. */
  slotIndex?: number;
}

export const RackMiddle = ({ unitNumber, slotIndex, className = '', ...props }: RackMiddleProps) => {
  // MATH: Unit 1's top starts natively at 985.5.
  // Each unit above it subtracts 50px.
  // This preserves your exact native absolute coordinate system for cables!
  const yTop = 985.5 - (unitNumber - 1) * 50;
  const yBottom = yTop + 50;

  return (
    <svg
      // -400..340 (740 wide): tight to the ruler (-400..-340, drawn below)
      // plus the rack body (-340..340) — see RackTop's own comment for why
      // this had to shrink from the old `-550 ... 1100`.
      viewBox={`-400 ${yTop} 740 50`}
      // See RackTop's own comment: default `xMidYMid meet` letterboxes to
      // whichever axis-scale is smaller instead of filling the container,
      // and this piece's viewBox aspect ratio (740:50) is nowhere close to
      // its real rendered one (RACK_WIDTH:ROW_PX — the actual bug behind
      // devices still not lining up with the empty slots after the
      // previous viewBox-width fix: this row's own content was rendering
      // *narrower* than RACK_WIDTH, centered, independent of that fix).
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Bounding Spacer */}
      <rect x="-340" y={yTop} width="680" height="50" fill="none" stroke="none" strokeWidth="0"></rect>

      {/* Class names and data attributes below match app.patchdocs.io's
       * own markup verbatim (confirmed via direct DOM inspection of a
       * live rack) — none of it drives styling here (every element also
       * carries the Tailwind utility that actually paints it), it's pure
       * structural/selector parity. */}
      <g className="rack-height-unit" data-slot-index={slotIndex ?? unitNumber} data-height-unit={unitNumber}>
        {/* Number Indicator */}
        <g className="rack-height-unit__number_indicator pointer-events-none">
          <line
            className="rack-height-unit__number_indicator_vline stroke-foreground/80"
            x1="-390"
            x2="-390"
            y1={yTop}
            y2={yBottom}
            strokeWidth="1"
          ></line>
          <line
            className="rack-height-unit__number_indicator_hline_top stroke-foreground/80"
            x1="-390"
            x2="-385"
            y1={yTop + 0.5}
            y2={yTop + 0.5}
            strokeWidth="1"
          ></line>
          <line
            className="rack-height-unit__number_indicator_hline_bottom stroke-foreground/80"
            x1="-390"
            x2="-385"
            y1={yBottom - 0.5}
            y2={yBottom - 0.5}
            strokeWidth="1"
          ></line>
          <text
            className="rack-height-unit__number_indicator_text text-xs leading-none fill-foreground/80"
            x="-400"
            y={yTop + 25}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {unitNumber}
          </text>
        </g>

        {/* Rack Inner/Outer Rails */}
        <line
          className="rack-height-unit__left_outer stroke-foreground/80 pointer-events-none"
          x1="-340"
          x2="-340"
          y1={yTop}
          y2={yBottom}
          strokeWidth="1"
        ></line>
        <line
          className="rack-height-unit__left_inner stroke-foreground/80 pointer-events-none"
          x1="-330"
          x2="-330"
          y1={yTop}
          y2={yBottom}
          strokeWidth="1"
        ></line>
        <line
          className="rack-height-unit__right_inner stroke-foreground/80 pointer-events-none"
          x1="330"
          x2="330"
          y1={yTop}
          y2={yBottom}
          strokeWidth="1"
        ></line>
        <line
          className="rack-height-unit__right_outer stroke-foreground/80 pointer-events-none"
          x1="340"
          x2="340"
          y1={yTop}
          y2={yBottom}
          strokeWidth="1"
        ></line>

        {/* Slot Placeholder */}
        <g
          className="rack-height-unit__placeholder rack-slot rack-slot-front"
          fill="none"
          fillRule="evenodd"
          style={{ cursor: 'pointer' }}
        >
          <rect
            className="rack-height-unit__placeholder_bg fill-rack-planner-light-gray"
            width="540"
            height="50"
            x="-270"
            y={yTop}
          ></rect>
          <rect className="rack-height-unit__placeholder_inner fill-white" width="500" height="50" x="-250" y={yTop}></rect>
          <line
            className="rack-height-unit__placeholder_border_top stroke-rack-planner-light-gray"
            x1="-250"
            y1={yTop + 0.5}
            x2="250"
            y2={yTop + 0.5}
            strokeDasharray="4"
            strokeWidth="1"
          ></line>
          <line
            className="rack-height-unit__placeholder_border_bottom stroke-rack-planner-light-gray"
            x1="-250"
            y1={yBottom - 0.5}
            x2="250"
            y2={yBottom - 0.5}
            strokeDasharray="4"
            strokeWidth="1"
          ></line>

          {/* Left Ear */}
          <rect
            className="rack-height-unit__placeholder_leftear_bg fill-rack-planner-light-gray"
            width="20"
            height="50"
            x="-270"
            y={yTop}
          ></rect>
          <rect className="rack-height-unit__placeholder_leftear_square1 fill-white" width="6" height="6" x="-266" y={yTop + 4}></rect>
          <rect className="rack-height-unit__placeholder_leftear_square2 fill-white" width="6" height="6" x="-266" y={yTop + 22}></rect>
          <rect className="rack-height-unit__placeholder_leftear_square3 fill-white" width="6" height="6" x="-266" y={yTop + 40}></rect>

          {/* Right Ear */}
          <rect
            className="rack-height-unit__placeholder_rightear_bg fill-rack-planner-light-gray"
            width="20"
            height="50"
            x="250"
            y={yTop}
          ></rect>
          <rect className="rack-height-unit__placeholder_rightear_square1 fill-white" width="6" height="6" x="260" y={yTop + 4}></rect>
          <rect className="rack-height-unit__placeholder_rightear_square2 fill-white" width="6" height="6" x="260" y={yTop + 22}></rect>
          <rect className="rack-height-unit__placeholder_rightear_square3 fill-white" width="6" height="6" x="260" y={yTop + 40}></rect>

          {/* Plus Icon */}
          <g className="rack-height-unit__placeholder_plus_icon" transform={`translate(0, ${yTop + 13})`}>
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path className="stroke-brand-blue/60" d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path className="stroke-brand-blue/60" d="M9 12h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path className="stroke-brand-blue/60" d="M12 9v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
          </g>
        </g>
      </g>
    </svg>
  );
};
