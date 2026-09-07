import type { FaceElement, Side } from './port-types';

/** Ports sharing a group share idPrefix/connectorType/countingDirection and
 *  are numbered together, ordered by column (reversed if `countingDirection`
 *  is 'rtl'). `01`-style two-digit padding matches what the real editor
 *  showed for a freshly-dropped port. */
export function computePortNumber(el: FaceElement, all: FaceElement[]): string {
  if (el.value) return el.value; // explicit per-port override
  const groupPorts = all
    .filter((p) => p.kind === 'port' && p.groupId === el.groupId)
    .sort((a, b) => a.col - b.col);
  const ordered = el.countingDirection === 'rtl' ? [...groupPorts].reverse() : groupPorts;
  const index = ordered.findIndex((p) => p.id === el.id);
  const num = String(index + 1).padStart(2, '0');
  return `${el.idPrefix || ''}${num}`;
}

/** Where a dropped port type lands: joins an adjacent same-type, same-side
 *  port's group (sharing its settings) if one sits immediately left or
 *  right of the target column, otherwise starts a fresh group. No "same
 *  row" check — a port's grid placement always spans the device's full
 *  height (see FaceElement.heightPx's doc comment), so one column only
 *  ever holds one port; there's nothing row-specific to match. */
export function resolveGroupForDrop(
  portType: string,
  side: Side,
  col: number,
  existing: FaceElement[]
): { groupId: string; idPrefix: string; connectorType: string; countingDirection: FaceElement['countingDirection'] } {
  const neighbor = existing.find(
    (p) => p.kind === 'port' && p.side === side && p.portType === portType && (p.col === col - 1 || p.col === col + 1)
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
