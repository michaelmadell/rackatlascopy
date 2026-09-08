import { useDroppable } from '@dnd-kit/core';
import { RackTop } from '@/components/RackTop';
import { RackMiddle } from '@/components/RackMiddle';
import { RackBottom } from '@/components/RackBottom';
import DeviceBlock from './DeviceBlock';
import { findPortElement, portFraction } from '../rack-device-editor/layout-utils';
import type { DeviceConnection, Side } from '@/types';

export const ROW_PX = 24;
const TOP_PX = 28;
const BOTTOM_PX = 42;
const RACK_WIDTH = 440;
// Matches DeviceBlock's own `left-5 right-5` insets (Tailwind 5 = 20px) —
// cable anchors need the exact same box a port tick renders inside, or a
// cable visibly lands short of / past the tick it's supposed to touch.
const DEVICE_LEFT = 20;
const DEVICE_RIGHT = RACK_WIDTH - 20;
// A dedicated lane strip to the right of the rack proper, real rather than
// this session's earlier ad-hoc "just extend a bit past 440 with
// overflow-visible" — the point raised against that: cables must stay
// *inside* the rack's own visual footprint, not spill into the page.
const GUTTER = 72;
const LANE_START = RACK_WIDTH + 12;
const LANE_GAP = 7;
const CORNER_R = 5;

/** Greedy interval-scheduling lane assignment: the cable that would occupy
 *  the vertical run [top,bottom] first at a given height goes in the
 *  first lane whose last-placed cable already cleared that height, else it
 *  opens a new lane. Doesn't match the real router's own algorithm (nor
 *  its two-sided left/right routing — everything here goes out the right),
 *  but produces the same *effect* the real markup shows: overlapping
 *  connections stack into progressively farther-out parallel lanes instead
 *  of drawing on top of each other. */
function assignLanes(items: Array<{ key: string; top: number; bottom: number }>): Map<string, number> {
  const laneBottoms: number[] = [];
  const laneOf = new Map<string, number>();
  const sorted = [...items].sort((a, b) => a.top - b.top);
  for (const item of sorted) {
    let lane = laneBottoms.findIndex((bottom) => bottom < item.top - 2);
    if (lane === -1) {
      lane = laneBottoms.length;
      laneBottoms.push(item.bottom);
    } else {
      laneBottoms[lane] = item.bottom;
    }
    laneOf.set(item.key, lane);
  }
  return laneOf;
}

/** An orthogonal cable with rounded corners, routed straight-out to a
 *  shared vertical lane and straight back in — the same three-straights-
 *  two-rounded-corners shape the real app's own `<path>`s use (there just
 *  with `Q` quadratic-bezier corners and, in the real version, lanes on
 *  both sides of the rack rather than only the right). */
function elbowPath(ax: number, ay: number, bx: number, by: number, laneX: number): string {
  if (Math.abs(by - ay) < 0.5) return `M ${ax} ${ay} L ${laneX} ${ay} L ${bx} ${by}`;
  const dir = by > ay ? 1 : -1;
  const r = Math.min(CORNER_R, Math.abs(by - ay) / 2);
  return [
    `M ${ax} ${ay}`,
    `L ${laneX - r} ${ay}`,
    `Q ${laneX} ${ay} ${laneX} ${ay + r * dir}`,
    `L ${laneX} ${by - r * dir}`,
    `Q ${laneX} ${by} ${laneX - r} ${by}`,
    `L ${bx} ${by}`
  ].join(' ');
}

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
  viewSide,
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
  /** Which of each device's own port sides (its own front/back panel, not
   *  which way it's mounted) DeviceBlock renders ticks for and cables
   *  anchor to — the rack elevation's Front/Back toggle. */
  viewSide: Side;
  /** Cables to draw between device blocks — only ones where *both* ends are
   *  in `devices` (i.e. both currently on-screen: same rack, same
   *  front/back side) *and* whose named port actually resolves to a real
   *  element get a line; the rest are real connections, just not drawn
   *  here (see the Connections list panel for the full set). */
  deviceConnections?: DeviceConnection[];
  onDeleteConnection?: (connectionId: string) => void;
}) {
  const units = Array.from({ length: heightU }, (_, i) => heightU - i);

  const occupiedBy = new Map<number, string>();
  for (const device of devices) {
    const start = device.unit || 1;
    const span = device.heightU || 1;
    for (let u = start; u < start + span; u++) occupiedBy.set(u, device._id);
  }

  const devicesById = new Map(devices.map((d) => [d._id, d]));

  // Each device's own box in the *outer* container's coordinate space
  // (TOP_PX already folded in) — the single source of truth both the
  // device layer and the cable anchors below are built from.
  const blockRects = new Map<string, { top: number; height: number }>();
  for (const device of devices) {
    const start = device.unit || 1;
    const span = device.heightU || 1;
    const topUnit = start + span - 1;
    const indexFromTop = heightU - topUnit;
    blockRects.set(device._id, { top: TOP_PX + indexFromTop * ROW_PX, height: span * ROW_PX });
  }

  /** Resolves a connection's port1Name/port2Name to real (x,y) anchors —
   *  null unless both devices are on-screen *and* each actually has a port
   *  by that name (a stray connection pointing at a since-deleted or
   *  since-relinked port draws nothing, rather than guessing). */
  function anchorsFor(conn: DeviceConnection): { ax: number; ay: number; bx: number; by: number } | null {
    const rectA = blockRects.get(conn.device1Id);
    const rectB = blockRects.get(conn.device2Id);
    const deviceA = devicesById.get(conn.device1Id);
    const deviceB = devicesById.get(conn.device2Id);
    if (!rectA || !rectB || !deviceA || !deviceB) return null;
    const elA = findPortElement(deviceA.elements || [], conn.port1Name);
    const elB = findPortElement(deviceB.elements || [], conn.port2Name);
    if (!elA || !elB) return null;
    const fracA = portFraction(elA, (deviceA.heightU || 1) * 2);
    const fracB = portFraction(elB, (deviceB.heightU || 1) * 2);
    return {
      ax: DEVICE_LEFT + fracA.x * (DEVICE_RIGHT - DEVICE_LEFT),
      ay: rectA.top + fracA.y * rectA.height,
      bx: DEVICE_LEFT + fracB.x * (DEVICE_RIGHT - DEVICE_LEFT),
      by: rectB.top + fracB.y * rectB.height
    };
  }

  const visibleConnections = deviceConnections
    .map((c) => ({ conn: c, anchors: anchorsFor(c) }))
    .filter((x): x is { conn: DeviceConnection; anchors: { ax: number; ay: number; bx: number; by: number } } => !!x.anchors);

  const laneOf = assignLanes(
    visibleConnections.map(({ conn, anchors }) => ({
      key: conn._id || conn.id || '',
      top: Math.min(anchors.ay, anchors.by),
      bottom: Math.max(anchors.ay, anchors.by)
    }))
  );

  const rackHeight = TOP_PX + heightU * ROW_PX + BOTTOM_PX;

  return (
    <div className="relative inline-block bg-[#0c0c0e] text-[#71717a] drop-shadow-xl" style={{ width: RACK_WIDTH + GUTTER }}>
      <div style={{ width: RACK_WIDTH }}>
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
                  viewSide={viewSide}
                />
              );
            })}
          </div>
        </div>

        <RackBottom className="w-full" style={{ height: BOTTOM_PX }} />
      </div>

      {/* Cables — confined to the rack's own footprint (RACK_WIDTH+GUTTER,
       * set on the outer relative container above), never spilling into
       * the surrounding page the way an overflow-visible jog off the
       * device edge used to. Routed straight out to a shared lane in the
       * gutter, then straight to the target row, with rounded corners —
       * the same three-straights/two-corners shape the real app's own
       * cable paths use. */}
      {visibleConnections.length > 0 && (
        <svg className="pointer-events-none absolute inset-0" width={RACK_WIDTH + GUTTER} height={rackHeight}>
          {visibleConnections.map(({ conn, anchors }) => {
            const id = conn._id || conn.id || '';
            const laneX = LANE_START + (laneOf.get(id) || 0) * LANE_GAP;
            return (
              <path
                key={id}
                d={elbowPath(anchors.ax, anchors.ay, anchors.bx, anchors.by, laneX)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                className={onDeleteConnection ? 'cursor-pointer hover:stroke-red-400' : undefined}
                style={{ pointerEvents: onDeleteConnection ? 'stroke' : 'none' }}
                onClick={() => onDeleteConnection?.(id)}
              >
                <title>{`${conn.port1Name} ↔ ${conn.port2Name}${onDeleteConnection ? ' — click to remove' : ''}`}</title>
              </path>
            );
          })}
        </svg>
      )}
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
