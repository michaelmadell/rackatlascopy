import { useDraggable } from '@dnd-kit/core';
import { STANDARD_DEVICE_TYPES } from '@/lib/device-constants';
import { getDeviceVisual } from './device-icon';

/**
 * Drag source: device-type *categories* (Cable Manager, Firewall,
 * Switch, ...) — cloned from a real screen recording, which showed the
 * left palette listing categories, not individual catalog devices.
 * Dropping one onto RackGrid opens AddDeviceDialog scoped to that
 * category (search + a built-in/custom device list + preview), which is
 * where a specific device actually gets picked — see Editor.tsx's
 * handleDragEnd.
 */
export default function DevicePalette() {
  return (
    <div className="min-h-0 w-56 shrink-0 overflow-y-auto border-r border-[#27272a] p-3 space-y-1">
      <p className="text-xs text-[#a1a1aa] mb-2">Drag a device onto the rack</p>
      {STANDARD_DEVICE_TYPES.rack.map((category) => (
        <CategoryItem key={category.id} id={category.id} label={category.label()} />
      ))}
    </div>
  );
}

function CategoryItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `category-${id}`,
    data: { kind: 'category', category: id }
  });
  const { Icon, color } = getDeviceVisual(label);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-1.5 rounded-sm border border-transparent px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing text-[#a1a1aa] transition-colors hover:border-[#3f3f46] hover:bg-[#18181b] hover:text-[#f4f4f5] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );
}
