import type { FaceElement, Side } from './port-types';
import { PORT_COLUMNS } from './port-types';

/** A port's position within its device's own face, as fractions (0..1) of
 *  the device's width/height — shared by the rack-device-editor's own grid
 *  math and, more importantly, the rack elevation (DeviceBlock's on-block
 *  port ticks and RackGrid's cable anchors both need the exact same
 *  col/row → fraction mapping so a cable actually lands on the tick it's
 *  supposed to). `subRows` is the *device's own* row count
 *  (heightU * SUB_ROWS_PER_U), not the rack's. */
export function portFraction(el: FaceElement, subRows: number): { x: number; y: number } {
  return {
    x: (el.col + 0.5) / PORT_COLUMNS,
    y: (el.row + 0.5) / Math.max(subRows, 1)
  };
}

/** Which of a device's own two physical port sides (`FaceElement.side`) is
 *  actually facing `viewSide` — accounting for `device.side`, which way
 *  the device is physically *mounted* in the rack, not which face you're
 *  looking at. A normally (front-)mounted device's own front panel faces
 *  the rack's front, so no swap. A device mounted facing the rack's back
 *  has its physical front panel visible from the rack's *back*, and its
 *  rear panel visible from the rack's *front* — the two swap. Shared by
 *  DeviceBlock (which ports it draws ticks for) and RackGrid (which
 *  connections it draws a cable for) so the two can't drift out of sync
 *  the way two independent inline copies of this swap logic could. */
export function mountedPortSide(device: { side?: Side }, viewSide: Side): Side {
  const mountedSide = device.side || 'front';
  if (mountedSide !== 'back') return viewSide;
  return viewSide === 'front' ? 'back' : 'front';
}

/** Resolves a connection's `port1Name`/`port2Name` back to the actual
 *  FaceElement on a device — the only handle a DeviceConnection has on a
 *  port is its computed name, so a real anchor point needs this reverse
 *  lookup (mirrors how the server matches a port by name in
 *  device-connection.ts's addConnectionToElement). */
export function findPortElement(elements: FaceElement[], portName: string): FaceElement | undefined {
  return elements.find((el) => el.kind === 'port' && computePortNumber(el, elements) === portName);
}

/** Ports sharing a group share idPrefix/connectorType/countingDirection and
 *  number together, ordered column-major (down each column fully before
 *  moving to the next column right) — verified against a real 2x2 SFP
 *  group: (col0,row0)=01, (col0,row1)=02, (col1,row0)=03, (col1,row1)=04.
 *  `countingDirection: 'rtl'` reverses that whole sequence. `01`-style
 *  two-digit padding matches the real editor's own freshly-dropped port. */
export function computePortNumber(el: FaceElement, all: FaceElement[]): string {
  if (el.value) return el.value; // explicit per-port override
  const groupPorts = all
    .filter((p) => p.kind === 'port' && p.groupId === el.groupId)
    .sort((a, b) => a.col - b.col || a.row - b.row);
  const ordered = el.countingDirection === 'rtl' ? [...groupPorts].reverse() : groupPorts;
  const index = ordered.findIndex((p) => p.id === el.id);
  const num = String(index + 1).padStart(2, '0');
  return `${el.idPrefix || ''}${num}`;
}

/** Where a dropped port type lands: joins an adjacent same-type, same-side
 *  port's group (sharing its settings) if one sits immediately left,
 *  right, above, or below the target cell, otherwise starts a fresh
 *  group. */
export function resolveGroupForDrop(
  portType: string,
  side: Side,
  row: number,
  col: number,
  existing: FaceElement[]
): { groupId: string; idPrefix: string; connectorType: string; countingDirection: FaceElement['countingDirection'] } {
  const neighbor = existing.find(
    (p) =>
      p.kind === 'port' &&
      p.side === side &&
      p.portType === portType &&
      ((p.row === row && (p.col === col - 1 || p.col === col + 1)) ||
        (p.col === col && (p.row === row - 1 || p.row === row + 1)))
  );
  if (neighbor) {
    return {
      groupId: neighbor.groupId!,
      idPrefix: neighbor.idPrefix || '',
      connectorType: neighbor.connectorType!,
      countingDirection: neighbor.countingDirection
    };
  }
  return { groupId: crypto.randomUUID(), idPrefix: '', connectorType: '', countingDirection: 'ltr' };
}
