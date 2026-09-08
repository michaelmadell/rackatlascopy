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
  hoverRange,
  deviceConnections = [],
  onDeleteConnection
}: {
  heightU: number;
  devices: any[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (id: string) => void;
  readOnly?: boolean;
  /** The full unit-span the item currently being dragged would occupy if dropped here, and whether that's a legal drop. */
  hoverRange?: HoverRange | null;
  /** Cables to draw between device blocks — only ones where *both* ends are
   *  in `devices` (i.e. both currently on-screen: same rack, same
   *  front/back side) get a line; the rest are real but not drawn here. */
  deviceConnections?: any[];
  onDeleteConnection?: (connectionId: string) => void;
}) {
  const units = Array.from({ length: heightU }, (_, i) => heightU - i);

  const occupiedBy = new Map<number, string>();
  for (const device of devices) {
    const start = device.unit || 1;
    const span = device.heightU || 1;
    for (let u = start; u < start + span; u++) occupiedBy.set(u, device._id);
  }

  // Same top/height math the device layer below uses, keyed by device id so
  // the cable overlay can anchor a line to each end without recomputing it.
  const blockRects = new Map<string, { top: number; height: number }>();
  for (const device of devices) {
    const start = device.unit || 1;
    const span = device.heightU || 1;
    const topUnit = start + span - 1;
    const indexFromTop = heightU - topUnit;
    blockRects.set(device._id, { top: indexFromTop * ROW_PX, height: span * ROW_PX });
  }
  const visibleConnections = deviceConnections
    .map((c) => ({ conn: c, a: blockRects.get(c.device1Id), b: blockRects.get(c.device2Id) }))
    .filter((x): x is { conn: any; a: { top: number; height: number }; b: { top: number; height: number } } => !!x.a && !!x.b);

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

        {/* Cables, drawn as orthogonal "elbow" connectors off each device
         * block's right edge — fanned out slightly (offset by index) so
         * connections landing at similar heights don't perfectly overlap.
         * overflow-visible because the elbow's outward jog sits a little
         * past the 440px rack width. */}
        {visibleConnections.length > 0 && (
          <svg className="pointer-events-none absolute inset-0 overflow-visible">
            {visibleConnections.map(({ conn, a, b }, i) => {
              const ay = a.top + a.height / 2;
              const by = b.top + b.height / 2;
              const x = 450 + (i % 5) * 6;
              return (
                <path
                  key={conn._id || conn.id || i}
                  d={`M 435 ${ay} L ${x} ${ay} L ${x} ${by} L 435 ${by}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  className={onDeleteConnection ? 'cursor-pointer hover:stroke-red-400' : undefined}
                  style={{ pointerEvents: onDeleteConnection ? 'stroke' : 'none' }}
                  onClick={() => onDeleteConnection?.(conn._id || conn.id)}
                >
                  <title>{`${conn.port1Name} ↔ ${conn.port2Name}${onDeleteConnection ? ' — click to remove' : ''}`}</title>
                </path>
              );
            })}
          </svg>
        )}
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
