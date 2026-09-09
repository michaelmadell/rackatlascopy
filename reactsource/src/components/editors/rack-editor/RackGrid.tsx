import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TbPlugConnected } from 'react-icons/tb';
import { RackTop } from '@/components/RackTop';
import { RackMiddle } from '@/components/RackMiddle';
import { RackBottom } from '@/components/RackBottom';
import DeviceBlock from './DeviceBlock';
import { findPortElement, portFraction, mountedPortSide } from '../rack-device-editor/layout-utils';
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
const EAR_LEFT = realX(-270);
const EAR_RIGHT = realX(270);
const DEVICE_LEFT = realX(-250);
const DEVICE_RIGHT = realX(250);
// Cables route *inside* the rack's own footprint, in the same ear-to-
// outline zone app.patchdocs.io's own cables use — confirmed by pulling
// real `<path class="cable">` `d` data directly out of a live rack's DOM
// (not eyeballed), including independently reading back each device's own
// box position (its group's `transform`) to know exactly which real-unit Y
// each `d` coordinate corresponds to. That showed two things a first pass
// at this missed:
//  1. No lane fan-out, ever — every cross-device cable, including several
//     built specifically to overlap the same vertical span, used the exact
//     same depth from the ear on whichever side it routed to. This file's
//     own earlier `assignLanes` (each additional overlapping cable pushed
//     further out into its own lane) was invented, never observed.
//  2. The approach into the ear isn't one rounded corner — it's a small
//     3-corner staircase right at each end (see `elbowPath` below), which
//     is what actually gives a real cable its "notched" look near a
//     device's edge; a single corner reads as visibly too plain/direct.
// JOG1/JOG2/GAP/TRUNK_OUTER are the four depths-from-the-ear a real path's
// own `Q` control points land on, in order (8, 16, 37, 45) — 37 = JOG2+GAP,
// not some other combination, confirmed against the same real `d` data.
const JOG1 = 8 * SCALE;
const JOG2 = 16 * SCALE;
const GAP = 21 * SCALE;
const TRUNK_OUTER = JOG2 + GAP + 8 * SCALE; // 45 * SCALE
// A real recording's own corner radius, pulled from the same path data
// (every `Q` command's control point sits exactly 8 real units from both
// its neighbors) — was a flat, untied `5` before.
const CORNER_R = 8 * SCALE;

/** An orthogonal cable with rounded corners, routed out to a shared
 *  vertical trunk on one side of the rack and back in — matching a real
 *  recording's own `<path>` shape (`Q` quadratic-bezier corners) *and* its
 *  own approach into the ear: not one corner into a flat lane, but a small
 *  3-corner staircase at each end (out-8, further-16-then-a-21-unit-run,
 *  then out to the trunk at 45) before the long straight run down the
 *  trunk itself. `side` picks which ear (`'left'`|`'right'`) this cable
 *  routes past — see `chooseSide`.
 *
 *  `railAy`/`railBy` (default: no hop, same as `ay`/`by`) let a cable run
 *  along a shared horizontal "bus" flush with a device's own top or bottom
 *  edge before turning into the trunk — a real recording showed every
 *  connected port drops a short straight stub to that rail rather than
 *  routing to the trunk from its own exact height, so cables from ports at
 *  different rows on the same device edge still read as one shared run. */
function elbowPath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  side: 'left' | 'right',
  railAy: number = ay,
  railBy: number = by
): string {
  const dirX = side === 'left' ? -1 : 1;
  const earX = side === 'left' ? EAR_LEFT : EAR_RIGHT;
  const stubA = railAy !== ay ? `M ${ax} ${ay} L ${ax} ${railAy} ` : `M ${ax} ${railAy} `;
  const tailB = railBy !== by ? ` L ${bx} ${by}` : '';

  const xD1 = earX + dirX * JOG1;
  const xD2 = earX + dirX * JOG2;
  const xD3 = earX + dirX * (JOG2 + GAP);
  const xD4 = earX + dirX * TRUNK_OUTER;

  // Degenerate: both ends share a rail height (two devices happen to sit
  // at the same real Y) — no vertical trunk run needed, just a single pass
  // through the trunk depth at that one Y.
  if (Math.abs(railBy - railAy) < 0.5) {
    const hA = xD4 >= ax ? 1 : -1;
    const hB = xD4 >= bx ? 1 : -1;
    return `${stubA}L ${xD4 - CORNER_R * hA} ${railAy} L ${xD4 + CORNER_R * hB} ${railBy}${tailB}`;
  }

  const r = CORNER_R;
  const vDir = railBy > railAy ? 1 : -1;
  const hA = xD1 >= ax ? 1 : -1;
  const yA1 = railAy + r * vDir;
  const yA2 = yA1 + r * vDir;
  const yA3 = yA2 + r * vDir;
  const hB = xD1 >= bx ? 1 : -1;
  const yB1 = railBy - r * vDir;
  const yB2 = yB1 - r * vDir;
  const yB3 = yB2 - r * vDir;

  return [
    stubA.trim(),
    `L ${xD1 - r * hA} ${railAy}`,
    `Q ${xD1} ${railAy} ${xD1} ${yA1}`,
    `Q ${xD1} ${yA2} ${xD2} ${yA2}`,
    `L ${xD3} ${yA2}`,
    `Q ${xD4} ${yA2} ${xD4} ${yA3}`,
    `L ${xD4} ${yB3}`,
    `Q ${xD4} ${yB2} ${xD3} ${yB2}`,
    `L ${xD2} ${yB2}`,
    `Q ${xD1} ${yB2} ${xD1} ${yB1}`,
    `Q ${xD1} ${railBy} ${xD1 - r * hB} ${railBy}`,
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

/** Two ports on the *same* device, anchored to the *same* rail — a real
 *  recording never sends this pair all the way out to the ear/trunk the
 *  way a cross-device cable goes; it stays local, a small loop that clears
 *  the row by exactly one corner radius and comes straight back down,
 *  confirmed by pulling this exact shape's `d` data off two ports on one
 *  patch panel (24 apart, same rail — the loop still never reached the
 *  ear). The rotated mirror of `elbowPath`: a single shared HORIZONTAL
 *  lane at `rail ± CORNER_R` instead of a vertical one, since both ports
 *  already share a rail height and only differ in column. */
function localHopPath(ax: number, ay: number, bx: number, by: number, rail: number): string {
  const stubA = rail !== ay ? `M ${ax} ${ay} L ${ax} ${rail} ` : `M ${ax} ${rail} `;
  const tailB = rail !== by ? ` L ${bx} ${by}` : '';
  // Continue past the rail in the same sense the stub was already
  // heading — outward from the device, not back into it.
  const dir = Math.sign(rail - ay) || Math.sign(rail - by) || -1;
  const laneY = rail + dir * CORNER_R;
  const hDirA = bx >= ax ? 1 : -1;
  const hDirB = ax >= bx ? 1 : -1;
  return [
    stubA.trim(),
    `Q ${ax} ${laneY} ${ax + CORNER_R * hDirA} ${laneY}`,
    `L ${bx - CORNER_R * hDirB} ${laneY}`,
    `Q ${bx} ${laneY} ${bx} ${rail}${tailB}`
  ].join(' ');
}

/** Which ear a cross-device cable routes past — whichever side the pair's
 *  own midpoint sits closer to, matching both real routes this session
 *  pulled `d` data for (one pair whose midpoint sat left of rack-center
 *  routed left; one whose midpoint sat right routed right). */
function chooseSide(ax: number, bx: number): 'left' | 'right' {
  return (ax + bx) / 2 < (EAR_LEFT + EAR_RIGHT) / 2 ? 'left' : 'right';
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
  onCableDrop,
  selectedPort,
  onPortClick,
  onPinClick,
  onSlotClick,
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
  /** Fires when an empty slot's own "+" placeholder is clicked (not
   *  dragged) — real app opens the "Add device" dialog scoped to *no*
   *  category yet (a category grid: Cable Manager/Firewall/.../UPS),
   *  distinct from the drag-a-palette-chip flow, which already knows its
   *  category before the dialog opens. Undefined (readOnly) disables it,
   *  same as onCableDrop/onPortClick above. */
  onSlotClick?: (unit: number) => void;
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
   *  since-relinked port draws nothing, rather than guessing) *and* that
   *  port is the one actually facing `viewSide` right now (mountedPortSide
   *  — a device now always renders on both Front and Back, see
   *  Editor.tsx's own comment on `visibleSubDevices`, so a connection to a
   *  port on the *other* face needs this check or it'd draw a cable to a
   *  panel that isn't the one currently showing). */
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
    if (elA.side !== mountedPortSide(deviceA, viewSide) || elB.side !== mountedPortSide(deviceB, viewSide)) return null;
    const fracA = portFraction(elA, (deviceA.heightU || 1) * 2);
    const fracB = portFraction(elB, (deviceB.heightU || 1) * 2);
    return {
      ax: DEVICE_LEFT + fracA.x * (DEVICE_RIGHT - DEVICE_LEFT),
      ay: rectA.top + fracA.y * rectA.height,
      bx: DEVICE_LEFT + fracB.x * (DEVICE_RIGHT - DEVICE_LEFT),
      by: rectB.top + fracB.y * rectB.height,
      railAy: railY(rectA, fracA),
      railBy: railY(rectB, fracB),
      // Same device *and* same rail — the only case that gets the local
      // hop (localHopPath) instead of the ear/trunk route (elbowPath); see
      // both functions' own comments for what a real recording showed. A
      // same-device pair on *different* rails (top row to bottom row) has
      // no real example to confirm — falls back to the ear/trunk route
      // rather than guessing a shape nothing verified.
      localHop: conn.device1Id === conn.device2Id && railY(rectA, fracA) === railY(rectB, fracB)
    };
  }

  const visibleConnections = deviceConnections
    .map((c) => ({ conn: c, anchors: anchorsFor(c) }))
    .filter(
      (x): x is { conn: DeviceConnection; anchors: NonNullable<ReturnType<typeof anchorsFor>> } => !!x.anchors
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
  // side — checked via mountedPortSide since a device now renders on both
  // faces: without this, toggling Front/Back after selecting a port left
  // its pin floating over whichever face happened to share that row/col,
  // even though that port itself isn't the one showing there). Plain
  // (x,y): the pin is a real DOM element positioned with this component's
  // own local units, not an SVG path needing lane/rail math the way a
  // cable does.
  let pinAnchor: { device: any; element: FaceElement; x: number; y: number } | null = null;
  if (selectedPort) {
    const device = devicesById.get(selectedPort.deviceId);
    const element = device?.elements?.find((el: FaceElement) => el.id === selectedPort.elementId);
    const rect = device && blockRects.get(device._id);
    if (device && element && rect && element.side === mountedPortSide(device, viewSide)) {
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
  let dragPreview: { ax: number; ay: number; bx: number; by: number; side: 'left' | 'right'; railAy: number } | null = null;
  if (dragCable) {
    const rect = blockRects.get(dragCable.device._id);
    if (rect) {
      const frac = portFraction(dragCable.element, (dragCable.device.heightU || 1) * 2);
      const ax = DEVICE_LEFT + frac.x * (DEVICE_RIGHT - DEVICE_LEFT);
      const ay = rect.top + frac.y * rect.height;
      const railAy = railY(rect, frac);
      // Live drag doesn't know the drop target's device yet (still just
      // following the cursor), so it can't tell whether this'll end up a
      // local hop or a cross-device route — always previews the ear/trunk
      // shape, the more common case, same as elbowPath everywhere else.
      const side = chooseSide(ax, dragCable.x);
      dragPreview = { ax, ay, bx: dragCable.x, by: dragCable.y, side, railAy };
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
                onSlotClick={onSlotClick}
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
                d={elbowPath(dragPreview.ax, dragPreview.ay, dragPreview.bx, dragPreview.by, dragPreview.side, dragPreview.railAy, dragPreview.by)}
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
            // localHop (same device, same rail): a small loop that never
            // leaves the row. Otherwise: the ear/trunk route — same fixed
            // depths on every cable, no fan-out (see JOG1/JOG2/GAP/
            // TRUNK_OUTER's own comment for why that's a deliberate match
            // to a real recording, not a missing feature).
            const d = anchors.localHop
              ? localHopPath(anchors.ax, anchors.ay, anchors.bx, anchors.by, anchors.railAy)
              : elbowPath(
                  anchors.ax,
                  anchors.ay,
                  anchors.bx,
                  anchors.by,
                  chooseSide(anchors.ax, anchors.bx),
                  anchors.railAy,
                  anchors.railBy
                );
            return (
              // Real recording: hovering a cable turns it orange (no click
              // affordance at all — deleting a connection only happens from
              // the Connections list panel's own delete icon, confirmed
              // against a real recording that a click on the trace itself
              // does nothing). `pointerEvents: 'stroke'` still needed so
              // hover can register on a 1.5px line without requiring a
              // pixel-perfect hover.
              <path
                key={id}
                d={d}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                className="hover:stroke-orange-400"
                style={{ pointerEvents: 'stroke' }}
              >
                <title>{`${conn.port1Name} ↔ ${conn.port2Name}`}</title>
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
  onSlotClick,
  hoverState
}: {
  unit: number;
  /** 0-based render position from the top — real markup carries this as
   *  `data-slot-index` alongside `data-height-unit` (the rack's own
   *  numbering, e.g. 42 down to 1). */
  slotIndex: number;
  occupied: boolean;
  readOnly?: boolean;
  onSlotClick?: (unit: number) => void;
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
      // Only an empty slot's own placeholder ("+") is clickable — an
      // occupied one is visually covered by its DeviceBlock overlay anyway,
      // but guard it too rather than rely on that alone.
      onClick={!readOnly && !occupied && onSlotClick ? () => onSlotClick(unit) : undefined}
    >
      <RackMiddle unitNumber={unit} slotIndex={slotIndex} className="w-full h-full" />
    </div>
  );
}
