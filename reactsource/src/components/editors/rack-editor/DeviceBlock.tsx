import { useDraggable } from '@dnd-kit/core';
import { getDeviceVisual } from './device-icon';

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
  readOnly
}: {
  device: any;
  top: number;
  height: number;
  selected?: boolean;
  onSelect?: () => void;
  readOnly?: boolean;
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
