import { useDroppable } from '@dnd-kit/core';
import { TbTypography, TbPhoto } from 'react-icons/tb';
import { GRID_COLUMNS, getPortTypeDef, type FaceElement, type Side } from './port-types';
import { computePortNumber } from './layout-utils';

export const CELL_W = 28;
export const CELL_H = 72;
/** First two columns are a fixed decorative "ear" (mounting-bracket-style
 *  block), not a droppable port slot — matches the real editor's canvas,
 *  which reserves the same two columns the same way regardless of what's
 *  placed. */
const EAR_COLUMNS = 2;

/** One side's device face — `rows` stacked U-strips (a 1U device gets one
 *  row, a 2U device two, etc.), each a droppable GRID_COLUMNS-wide strip of
 *  cells you drag ports onto. Dark, not white — verified against the real
 *  editor's own computed styles (oklch(0.1822 0 0) canvas, translucent
 *  white cell dividers), not guessed. */
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
    <div className="flex overflow-hidden rounded-sm border border-[#3f3f46]" style={{ backgroundColor: '#18181b' }}>
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
    <div className="flex" style={{ borderTop: row > 0 ? '1px dashed rgba(255,255,255,0.15)' : undefined }}>
      {Array.from({ length: EAR_COLUMNS }, (_, i) => (
        <div
          key={`ear-${i}`}
          style={{ width: CELL_W, height: CELL_H, backgroundColor: 'rgba(255,255,255,0.12)' }}
          className="shrink-0 border-r border-[rgba(255,255,255,0.08)] last:border-r-0"
        />
      ))}
      {Array.from({ length: GRID_COLUMNS - EAR_COLUMNS }, (_, i) => {
        const col = i + EAR_COLUMNS;
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
                const deltaCols = Math.round((e.clientX - startClientX) / CELL_W);
                const next = Math.max(EAR_COLUMNS, Math.min(GRID_COLUMNS - 1, startMaxCol + deltaCols));
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
      style={{ width: CELL_W, height: CELL_H, backgroundColor: isOver && !element ? 'rgba(59,130,246,0.25)' : undefined }}
      className="relative shrink-0 border-r border-[rgba(255,255,255,0.08)] last:border-r-0"
    >
      {element && (
        <button
          type="button"
          onClick={() => onSelect(element.id)}
          style={{
            borderColor: selected ? '#3b82f6' : '#52525b',
            backgroundColor: selected ? 'rgba(59,130,246,0.2)' : '#27272a',
            color: selected ? '#93c5fd' : '#d4d4d8'
          }}
          className="absolute inset-0.5 flex flex-col items-center justify-center gap-0 rounded-[3px] border text-[8px] leading-none hover:border-[#71717a]"
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
