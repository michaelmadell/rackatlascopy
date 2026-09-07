import type { FaceElement, Side } from './port-types';

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
