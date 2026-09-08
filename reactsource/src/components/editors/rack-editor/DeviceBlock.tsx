import type { PointerEvent as ReactPointerEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
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

  const ports: FaceElement[] = (device.elements || []).filter((e: FaceElement) => e.kind === 'port' && e.side === viewSide);
  const subRows = (device.heightU || 1) * 2; // SUB_ROWS_PER_U, kept a literal to dodge an extra import for one constant

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      {...listeners}
      {...attributes}
      style={{ top, height }}
      className={`pointer-events-auto absolute left-5 right-5 overflow-hidden rounded-sm border bg-[#111113] text-left transition-colors duration-150 ${
        selected ? 'border-blue-400 bg-blue-500/10' : 'border-[#3f3f46] hover:border-[#52525b]'
      } ${readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {/* Ports (or, lacking any, the device's own type as plain text) span
       * the button's *full* box — RackGrid's own cable-anchor math
       * (DEVICE_LEFT/DEVICE_RIGHT) assumes portFraction's 0..1 maps across
       * this exact box, so nothing here may narrow that coordinate space
       * (the name label below is a purely visual overlay, not a sibling
       * that would shift it). */}
      {ports.length > 0 ? (
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
      ) : (
        device.type && <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] text-[#71717a]">{device.type}</span>
      )}

      {/* Real rack elevations give a device only its name, set vertically
       * along the block's own left edge (same writing-mode convention
       * DeviceFaceGrid/PortToolbar already use for their own side labels)
       * — no icon, no accent color, no unit badge (confirmed against a
       * screenshot sequence; this session's earlier icon/badge/type-label
       * treatment didn't match). Painted after the ports layer, with an
       * opaque background, so it sits on top of any port tick that would
       * otherwise land underneath it — same tradeoff the icon/name/badge
       * row this replaced already made. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex w-4 items-center justify-center border-r border-[rgba(255,255,255,0.08)] bg-[#111113]">
        <span
          className="whitespace-nowrap text-[9px] font-bold uppercase tracking-widest text-[#d4d4d8]"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {device.name}
        </span>
      </div>
    </button>
  );
}
