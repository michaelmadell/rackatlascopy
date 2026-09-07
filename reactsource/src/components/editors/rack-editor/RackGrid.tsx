import { useDroppable } from '@dnd-kit/core';
import { RackTop } from '@/components/RackTop';
import { RackMiddle } from '@/components/RackMiddle';
import { RackBottom } from '@/components/RackBottom';
import DeviceBlock from './DeviceBlock';

export const ROW_PX = 24;
const TOP_PX = 28;
const BOTTOM_PX = 42;

export interface HoverRange {
  /** Bottom unit of the span (inclusive) — matches the device `unit` convention. */
  start: number;
  /** Top unit of the span (inclusive). */
  end: number;
  valid: boolean;
}

/**
 * The visual rack elevation: RackTop/RackMiddle/RackBottom (the SVG pieces
 * added to components/) stacked as the background, with device blocks laid
 * over them as an absolutely-positioned overlay whose pixel math is derived
 * straight from unit numbers — decoupled from the SVGs' own internal
 * absolute coordinate space, which only matters for how each piece draws
 * itself.
 *
 * Unit 1 is the bottom of the rack (standard convention, and what
 * RackMiddle's own coordinate math assumes) — rendered last in DOM order,
 * i.e. this component walks unit = heightU down to 1.
 */
export default function RackGrid({
  heightU,
  devices,
  selectedDeviceId,
  onSelectDevice,
  readOnly,
  hoverRange
}: {
  heightU: number;
  devices: any[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (id: string) => void;
  readOnly?: boolean;
  /** The full unit-span the item currently being dragged would occupy if dropped here, and whether that's a legal drop. */
  hoverRange?: HoverRange | null;
}) {
  const units = Array.from({ length: heightU }, (_, i) => heightU - i);

  const occupiedBy = new Map<number, string>();
  for (const device of devices) {
    const start = device.unit || 1;
    const span = device.heightU || 1;
    for (let u = start; u < start + span; u++) occupiedBy.set(u, device._id);
  }

  return (
    <div className="inline-block bg-[#0c0c0e] text-[#71717a] drop-shadow-xl" style={{ width: 440 }}>
      <RackTop className="w-full" style={{ height: TOP_PX }} />

      <div className="relative" style={{ height: heightU * ROW_PX }}>
        <div className="absolute inset-0 flex flex-col">
          {units.map((u) => (
            <RackSlot
              key={u}
              unit={u}
              occupied={occupiedBy.has(u)}
              readOnly={readOnly}
              hoverState={
                hoverRange && u >= hoverRange.start && u <= hoverRange.end
                  ? hoverRange.valid
                    ? 'valid'
                    : 'invalid'
                  : null
              }
            />
          ))}
        </div>

        <div className="absolute inset-0 pointer-events-none">
          {devices.map((device) => {
            const start = device.unit || 1;
            const span = device.heightU || 1;
            const topUnit = start + span - 1;
            const indexFromTop = heightU - topUnit;
            return (
              <DeviceBlock
                key={device._id}
                device={device}
                top={indexFromTop * ROW_PX}
                height={span * ROW_PX}
                selected={selectedDeviceId === device._id}
                onSelect={() => onSelectDevice?.(device._id)}
                readOnly={readOnly}
              />
            );
          })}
        </div>
      </div>

      <RackBottom className="w-full" style={{ height: BOTTOM_PX }} />
    </div>
  );
}

function RackSlot({
  unit,
  occupied,
  readOnly,
  hoverState
}: {
  unit: number;
  occupied: boolean;
  readOnly?: boolean;
  hoverState: 'valid' | 'invalid' | null;
}) {
  const { setNodeRef } = useDroppable({
    id: `slot-${unit}`,
    data: { unit },
    disabled: readOnly
  });

  return (
    <div
      ref={setNodeRef}
      style={{ height: ROW_PX }}
      className={`relative shrink-0 transition-colors duration-75 ${
        hoverState === 'valid' && !occupied
          ? 'bg-blue-500/25'
          : hoverState === 'invalid' && !occupied
            ? 'bg-red-500/20'
            : ''
      }`}
    >
      <RackMiddle unitNumber={unit} className="w-full h-full" />
    </div>
  );
}
