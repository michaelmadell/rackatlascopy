import { useDroppable } from '@dnd-kit/core';
import { TbTypography, TbPhoto } from 'react-icons/tb';
import { GRID_COLUMNS, getPortTypeDef, type FaceElement, type Side } from './port-types';
import { computePortNumber } from './layout-utils';

export const CELL_W = 28;
/** Height of one sub-row — half a U. Matches the real editor: its cell
 *  height doubles 1U→2U (74px→146px), i.e. 2 sub-rows of ~37px each. */
export const SUB_ROW_H = 37;
/** First two columns are a fixed decorative "ear" (mounting-bracket-style
 *  block), not a droppable port slot — matches the real editor's canvas,
 *  which reserves the same two columns the same way regardless of what's
 *  placed. */
const EAR_COLUMNS = 2;

/** One side's device face — `subRows` stacked half-U strips (a 1U device
 *  gets 2, a 2U device 4 — see port-types.ts's SUB_ROWS_PER_U), each a
 *  droppable GRID_COLUMNS-wide strip of cells you drag ports onto. A
 *  freshly-dropped port fills just the sub-row it landed on; its
 *  bottom-edge handle grows it down into sub-row(s) below. Dark, not
 *  white — verified against the real editor's own computed styles
 *  (oklch(0.1822 0 0) canvas, translucent white cell dividers). */
export default function DeviceFaceGrid({
  side,
  subRows,
  elements,
  selectedId,
  onSelect,
  onResizeGroup,
  onResizeRowSpan,
  readOnly
}: {
  side: Side;
  subRows: number;
  elements: FaceElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  onResizeRowSpan: (elementId: string, newRowSpan: number) => void;
  readOnly?: boolean;
}) {
  const bySideElements = elements.filter((e) => e.side === side);

  return (
    <div className="flex overflow-hidden rounded-sm border border-[#3f3f46]" style={{ backgroundColor: '#18181b' }}>
      <div className="flex flex-col">
        {Array.from({ length: subRows }, (_, row) => (
          <FaceRow
            key={row}
            side={side}
            row={row}
            subRows={subRows}
            elements={bySideElements}
            allElements={elements}
            selectedId={selectedId}
            onSelect={onSelect}
            onResizeGroup={onResizeGroup}
            onResizeRowSpan={onResizeRowSpan}
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
  subRows,
  elements,
  allElements,
  selectedId,
  onSelect,
  onResizeGroup,
  onResizeRowSpan,
  readOnly
}: {
  side: Side;
  row: number;
  subRows: number;
  elements: FaceElement[];
  allElements: FaceElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  onResizeRowSpan: (elementId: string, newRowSpan: number) => void;
  readOnly?: boolean;
}) {
  // Elements that ORIGINATE on this exact row (get a real interactive cell).
  const originHere = new Map(elements.filter((e) => e.row === row).map((e) => [e.col, e]));
  // Elements from an earlier row whose rowSpan reaches down into this one
  // (render as a plain continuation fill, no interaction).
  const coveredHere = new Map(
    elements.filter((e) => e.row < row && e.row + (e.rowSpan || 1) > row).map((e) => [e.col, e])
  );

  // The rightmost element of each horizontal group, in this row — that's where the horizontal resize handle lives.
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
          style={{ width: CELL_W, height: SUB_ROW_H, backgroundColor: 'rgba(255,255,255,0.12)' }}
          className="shrink-0 border-r border-[rgba(255,255,255,0.08)] last:border-r-0"
        />
      ))}
      {Array.from({ length: GRID_COLUMNS - EAR_COLUMNS }, (_, i) => {
        const col = i + EAR_COLUMNS;
        const el = originHere.get(col);
        const covering = coveredHere.get(col);
        const isGroupEnd = !!(el?.groupId && groupMaxCol.get(el.groupId) === col);
        return (
          <FaceCell
            key={col}
            side={side}
            row={row}
            col={col}
            element={el}
            covering={!!covering}
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
            showVHandle={!!el && !readOnly}
            onVResizeStart={(startClientY) => {
              if (!el) return;
              const elementId = el.id;
              const startRowSpan = el.rowSpan || 1;
              const onMove = (e: PointerEvent) => {
                const deltaRows = Math.round((e.clientY - startClientY) / SUB_ROW_H);
                const next = Math.max(1, Math.min(subRows - row, startRowSpan + deltaRows));
                onResizeRowSpan(elementId, next);
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
  covering,
  allElements,
  selected,
  onSelect,
  readOnly,
  showHandle,
  onResizeStart,
  showVHandle,
  onVResizeStart
}: {
  side: Side;
  row: number;
  col: number;
  element?: FaceElement;
  covering: boolean;
  allElements: FaceElement[];
  selected: boolean;
  onSelect: (id: string) => void;
  readOnly?: boolean;
  showHandle: boolean;
  onResizeStart: (startClientX: number) => void;
  showVHandle: boolean;
  onVResizeStart: (startClientY: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `face-cell-${side}-${row}-${col}`,
    data: { side, row, col },
    disabled: readOnly || !!element || covering
  });

  if (covering) {
    return (
      <div style={{ width: CELL_W, height: SUB_ROW_H, backgroundColor: '#27272a' }} className="shrink-0 border-r border-[rgba(255,255,255,0.08)] last:border-r-0" />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ width: CELL_W, height: SUB_ROW_H, backgroundColor: isOver && !element ? 'rgba(59,130,246,0.25)' : undefined }}
      className="relative shrink-0 border-r border-[rgba(255,255,255,0.08)] last:border-r-0"
    >
      {element && (
        <button
          type="button"
          onClick={() => onSelect(element.id)}
          style={{
            borderColor: selected ? '#3b82f6' : '#52525b',
            backgroundColor: selected ? 'rgba(59,130,246,0.2)' : '#27272a',
            color: selected ? '#93c5fd' : '#d4d4d8',
            height: (element.rowSpan || 1) * SUB_ROW_H - 1,
            zIndex: 1
          }}
          className="absolute inset-x-0.5 top-0.5 flex flex-col items-center justify-center gap-0 rounded-[3px] border text-[8px] leading-none hover:border-[#71717a]"
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
      {showVHandle && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            onVResizeStart(e.clientY);
          }}
          title="Drag to resize this port vertically"
          style={{ top: (element!.rowSpan || 1) * SUB_ROW_H - 5 }}
          className="absolute left-1/2 z-10 h-2 w-full -translate-x-1/2 cursor-ns-resize"
        >
          <div className="absolute left-1/2 bottom-0 h-1 w-3 -translate-x-1/2 rounded-sm bg-blue-500" />
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
