import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { RackTop } from '@/components/RackTop';
import { RackMiddle } from '@/components/RackMiddle';
import { RackBottom } from '@/components/RackBottom';
import DeviceBlock from './DeviceBlock';
import { findPortElement, portFraction } from '../rack-device-editor/layout-utils';
import type { DeviceConnection, FaceElement, Side } from '@/types';

export const ROW_PX = 24;
const TOP_PX = 28;
const BOTTOM_PX = 42;
const RACK_WIDTH = 440;
// Matches DeviceBlock's own `left-5 right-5` insets (Tailwind 5 = 20px) —
// cable anchors need the exact same box a port tick renders inside, or a
// cable visibly lands short of / past the tick it's supposed to touch.
const DEVICE_LEFT = 20;
const DEVICE_RIGHT = RACK_WIDTH - 20;
// Dedicated lane strips on *both* sides of the rack proper — a real
// screen recording showed cables routed left as often as right, not just
// right (this session's earlier assumption). Both gutters are part of the
// same visual footprint (the outer container below is sized to include
// them), never spilling into the surrounding page the way an
// overflow-visible jog off the device edge used to.
const GUTTER = 72;
const LANE_START_RIGHT = RACK_WIDTH + 12;
const LANE_START_LEFT = -12;
const LANE_GAP = 7;
const CORNER_R = 5;

/** Greedy interval-scheduling lane assignment across *two* sides: the
 *  cable that would occupy the vertical run [top,bottom] first at a given
 *  height goes in the first still-clear lane on whichever side already
 *  has room, opening a new lane (on the side with fewer lanes so far, to
 *  keep both sides roughly balanced) only when neither does. Doesn't
 *  match the real router's own algorithm — that's not reverse-
 *  engineerable from a video alone — but produces the same *effect* the
 *  recording shows: connections spread across both sides and overlapping
 *  ones stack into parallel lanes instead of drawing on top of each
 *  other. */
function assignLanes(
  items: Array<{ key: string; top: number; bottom: number }>
): Map<string, { side: 'left' | 'right'; lane: number }> {
  const leftLanes: number[] = [];
  const rightLanes: number[] = [];
  const result = new Map<string, { side: 'left' | 'right'; lane: number }>();
  const firstFreeLane = (lanes: number[], top: number) => lanes.findIndex((bottom) => bottom < top - 2);
  const sorted = [...items].sort((a, b) => a.top - b.top);

  for (const item of sorted) {
    const leftFree = firstFreeLane(leftLanes, item.top);
    const rightFree = firstFreeLane(rightLanes, item.top);
    let side: 'left' | 'right';
    let lane: number;
    if (leftFree !== -1 && rightFree !== -1) {
      side = leftLanes.length <= rightLanes.length ? 'left' : 'right';
      lane = side === 'left' ? leftFree : rightFree;
    } else if (leftFree !== -1) {
      side = 'left';
      lane = leftFree;
    } else if (rightFree !== -1) {
      side = 'right';
      lane = rightFree;
    } else {
      side = leftLanes.length <= rightLanes.length ? 'left' : 'right';
      lane = side === 'left' ? leftLanes.length : rightLanes.length;
    }
    const lanes = side === 'left' ? leftLanes : rightLanes;
    lanes[lane] = item.bottom;
    result.set(item.key, { side, lane });
  }
  return result;
}

/** An orthogonal cable with rounded corners, routed straight-out to a
 *  shared vertical lane and straight back in — the same three-straights-
 *  two-rounded-corners shape the real app's own `<path>`s use (`Q`
 *  quadratic-bezier corners). Symmetric in `laneX` vs. `ax`/`bx` so the
 *  same function draws both left-routed (laneX below both anchors) and
 *  right-routed (laneX above both) cables.
 *
 *  `railAy`/`railBy` (default: no hop, same as `ay`/`by`) let a cable run
 *  along a shared horizontal "bus" flush with a device's own top or bottom
 *  edge before turning into the lane — a real recording showed every
 *  connected port drops a short straight stub to that rail rather than
 *  routing to the lane from its own exact height, so cables from ports at
 *  different rows on the same device edge still read as one shared run. */
function elbowPath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  laneX: number,
  railAy: number = ay,
  railBy: number = by
): string {
  const stubA = railAy !== ay ? `M ${ax} ${ay} L ${ax} ${railAy} ` : `M ${ax} ${railAy} `;
  const tailB = railBy !== by ? ` L ${bx} ${by}` : '';
  const hDirA = laneX >= ax ? 1 : -1;
  const hDirB = laneX >= bx ? 1 : -1;
  if (Math.abs(railBy - railAy) < 0.5) return `${stubA}L ${laneX} ${railAy} L ${bx} ${railBy}${tailB}`;
  const vDir = railBy > railAy ? 1 : -1;
  const r = Math.min(CORNER_R, Math.abs(railBy - railAy) / 2);
  return [
    stubA.trim(),
    `L ${laneX - r * hDirA} ${railAy}`,
    `Q ${laneX} ${railAy} ${laneX} ${railAy + r * vDir}`,
    `L ${laneX} ${railBy - r * vDir}`,
    `Q ${laneX} ${railBy} ${laneX - r * hDirB} ${railBy}`,
    `L ${bx} ${railBy}${tailB}`
  ].join(' ');
}

/** Which of a device's own top/bottom edges a port's cable hops to before
 *  heading to the lane — the upper sub-row rail (`rect.top`) for a port in
 *  the top half of the device's face, the lower rail (`rect.top +
 *  rect.height`) otherwise. */
function railY(rect: { top: number; height: number }, frac: { y: number }): number {
  return frac.y < 0.5 ? rect.top : rect.top + rect.height;
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
  onDeleteConnection,
  onCableDrop
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
  /** Fires once a cable drag (see onPortPointerDown below) is dropped on a
   *  *different* device's port — a real recording's own connect flow: drag
   *  from a source port straight to a target port on the rack elevation,
   *  no dialog. Undefined (readOnly) disables the drag entirely. */
  onCableDrop?: (sourceDevice: any, sourceElement: FaceElement, targetDevice: any, targetElement: FaceElement) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Live cable-drag state: the source port plus the pointer's current
  // rack-local position, so a dashed preview can track the cursor from
  // source port to whatever's under it. Cleared on drop or cancel.
  const [dragCable, setDragCable] = useState<{ device: any; element: FaceElement; x: number; y: number } | null>(null);

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
  function anchorsFor(
    conn: DeviceConnection
  ): { ax: number; ay: number; bx: number; by: number; railAy: number; railBy: number } | null {
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
      by: rectB.top + fracB.y * rectB.height,
      railAy: railY(rectA, fracA),
      railBy: railY(rectB, fracB)
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

  // Port names already carrying a cable, per device — DeviceBlock swaps in
  // a filled plug glyph for these instead of the bare port-type outline.
  const connectedNamesByDevice = new Map<string, Set<string>>();
  for (const c of deviceConnections) {
    if (!connectedNamesByDevice.has(c.device1Id)) connectedNamesByDevice.set(c.device1Id, new Set());
    connectedNamesByDevice.get(c.device1Id)!.add(c.port1Name);
    if (!connectedNamesByDevice.has(c.device2Id)) connectedNamesByDevice.set(c.device2Id, new Set());
    connectedNamesByDevice.get(c.device2Id)!.add(c.port2Name);
  }

  /** Native pointer-event drag, same family as the resize handles use
   *  elsewhere in this editor — dnd-kit's own drag machinery is already
   *  claimed by device repositioning, so a cable drag can't reuse it
   *  without the two fighting over the same pointerdown. Tracks the
   *  pointer with window-level listeners (the source port element itself
   *  isn't under the cursor for most of the drag) and resolves the drop
   *  target via `elementFromPoint` + the `data-port-hit` marker every port
   *  tick carries. */
  function startPortDrag(device: any, element: FaceElement, evt: { clientX: number; clientY: number }) {
    if (onCableDrop === undefined) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragCable({ device, element, x: evt.clientX - rect.left, y: evt.clientY - rect.top });

    const onMove = (e: PointerEvent) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r) return;
      setDragCable((prev) => (prev ? { ...prev, x: e.clientX - r.left, y: e.clientY - r.top } : prev));
    };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragCable(null);
      const hit = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
        '[data-port-hit]'
      ) as HTMLElement | null;
      if (!hit) return;
      const targetDevice = devices.find((d) => d._id === hit.dataset.deviceId);
      const targetElement = targetDevice?.elements?.find((el: FaceElement) => el.id === hit.dataset.elementId);
      if (!targetDevice || !targetElement) return;
      // A cable always runs between two different devices in every example
      // seen — self-loops are rejected rather than guessed at.
      if (targetDevice._id === device._id) return;
      onCableDrop?.(device, element, targetDevice, targetElement);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Live preview anchors — null until a drag is in flight.
  let dragPreview: { ax: number; ay: number; bx: number; by: number; laneX: number; railAy: number } | null = null;
  if (dragCable) {
    const rect = blockRects.get(dragCable.device._id);
    if (rect) {
      const frac = portFraction(dragCable.element, (dragCable.device.heightU || 1) * 2);
      const ax = GUTTER + DEVICE_LEFT + frac.x * (DEVICE_RIGHT - DEVICE_LEFT);
      const ay = rect.top + frac.y * rect.height;
      const side: 'left' | 'right' = dragCable.x >= ax ? 'right' : 'left';
      const laneX = GUTTER + (side === 'right' ? LANE_START_RIGHT : LANE_START_LEFT);
      dragPreview = { ax, ay, bx: dragCable.x, by: dragCable.y, laneX, railAy: railY(rect, frac) };
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block bg-[#0c0c0e] text-[#71717a] drop-shadow-xl"
      style={{ width: RACK_WIDTH + GUTTER * 2 }}
    >
      <div style={{ width: RACK_WIDTH, marginLeft: GUTTER }}>
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
                  connectedPortNames={connectedNamesByDevice.get(device._id)}
                  onPortPointerDown={onCableDrop ? startPortDrag : undefined}
                />
              );
            })}
          </div>
        </div>

        <RackBottom className="w-full" style={{ height: BOTTOM_PX }} />
      </div>

      {/* Cables — confined to the rack's own footprint (RACK_WIDTH + a
       * gutter on *each* side, set on the outer relative container above),
       * never spilling into the surrounding page the way an
       * overflow-visible jog off the device edge used to. anchorsFor()
       * and the lane constants are all rack-local (0 = the rack proper's
       * own left edge, which sits GUTTER px into this outer container —
       * see its marginLeft above), so every x gets +GUTTER here at draw
       * time rather than threading an offset through the anchor math. */}
      {(visibleConnections.length > 0 || dragPreview) && (
        <svg className="pointer-events-none absolute inset-0" width={RACK_WIDTH + GUTTER * 2} height={rackHeight}>
          {dragPreview && (
            <>
              <path
                d={elbowPath(
                  dragPreview.ax,
                  dragPreview.ay,
                  dragPreview.bx,
                  dragPreview.by,
                  dragPreview.laneX,
                  dragPreview.railAy
                )}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <circle cx={dragPreview.ax} cy={dragPreview.ay} r={4} fill="#f97316" />
            </>
          )}
          {visibleConnections.map(({ conn, anchors }) => {
            const id = conn._id || conn.id || '';
            const placement = laneOf.get(id) || { side: 'right' as const, lane: 0 };
            // Each further lane moves *outward* — more positive on the
            // right, more negative on the left — so overlapping cables
            // fan away from the rack rather than stacking on one line.
            const laneX =
              GUTTER + (placement.side === 'right' ? LANE_START_RIGHT + placement.lane * LANE_GAP : LANE_START_LEFT - placement.lane * LANE_GAP);
            return (
              <path
                key={id}
                d={elbowPath(
                  GUTTER + anchors.ax,
                  anchors.ay,
                  GUTTER + anchors.bx,
                  anchors.by,
                  laneX,
                  anchors.railAy,
                  anchors.railBy
                )}
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
