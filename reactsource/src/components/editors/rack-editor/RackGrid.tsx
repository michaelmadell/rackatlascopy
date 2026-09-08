import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TbPlugConnected } from 'react-icons/tb';
import { RackTop } from '@/components/RackTop';
import { RackMiddle } from '@/components/RackMiddle';
import { RackBottom } from '@/components/RackBottom';
import DeviceBlock from './DeviceBlock';
import { findPortElement, portFraction } from '../rack-device-editor/layout-utils';
import type { DeviceConnection, FaceElement, Side } from '@/types';

// Every number below is derived from ONE scale tied to the same real-world
// unit system app.patchdocs.io's own rack SVG uses — confirmed by
// inspecting a live rack's DOM directly: rack-outline -340..340, ear
// -270..270, device content -250..250 (all inside a ruler-inclusive
// -400..340, 740-wide, span — see RackTop.tsx's own comment, which the
// three SVG pieces' viewBoxes now match exactly), and vertically a 1U row
// is 50 tall, the top cap 58, the bottom cap 87 (RackTop.tsx/RackBottom.tsx
// viewBox heights). Deriving every pixel size from that one shared SCALE,
// instead of hand-tuning RACK_WIDTH/ROW_PX/DEVICE_LEFT/DEVICE_RIGHT
// independently, is what actually fixed devices rendering wider than the
// rack body the SVGs painted (the two systems could drift apart when
// hand-tuned separately) — the same reasoning applies to ROW_PX: it used
// to be a flat `24` chosen with no tie to RACK_WIDTH at all, giving each
// row a ~24.7:1 width:height ratio against the real rack's own ~13.6:1
// (680 wide : 50 tall) — every row read as squashed, wider than it should
// be for its height.
const RACK_REAL_SPAN = 740;
// Chosen so DEVICE_RIGHT-DEVICE_LEFT works out to 400px — this session's
// existing port layouts (portFraction, DeviceFaceGrid, ...) were all
// tuned against a ~400px-wide device face; the scale is otherwise
// arbitrary and could be any value without changing the proportions (ROW_PX
// etc. below all scale with it automatically).
const SCALE = 0.8;
const RACK_WIDTH = RACK_REAL_SPAN * SCALE; // 592 — the rack-outline's own right edge sits flush with this
export const ROW_PX = 50 * SCALE; // 40 — one rack unit, real height 50
const TOP_PX = 58 * SCALE; // 46.4 — RackTop's own real height
const BOTTOM_PX = 87 * SCALE; // 69.6 — RackBottom's own real height
const realX = (unitX: number) => (unitX + 400) * SCALE; // real rack-unit x (origin at the SVGs' own left edge, -400) → px within a RACK_WIDTH-wide row
const OUTLINE_LEFT = realX(-340);
const OUTLINE_RIGHT = realX(340); // === RACK_WIDTH, flush — no margin past it, unlike the old external gutter
const EAR_LEFT = realX(-270);
const EAR_RIGHT = realX(270);
const DEVICE_LEFT = realX(-250);
const DEVICE_RIGHT = realX(250);
// Cables route *inside* the rack's own footprint, in the same ear-to-
// outline zone app.patchdocs.io's own cables use (confirmed against real
// cable path data: lane x's like -278/-286/-307/-315, all between the
// ear's -270 and the outline's -340) — no more external gutter, which is
// what actually put cables outside the rack's own visible body. Both
// zones are the same width by construction (real-unit symmetry), so one
// constant covers both sides.
const LANE_ZONE = EAR_LEFT - OUTLINE_LEFT;
const LANE_GAP = Math.min(7, LANE_ZONE / 6);
const LANE_FIRST_OFFSET = Math.min(6, LANE_ZONE / 3);
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
  onCableDrop,
  selectedPort,
  onPortClick,
  onPinClick,
  zoom
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
  /** Fires when a cable drag (started on a port, see startPortDrag below)
   *  is dropped on a *different* device's port — a real recording's own
   *  direct connect flow: drag from a source port straight to a target
   *  port on the rack elevation, no dialog. This is the OTHER outcome of
   *  the same pointer-down-on-a-port gesture that also drives
   *  `onPortClick` below — released without moving = click (select +
   *  pin); released after moving onto another port = this. Undefined
   *  (readOnly) disables both. */
  onCableDrop?: (sourceDevice: any, sourceElement: FaceElement, targetDevice: any, targetElement: FaceElement) => void;
  /** Which port currently has the little orange pin floating above it —
   *  the *other* outcome of a port pointer-down (see `onCableDrop`
   *  above): released in place (no drag) just selects the port and drops
   *  a pin above it; the pin itself is what opens the Connect Port
   *  dialog when clicked. `deviceId`/`elementId` rather than the objects
   *  themselves so Editor.tsx (which owns this as lifted state) doesn't
   *  need to keep a stale device/element pair in sync. */
  selectedPort?: { deviceId: string; elementId: string } | null;
  /** Fires when a port tick is pressed and released *without* dragging —
   *  selects it (the caller decides what "selected" means: Editor.tsx
   *  also selects the owning device so the sidebar switches to it). */
  onPortClick?: (device: any, element: FaceElement) => void;
  /** Fires when the floating pin above the selected port is clicked —
   *  opens the Connect Port dialog for that exact port. */
  onPinClick?: (device: any, element: FaceElement) => void;
  /** CSS scale the whole elevation renders at (Editor.tsx's own zoom
   *  controls / ctrl+scroll) — everything on this component's own side
   *  (port ticks, cable paths, the selection pin) is computed in
   *  *pre-zoom* local units; the pin's own click target is a real DOM
   *  element sized in those same units, so it scales correctly for free
   *  as a child of the already-scaled container — no pointer-math
   *  conversion needed the way a live drag would have required. */
  zoom?: number;
}) {
  const zoomFactor = zoom || 1;
  const containerRef = useRef<HTMLDivElement>(null);
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

  // The selected port's own pin anchor — null unless `selectedPort` names a
  // port that's actually on-screen right now (this rack, this Front/Back
  // side). Plain (x,y): the pin is a real DOM element positioned with
  // this component's own local units, not an SVG path needing lane/rail
  // math the way a cable does.
  let pinAnchor: { device: any; element: FaceElement; x: number; y: number } | null = null;
  if (selectedPort) {
    const device = devicesById.get(selectedPort.deviceId);
    const element = device?.elements?.find((el: FaceElement) => el.id === selectedPort.elementId);
    const rect = device && blockRects.get(device._id);
    if (device && element && rect) {
      const frac = portFraction(element, (device.heightU || 1) * 2);
      pinAnchor = {
        device,
        element,
        x: DEVICE_LEFT + frac.x * (DEVICE_RIGHT - DEVICE_LEFT),
        y: rect.top + frac.y * rect.height
      };
    }
  }

  // The port pointer-down anchor for cable dragging vs. plain port
  // selection: a real recording shows both gestures start the same way
  // (press a port) and only diverge on release — moved past a small dead
  // zone before release = drag a cable onto another port (onCableDrop);
  // released in place = select this port and drop the pin (onPortClick).
  function startPortDrag(device: any, element: FaceElement, evt: ReactPointerEvent<HTMLDivElement>) {
    const startX = evt.clientX;
    const startY = evt.clientY;
    const DRAG_THRESHOLD = 4; // px
    let dragging = false;

    const toLocal = (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left) / zoomFactor, y: (clientY - rect.top) / zoomFactor };
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
      }
      const { x, y } = toLocal(e.clientX, e.clientY);
      setDragCable({ device, element, x, y });
    };

    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragCable(null);
      if (!dragging) {
        onPortClick?.(device, element);
        return;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-port-hit]') as HTMLElement | null;
      if (!target) return;
      const targetDevice = devicesById.get(target.dataset.deviceId || '');
      const targetElement = targetDevice?.elements?.find((el: FaceElement) => el.id === target.dataset.elementId);
      if (!targetDevice || !targetElement) return;
      if (targetDevice._id === device._id && targetElement.id === element.id) return; // dropped back on itself
      onCableDrop?.(device, element, targetDevice, targetElement);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Live dashed preview of an in-progress cable drag — null unless
  // `dragCable` names a port actually being dragged from right now, same
  // ax/ay/railAy anchor math anchorsFor() uses for a settled connection,
  // just with `bx`/`by` following the pointer instead of a resolved
  // target port.
  let dragPreview: { ax: number; ay: number; bx: number; by: number; laneX: number; railAy: number } | null = null;
  if (dragCable) {
    const rect = blockRects.get(dragCable.device._id);
    if (rect) {
      const frac = portFraction(dragCable.element, (dragCable.device.heightU || 1) * 2);
      const ax = DEVICE_LEFT + frac.x * (DEVICE_RIGHT - DEVICE_LEFT);
      const ay = rect.top + frac.y * rect.height;
      const railAy = railY(rect, frac);
      const laneX =
        dragCable.x >= ax
          ? Math.min(EAR_RIGHT + LANE_FIRST_OFFSET, OUTLINE_RIGHT)
          : Math.max(EAR_LEFT - LANE_FIRST_OFFSET, OUTLINE_LEFT);
      dragPreview = { ax, ay, bx: dragCable.x, by: dragCable.y, laneX, railAy };
    }
  }

  return (
    // Outer box sized to the *post-zoom* footprint — a CSS transform alone
    // changes what's painted, not the layout box a `transform`ed element
    // still occupies, so without this the scrollable canvas around
    // RackGrid would keep reserving room for the un-zoomed size (clipping
    // the rack at zoom>1, leaving dead scroll space at zoom<1).
    <div style={{ width: RACK_WIDTH * zoomFactor, height: rackHeight * zoomFactor }}>
      <div
        ref={containerRef}
        className="relative inline-block bg-[#0c0c0e] text-[#71717a] drop-shadow-xl"
        style={{ width: RACK_WIDTH, transform: `scale(${zoomFactor})`, transformOrigin: 'top left' }}
    >
      <div>
        <RackTop className="w-full" style={{ height: TOP_PX }} />

        <div className="relative" style={{ height: heightU * ROW_PX }}>
          <div className="absolute inset-0 flex flex-col">
            {units.map((u, i) => (
              <RackSlot
                key={u}
                unit={u}
                slotIndex={i}
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
                  left={EAR_LEFT}
                  right={RACK_WIDTH - EAR_RIGHT}
                  contentInset={DEVICE_LEFT - EAR_LEFT}
                  selected={selectedDeviceId === device._id}
                  onSelect={() => onSelectDevice?.(device._id)}
                  readOnly={readOnly}
                  viewSide={viewSide}
                  connectedPortNames={connectedNamesByDevice.get(device._id)}
                  onPortPointerDown={onCableDrop || onPortClick ? startPortDrag : undefined}
                />
              );
            })}
          </div>
        </div>

        <RackBottom className="w-full" style={{ height: BOTTOM_PX }} />
      </div>

      {/* Cables — confined to the rack's own footprint (RACK_WIDTH exactly,
       * same as the outer container above; anchorsFor() and the lane
       * constants are all already rack-local, x=0 at this container's own
       * left edge), never spilling past the visible rack body the way
       * both an external gutter and the SVGs' own over-wide viewBoxes
       * used to let them. */}
      {(visibleConnections.length > 0 || dragPreview) && (
        <svg className="pointer-events-none absolute inset-0" width={RACK_WIDTH} height={rackHeight}>
          {dragPreview && (
            <>
              <path
                d={elbowPath(dragPreview.ax, dragPreview.ay, dragPreview.bx, dragPreview.by, dragPreview.laneX, dragPreview.railAy, dragPreview.by)}
                fill="none"
                stroke="#f97316"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <circle cx={dragPreview.bx} cy={dragPreview.by} r={4} fill="#f97316" />
            </>
          )}
          {visibleConnections.map(({ conn, anchors }) => {
            const id = conn._id || conn.id || '';
            const placement = laneOf.get(id) || { side: 'right' as const, lane: 0 };
            // Each further lane moves *outward* — more positive on the
            // right, more negative on the left — so overlapping cables
            // fan away from the rack rather than stacking on one line.
            // Clamped to the outline: more lanes than the zone can fit
            // stack on the outermost one rather than spilling past the
            // rack's own visible edge.
            const laneX =
              placement.side === 'right'
                ? Math.min(EAR_RIGHT + LANE_FIRST_OFFSET + placement.lane * LANE_GAP, OUTLINE_RIGHT)
                : Math.max(EAR_LEFT - LANE_FIRST_OFFSET - placement.lane * LANE_GAP, OUTLINE_LEFT);
            return (
              <path
                key={id}
                d={elbowPath(anchors.ax, anchors.ay, anchors.bx, anchors.by, laneX, anchors.railAy, anchors.railBy)}
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

      {/* The pin — a real recording corrected this session's own earlier
       * assumption that connecting was a drag: clicking a port just
       * selects it and drops this pin above it; clicking the *pin* is
       * what opens the Connect Port dialog (Editor.tsx's onPinClick,
       * same dialog either an existing "Connect" button or the Wired
       * ports list's own shortcut icon already opened). A real DOM
       * button, not part of the pointer-events-none cable svg, so it's
       * actually clickable; its own local-unit position scales for free
       * as a child of the already-`transform: scale`d container above. */}
      {pinAnchor && onPinClick && (
        <button
          type="button"
          onClick={() => onPinClick(pinAnchor!.device, pinAnchor!.element)}
          className="absolute flex size-5 -translate-x-1/2 -translate-y-[125%] items-center justify-center rounded-full bg-orange-500 text-white shadow-md hover:bg-orange-400"
          style={{ left: pinAnchor.x, top: pinAnchor.y }}
          title="Connect this port"
        >
          <TbPlugConnected className="size-3" />
        </button>
      )}
      </div>
    </div>
  );
}

function RackSlot({
  unit,
  slotIndex,
  occupied,
  readOnly,
  hoverState
}: {
  unit: number;
  /** 0-based render position from the top — real markup carries this as
   *  `data-slot-index` alongside `data-height-unit` (the rack's own
   *  numbering, e.g. 42 down to 1). */
  slotIndex: number;
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
      <RackMiddle unitNumber={unit} slotIndex={slotIndex} className="w-full h-full" />
    </div>
  );
}
