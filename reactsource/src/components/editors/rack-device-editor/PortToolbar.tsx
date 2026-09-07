import { useDraggable } from '@dnd-kit/core';
import { TbTypography, TbPhoto } from 'react-icons/tb';
import type { IconType } from 'react-icons';
import { PORT_TYPES } from './port-types';

/** Drag source: port-type and element chips, cloned from the real Rack
 *  Device Editor's toolbar layout (a "Port Types" column and an "Elements"
 *  column). Drop one onto DeviceFaceGrid to place it. */
export default function PortToolbar() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#27272a] p-3" style={{ backgroundColor: '#18181b' }}>
      <VerticalLabel>Port Types</VerticalLabel>
      {/* Fixed-width flex-wrap rather than a grid-cols-N utility class, and
       *  inline backgroundColor above rather than bg-[#hex] — this app's
       *  styles.css is a frozen, pre-extracted snapshot of the real app's
       *  compiled Tailwind CSS (no @tailwind/@import directive, so nothing
       *  here regenerates at build time); grid-cols-5 and arbitrary bg-[...]
       *  values were never used by the real app's original source, so those
       *  classes have no rule and silently no-op. Sticking to flex/inline
       *  styles for anything not already frozen in keeps this reliable. */}
      <div className="flex flex-wrap gap-1.5" style={{ width: 420 }}>
        {PORT_TYPES.map((pt) => (
          <ToolbarChip key={pt.id} id={`toolbar-port-${pt.id}`} data={{ kind: 'port', portType: pt.id }} icon={pt.icon} label={pt.label} />
        ))}
      </div>

      <div className="mx-1 h-auto self-stretch border-l border-[#27272a]" />

      <VerticalLabel>Elements</VerticalLabel>
      <div className="flex flex-col gap-1.5">
        <ToolbarChip id="toolbar-element-text" data={{ kind: 'text' }} icon={TbTypography} label="Text" />
        <ToolbarChip id="toolbar-element-icon" data={{ kind: 'icon' }} icon={TbPhoto} label="Icon" />
      </div>
    </div>
  );
}

function VerticalLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[#71717a]"
      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
    >
      {children}
    </span>
  );
}

function ToolbarChip({
  id,
  data,
  icon: Icon,
  label
}: {
  id: string;
  data: Record<string, unknown>;
  icon: IconType;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ minWidth: 76, backgroundColor: '#0c0c0e' }}
      className={`flex cursor-grab items-center gap-1.5 whitespace-nowrap rounded-md border border-[#3f3f46] px-2 py-1.5 text-[11px] text-[#d4d4d8] active:cursor-grabbing hover:border-[#52525b] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </div>
  );
}
