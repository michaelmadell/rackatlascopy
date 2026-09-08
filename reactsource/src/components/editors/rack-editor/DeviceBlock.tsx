import type { PointerEvent as ReactPointerEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { getDeviceVisual } from './device-icon';
import { getPortTypeDef } from '../rack-device-editor/port-types';
import { portFraction, computePortNumber } from '../rack-device-editor/layout-utils';
import type { FaceElement, Side } from '@/types';

/**
 * A placed device, positioned by the parent RackGrid (absolute top/height in
 * px). While being dragged it's left in place as a dashed outline — the
 * moving visual is DragOverlay's clone (see Editor.tsx), not this element.
 * Rendering both a self-transformed original *and* an overlay clone is a
 * classic dnd-kit anti-pattern: two things visibly moving at once reads as
 * janky. One clone, one placeholder.
 */
export default function DeviceBlock({
  device,
  top,
  height,
  selected,
  onSelect,
  readOnly,
  viewSide,
  connectedPortNames,
  onPortPointerDown
}: {
  device: any;
  top: number;
  height: number;
  selected?: boolean;
  onSelect?: () => void;
  readOnly?: boolean;
  /** Real rack elevations show a device's ports right on its own block (see
   *  the real app's `<g class="port">` elements sitting inside
   *  `device-content`), not tucked away in a side panel only — this is the
   *  "which side of the device am I looking at" filter for that, distinct
   *  from `device.side` (which side of the *rack* it's mounted facing). */
  viewSide: Side;
  /** Port *names* (computePortNumber form) already carrying a cable — drawn
   *  with a filled plug glyph instead of the bare port-type outline, same
   *  as a real recording's connected-port state. */
  connectedPortNames?: Set<string>;
  /** Starts a cable drag from this exact port — a real recording shows the
   *  connection flow is a direct port-to-port drag on the rack elevation
   *  itself (dashed preview line, drop on the target port), not only the
   *  side-panel dialog. Only wired up when the rack isn't read-only. */
  onPortPointerDown?: (device: any, element: FaceElement, evt: ReactPointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `device-${device._id}`,
    data: { kind: 'existing', device },
    disabled: readOnly
  });

  if (isDragging) {
    return (
      <div
        style={{ top, height }}
        className="absolute left-5 right-5 rounded-sm border border-dashed border-blue-400/40 bg-blue-500/5"
      />
    );
  }

  const { Icon, color } = getDeviceVisual(device.type);
  const ports: FaceElement[] = (device.elements || []).filter((e: FaceElement) => e.kind === 'port' && e.side === viewSide);
  const subRows = (device.heightU || 1) * 2; // SUB_ROWS_PER_U, kept a literal to dodge an extra import for one constant

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      {...listeners}
      {...attributes}
      style={{ top, height, borderLeftColor: color }}
      className={`pointer-events-auto absolute left-5 right-5 flex items-center gap-1.5 overflow-hidden rounded-sm border border-l-[3px] bg-gradient-to-b from-[#202024] to-[#18181b] px-2 text-left shadow-sm transition-shadow duration-150 ${
        selected
          ? 'border-blue-400 bg-blue-500/10 text-[#f4f4f5] shadow-[0_0_0_1px_rgba(96,165,250,0.5)]'
          : 'border-[#3f3f46] text-[#d4d4d8] hover:border-[#52525b] hover:shadow-md'
      } ${readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {/* Port ticks, painted first so the name/icon/U-badge below sit on
       * top of them where they'd otherwise overlap — real markup gives
       * ports the device's *entire* face with no name text competing for
       * room; ours keeps the label, so this is a compromise, not a copy. */}
      {ports.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {ports.map((p) => {
            const def = getPortTypeDef(p.portType || '');
            const PortIcon = def?.icon;
            if (!PortIcon) return null;
            const { x, y } = portFraction(p, subRows);
            const connected = connectedPortNames?.has(computePortNumber(p, device.elements || []));
            return (
              <div
                key={p.id}
                data-port-hit="true"
                data-device-id={device._id}
                data-element-id={p.id}
                onPointerDown={
                  readOnly
                    ? undefined
                    : (e) => {
                        // A port drag starts a cable, not a device move — stop it
                        // reaching the block's own dnd-kit listeners (spread onto
                        // the <button> below via `{...listeners}`).
                        e.stopPropagation();
                        onPortPointerDown?.(device, p, e);
                      }
                }
                onClick={(e) => e.stopPropagation()}
                className={`pointer-events-auto absolute flex items-center justify-center rounded-full ${
                  readOnly ? '' : 'cursor-crosshair hover:bg-blue-500/30'
                }`}
                style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: 10, height: 10, transform: 'translate(-50%, -50%)' }}
              >
                <PortIcon className={`size-1.5 ${connected ? 'text-blue-400' : 'text-[#f4f4f5]/50'}`} />
              </div>
            );
          })}
        </div>
      )}

      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] leading-tight">{device.name}</span>
        {height >= 40 && device.type && (
          <span className="block truncate text-[9px] leading-tight text-[#71717a]">{device.type}</span>
        )}
      </span>
      <span className="shrink-0 rounded bg-[#0c0c0e]/60 px-1 text-[9px] text-[#71717a]">{device.heightU || 1}U</span>
    </button>
  );
}
