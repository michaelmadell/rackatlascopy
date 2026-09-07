import { useDroppable } from '@dnd-kit/core';
import { TbTypography, TbPhoto } from 'react-icons/tb';
import { GRID_COLUMNS, getPortTypeDef, type FaceElement, type Side } from './port-types';
import { computePortNumber } from './layout-utils';

export const CELL_PX = 26;

/** One side's device face — a single-row strip of GRID_COLUMNS droppable
 *  cells, cloned from the real editor's canvas (which also renders as one
 *  row regardless of the device's rack-unit height; this clone keeps that
 *  simplification rather than reverse-engineering multi-row behavior that
 *  was never directly observed). */
export default function DeviceFaceGrid({
  side,
  elements,
  selectedId,
  onSelect,
  readOnly
}: {
  side: Side;
  elements: FaceElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  readOnly?: boolean;
}) {
  const bySideElements = elements.filter((e) => e.side === side);
  const byCol = new Map(bySideElements.map((e) => [e.col, e]));

  return (
    // Backgrounds set inline, not via bg-white/bg-[#0c0c0e] — see the note
    // in PortToolbar.tsx: this app's frozen styles.css only has utility
    // rules the real app's original source happened to use, and neither of
    // those two ever appeared there.
    <div className="flex overflow-hidden rounded-sm border border-[#3f3f46]" style={{ backgroundColor: '#ffffff' }}>
      <div className="flex flex-1">
        {Array.from({ length: GRID_COLUMNS }, (_, col) => {
          const el = byCol.get(col);
          return (
            <FaceCell
              key={col}
              side={side}
              col={col}
              element={el}
              allElements={elements}
              selected={el?.id === selectedId}
              onSelect={onSelect}
              readOnly={readOnly}
            />
          );
        })}
      </div>
      <div
        className="flex shrink-0 items-center justify-center px-1 text-[9px] font-bold tracking-widest text-[#71717a]"
        style={{ writingMode: 'vertical-rl', backgroundColor: '#0c0c0e' }}
      >
        {side.toUpperCase()}
      </div>
    </div>
  );
}

function FaceCell({
  side,
  col,
  element,
  allElements,
  selected,
  onSelect,
  readOnly
}: {
  side: Side;
  col: number;
  element?: FaceElement;
  allElements: FaceElement[];
  selected: boolean;
  onSelect: (id: string) => void;
  readOnly?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `face-cell-${side}-${col}`,
    data: { side, col },
    disabled: readOnly || !!element
  });

  return (
    <div
      ref={setNodeRef}
      style={{ width: CELL_PX, height: CELL_PX, backgroundColor: isOver && !element ? '#dbeafe' : undefined }}
      className="relative shrink-0 border-r border-[#e4e4e7] last:border-r-0"
    >
      {element && (
        <button
          type="button"
          onClick={() => onSelect(element.id)}
          style={{
            borderColor: selected ? '#3b82f6' : '#a1a1aa',
            backgroundColor: selected ? '#dbeafe' : '#f4f4f5',
            color: selected ? '#1d4ed8' : '#3f3f46'
          }}
          className="absolute inset-0.5 flex flex-col items-center justify-center gap-0 rounded-[3px] border text-[7px] leading-none hover:border-[#71717a]"
        >
          <ElementGlyph element={element} allElements={allElements} />
        </button>
      )}
    </div>
  );
}

function ElementGlyph({ element, allElements }: { element: FaceElement; allElements: FaceElement[] }) {
  if (element.kind === 'text') {
    return (
      <>
        <TbTypography className="size-3" />
        <span className="max-w-full truncate">{element.value || 'Text'}</span>
      </>
    );
  }
  if (element.kind === 'icon') {
    return <TbPhoto className="size-3.5" />;
  }
  const def = getPortTypeDef(element.portType || '');
  const Icon = def?.icon || TbTypography;
  return (
    <>
      <Icon className="size-3" />
      <span>{computePortNumber(element, allElements)}</span>
    </>
  );
}
