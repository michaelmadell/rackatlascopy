import { useDroppable } from '@dnd-kit/core';
import { TbTypography, TbPhoto } from 'react-icons/tb';
import { GRID_COLUMNS, getPortTypeDef, type FaceElement, type Side } from './port-types';
import { computePortNumber } from './layout-utils';

export const CELL_PX = 26;

/** One side's device face — `rows` stacked U-strips (a 1U device gets one
 *  row, a 2U device two, etc.), each a droppable GRID_COLUMNS-wide strip of
 *  cells you drag ports onto. */
export default function DeviceFaceGrid({
  side,
  rows,
  elements,
  selectedId,
  onSelect,
  onResizeGroup,
  readOnly
}: {
  side: Side;
  rows: number;
  elements: FaceElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  readOnly?: boolean;
}) {
  const bySideElements = elements.filter((e) => e.side === side);

  return (
    // Backgrounds set inline, not via bg-white/bg-[#0c0c0e] — see the note
    // in PortToolbar.tsx: this app's frozen styles.css only has utility
    // rules the real app's original source happened to use, and neither of
    // those two ever appeared there.
    <div className="flex overflow-hidden rounded-sm border border-[#3f3f46]" style={{ backgroundColor: '#ffffff' }}>
      <div className="flex flex-col">
        {Array.from({ length: rows }, (_, row) => (
          <FaceRow
            key={row}
            side={side}
            row={row}
            elements={bySideElements}
            allElements={elements}
            selectedId={selectedId}
            onSelect={onSelect}
            onResizeGroup={onResizeGroup}
            readOnly={readOnly}
          />
        ))}
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

function FaceRow({
  side,
  row,
  elements,
  allElements,
  selectedId,
  onSelect,
  onResizeGroup,
  readOnly
}: {
  side: Side;
  row: number;
  elements: FaceElement[];
  allElements: FaceElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  readOnly?: boolean;
}) {
  const byCol = new Map(elements.filter((e) => e.row === row).map((e) => [e.col, e]));

  // The rightmost element of each group, in this row — that's where the resize handle lives.
  const groupMaxCol = new Map<string, number>();
  for (const e of elements) {
    if (e.row !== row || e.kind !== 'port' || !e.groupId) continue;
    groupMaxCol.set(e.groupId, Math.max(groupMaxCol.get(e.groupId) ?? -1, e.col));
  }

  return (
    <div className="flex" style={{ borderTop: row > 0 ? '1px dashed #e4e4e7' : undefined }}>
      {Array.from({ length: GRID_COLUMNS }, (_, col) => {
        const el = byCol.get(col);
        const isGroupEnd = !!(el?.groupId && groupMaxCol.get(el.groupId) === col);
        return (
          <FaceCell
            key={col}
            side={side}
            row={row}
            col={col}
            element={el}
            allElements={allElements}
            selected={el?.id === selectedId}
            onSelect={onSelect}
            readOnly={readOnly}
            showHandle={isGroupEnd && !readOnly}
            onResizeStart={(startClientX) => {
              if (!el?.groupId) return;
              const groupId = el.groupId;
              const startMaxCol = col;
              const onMove = (e: PointerEvent) => {
                const deltaCols = Math.round((e.clientX - startClientX) / CELL_PX);
                const next = Math.max(0, Math.min(GRID_COLUMNS - 1, startMaxCol + deltaCols));
                onResizeGroup(groupId, next);
              };
              const onUp = () => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
              };
              document.addEventListener('pointermove', onMove);
              document.addEventListener('pointerup', onUp);
            }}
          />
        );
      })}
    </div>
  );
}

function FaceCell({
  side,
  row,
  col,
  element,
  allElements,
  selected,
  onSelect,
  readOnly,
  showHandle,
  onResizeStart
}: {
  side: Side;
  row: number;
  col: number;
  element?: FaceElement;
  allElements: FaceElement[];
  selected: boolean;
  onSelect: (id: string) => void;
  readOnly?: boolean;
  showHandle: boolean;
  onResizeStart: (startClientX: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `face-cell-${side}-${row}-${col}`,
    data: { side, row, col },
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
      {showHandle && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e.clientX);
          }}
          title="Drag to resize this port group"
          className="absolute -right-1 top-0 z-10 h-full w-2 cursor-ew-resize"
        >
          <div className="absolute right-0 top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm bg-blue-500" />
        </div>
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
