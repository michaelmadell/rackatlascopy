import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { TbGripVertical, TbServer } from 'react-icons/tb';

/**
 * A placed device, positioned by the parent RackGrid (absolute top/height in
 * px) and made draggable here — repositioning within the rack is "pick this
 * back up and drop it on a different slot", same mechanism as placing a new
 * one from the palette.
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `device-${device._id}`,
    data: { kind: 'existing', device },
    disabled: readOnly
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      {...listeners}
      {...attributes}
      style={{
        top,
        height,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 20 : undefined
      }}
      className={`pointer-events-auto absolute left-5 right-5 flex items-center gap-1.5 rounded-sm border px-2 text-[11px] text-left ${
        selected ? 'border-blue-400 bg-blue-500/20 text-[#f4f4f5]' : 'border-[#3f3f46] bg-[#18181b] text-[#d4d4d8] hover:border-[#52525b]'
      } ${isDragging ? 'opacity-50' : ''} ${readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {!readOnly && <TbGripVertical className="size-3 shrink-0 text-[#52525b]" />}
      <TbServer className="size-3.5 shrink-0" />
      <span className="truncate flex-1">{device.name}</span>
      <span className="text-[#71717a] shrink-0">{device.heightU || 1}U</span>
    </button>
  );
}
