import { useDraggable } from '@dnd-kit/core';
import { TbGripVertical } from 'react-icons/tb';

/**
 * Drag source: catalog devices. Drop one onto RackGrid to create a new
 * rack-mounted device there (Editor.tsx's onDragEnd does the actual create).
 */
export default function DevicePalette({ devices }: { devices: any[] }) {
  return (
    <div className="w-56 border-r border-[#27272a] p-3 overflow-y-auto space-y-1 shrink-0">
      <p className="text-xs text-[#a1a1aa] mb-2">Drag a device onto the rack</p>
      {devices.map((d: any) => (
        <PaletteItem key={d._id} device={d} />
      ))}
      {devices.length === 0 && <p className="text-xs text-[#52525b]">No devices in the catalog yet.</p>}
    </div>
  );
}

function PaletteItem({ device }: { device: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${device._id}`,
    data: { kind: 'catalog', device }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#f4f4f5] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TbGripVertical className="size-3.5 shrink-0 text-[#52525b]" />
      <span className="flex-1 truncate">{device.name}</span>
      <span className="text-[#71717a] shrink-0">{device.rackUnits || 1}U</span>
    </div>
  );
}
