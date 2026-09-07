import { useDroppable } from '@dnd-kit/core';
import { TbTypography, TbPhoto, TbChevronRight, TbChevronDown } from 'react-icons/tb';
import { PORT_COLUMNS, getPortTypeDef, type FaceElement, type Side } from './port-types';
import { computePortNumber } from './layout-utils';

/** Height of one sub-row — half a U. Matches the real editor: its cell
 *  height doubles 1U→2U (74px→146px), i.e. 2 sub-rows of ~37px each. */
export const SUB_ROW_H = 37;

/** A real CSS grid, cloned column-for-column from the real editor's own
 *  markup (`grid-template-columns: 1fr repeat(28, 1fr) 1fr`). Three things
 *  verified directly from pasted real markup:
 *
 *  1. A horizontal port group is ONE grid item (`gridColumn` spanning
 *     minCol→maxCol), not N separate per-cell buttons — selecting it
 *     highlights the whole span at once, not just one sub-cell.
 *  2. A group is a dense minCol..maxCol × minRow..maxRow rectangle of
 *     individual ports — growing a group vertically doesn't stretch one
 *     port taller, it adds a whole second numbered port stacked in the
 *     row below (a real 1x2 Copper group has TWO ports, 01 and 02, each
 *     its own <span>), the same thing horizontal growth already does
 *     with columns.
 *  3. If a group's row-span exactly equals the device's full sub-row
 *     count, its `gridRow` is an exact `start / span N` — no centering
 *     needed since it already fills the space. Only when it's *shorter*
 *     than the full height does it use `gridRow: 1 / -1` (reserving the
 *     full column) plus an explicit `height` and `align-self: center` to
 *     float in the middle of that reserved space — verified against a
 *     single freshly-dropped port (1 row of 2) and a full-height 1x2/2x2
 *     group (2 rows of 2), which use each pattern respectively. */
export default function DeviceFaceGrid({
  side,
  subRows,
  elements,
  selectedId,
  onSelect,
  onResizeGroup,
  onResizeGroupVertical,
  onResizeElementSpan,
  readOnly
}: {
  side: Side;
  subRows: number;
  elements: FaceElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  onResizeGroupVertical: (groupId: string, newMaxRow: number) => void;
  onResizeElementSpan: (id: string, axis: 'col' | 'row', newMax: number) => void;
  readOnly?: boolean;
}) {
  const bySideElements = elements.filter((e) => e.side === side);
  const blocks = buildBlocks(bySideElements);
  const selectedGroupId = bySideElements.find((e) => e.id === selectedId)?.groupId;
  const occupiedCells = new Set(
    blocks.flatMap((b) => {
      const cells: string[] = [];
      for (let c = b.minCol; c <= b.maxCol; c++) for (let r = b.minRow; r <= b.maxRow; r++) cells.push(`${r}:${c}`);
      return cells;
    })
  );

  return (
    <div
      className="relative select-none rounded-sm border border-[#3f3f46]"
      style={{
        display: 'grid',
        gridTemplateColumns: `1fr repeat(${PORT_COLUMNS}, 1fr) 1fr`,
        gridTemplateRows: `repeat(${subRows}, minmax(${SUB_ROW_H}px, 1fr))`,
        backgroundColor: '#18181b'
      }}
    >
      <div style={{ gridColumn: 1, gridRow: '1 / -1', backgroundColor: 'rgba(255,255,255,0.12)' }} className="border-r border-[rgba(255,255,255,0.08)]" />
      <div
        style={{ gridColumn: PORT_COLUMNS + 2, gridRow: '1 / -1', backgroundColor: '#0c0c0e' }}
        className="flex items-center justify-center border-l border-[rgba(255,255,255,0.08)] text-[9px] font-bold uppercase tracking-widest text-[#71717a]"
      >
        <span style={{ writingMode: 'vertical-rl' }}>{side}</span>
      </div>

      {Array.from({ length: PORT_COLUMNS }, (_, col) => (
        <div
          key={`div-${col}`}
          style={{ gridColumn: col + 2, gridRow: '1 / -1' }}
          className="pointer-events-none border-r border-[rgba(255,255,255,0.08)]"
        />
      ))}

      {Array.from({ length: subRows }, (_, row) =>
        Array.from({ length: PORT_COLUMNS }, (_, col) => {
          if (occupiedCells.has(`${row}:${col}`)) return null;
          return <DropCell key={`drop-${row}-${col}`} side={side} row={row} col={col} readOnly={readOnly} />;
        })
      )}

      {blocks.map((b) => (
        <PortBlock
          key={b.key}
          block={b}
          subRows={subRows}
          allElements={elements}
          selected={b.groupId != null && b.groupId === selectedGroupId}
          selectedId={selectedId}
          onSelect={onSelect}
          onResizeGroup={onResizeGroup}
          onResizeGroupVertical={onResizeGroupVertical}
          onResizeElementSpan={onResizeElementSpan}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

interface Block {
  key: string;
  groupId?: string;
  members: FaceElement[];
  kind: FaceElement['kind'];
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

/** Groups same-groupId ports into one dense-rectangle block; text/icon
 *  elements (and any stray groupless port) are each their own single-cell
 *  block. */
function buildBlocks(elements: FaceElement[]): Block[] {
  const grouped = new Map<string, FaceElement[]>();
  const singles: FaceElement[] = [];
  for (const e of elements) {
    if (e.kind === 'port' && e.groupId) {
      const list = grouped.get(e.groupId) || [];
      list.push(e);
      grouped.set(e.groupId, list);
    } else {
      singles.push(e);
    }
  }

  const blocks: Block[] = [];
  for (const [groupId, members] of grouped) {
    blocks.push({
      key: groupId,
      groupId,
      members: [...members].sort((a, b) => a.col - b.col || a.row - b.row),
      kind: 'port',
      minCol: Math.min(...members.map((m) => m.col)),
      maxCol: Math.max(...members.map((m) => m.col)),
      minRow: Math.min(...members.map((m) => m.row)),
      maxRow: Math.max(...members.map((m) => m.row))
    });
  }
  for (const e of singles) {
    // Ports always span exactly one cell here (grouped ports took the
    // branch above); text/icon elements carry their own span.
    const colSpan = e.kind === 'port' ? 1 : e.colSpan || 1;
    const rowSpan = e.kind === 'port' ? 1 : e.rowSpan || 1;
    blocks.push({
      key: e.id,
      groupId: e.groupId,
      members: [e],
      kind: e.kind,
      minCol: e.col,
      maxCol: e.col + colSpan - 1,
      minRow: e.row,
      maxRow: e.row + rowSpan - 1
    });
  }
  return blocks;
}

function DropCell({ side, row, col, readOnly }: { side: Side; row: number; col: number; readOnly?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `face-cell-${side}-${row}-${col}`,
    data: { side, row, col },
    disabled: readOnly
  });
  return (
    <div
      ref={setNodeRef}
      style={{ gridColumn: col + 2, gridRow: row + 1, backgroundColor: isOver ? 'rgba(59,130,246,0.25)' : undefined }}
    />
  );
}

function PortBlock({
  block,
  subRows,
  allElements,
  selected,
  selectedId,
  onSelect,
  onResizeGroup,
  onResizeGroupVertical,
  onResizeElementSpan,
  readOnly
}: {
  block: Block;
  subRows: number;
  allElements: FaceElement[];
  selected: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  onResizeGroupVertical: (groupId: string, newMaxRow: number) => void;
  onResizeElementSpan: (id: string, axis: 'col' | 'row', newMax: number) => void;
  readOnly?: boolean;
}) {
  const colSpan = block.maxCol - block.minCol + 1;
  const rowSpan = block.maxRow - block.minRow + 1;
  const fillsFullHeight = rowSpan >= subRows;
  const byCell = new Map(block.members.map((m) => [`${m.row}:${m.col}`, m]));
  const isSelectedSingle = block.kind !== 'port' && block.members[0].id === selectedId;

  return (
    <div
      style={{
        gridColumn: `${block.minCol + 2} / span ${colSpan}`,
        ...(fillsFullHeight
          ? { gridRow: `${block.minRow + 1} / span ${rowSpan}` }
          : { gridRow: '1 / -1', alignSelf: 'center', height: rowSpan * SUB_ROW_H }),
        borderColor: selected || isSelectedSingle ? '#3b82f6' : '#52525b',
        // Ports float unboxed over the canvas; a text/icon element is its
        // own opaque card (real markup: `bg-background` unconditionally).
        backgroundColor: block.kind === 'port' ? 'transparent' : '#09090b',
        zIndex: 10
      }}
      className="relative rounded-sm border font-mono text-[8px]"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="grid h-full w-full"
          style={{ gridTemplateColumns: `repeat(${colSpan}, 1fr)`, gridTemplateRows: `repeat(${rowSpan}, 1fr)` }}
        >
          {block.kind === 'port'
            ? Array.from({ length: rowSpan }, (_, ri) =>
                Array.from({ length: colSpan }, (_, ci) => {
                  const m = byCell.get(`${block.minRow + ri}:${block.minCol + ci}`);
                  if (!m) return null;
                  const def = getPortTypeDef(m.portType || '');
                  const Icon = def?.icon || TbTypography;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelect(m.id)}
                      style={{
                        gridColumn: ci + 1,
                        gridRow: ri + 1,
                        backgroundColor: m.id === selectedId ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)'
                      }}
                      className="flex flex-col items-center justify-center gap-0 overflow-hidden rounded-[2px] text-[#d4d4d8] hover:brightness-125"
                    >
                      <span>{computePortNumber(m, allElements)}</span>
                      <Icon className="size-3" />
                    </button>
                  );
                })
              )
            : block.kind === 'text' ? (
                <button
                  type="button"
                  onClick={() => onSelect(block.members[0].id)}
                  className="flex h-full w-full items-center justify-start px-2 text-left text-[#f4f4f5] hover:brightness-125"
                >
                  <span className="truncate font-mono text-[13px] leading-tight">{block.members[0].value || 'Text'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(block.members[0].id)}
                  className="flex h-full w-full items-center justify-center text-[#f4f4f5] hover:brightness-125"
                >
                  <TbPhoto className="size-8" />
                </button>
              )}
        </div>
      </div>

      {!readOnly && (
        <ResizeHandle
          axis="x"
          className="absolute top-0 -right-1.5 h-full w-3"
          cursor="cursor-ew-resize"
          icon={<TbChevronRight className="size-2" />}
          onStart={(startClientX) => {
            const startMaxCol = block.maxCol;
            const onMove = (ev: PointerEvent) => {
              const deltaCols = Math.round((ev.clientX - startClientX) / 28);
              if (block.kind === 'port') onResizeGroup(block.groupId!, startMaxCol + deltaCols);
              else onResizeElementSpan(block.members[0].id, 'col', startMaxCol + deltaCols);
            };
            const onUp = () => {
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
          }}
        />
      )}
      {!readOnly && (
        <ResizeHandle
          axis="y"
          className="absolute -bottom-1.5 left-0 h-3 w-full"
          cursor="cursor-ns-resize"
          icon={<TbChevronDown className="size-2" />}
          onStart={(startClientY) => {
            const startMaxRow = block.maxRow;
            const onMove = (ev: PointerEvent) => {
              const deltaRows = Math.round((ev.clientY - startClientY) / SUB_ROW_H);
              if (block.kind === 'port') onResizeGroupVertical(block.groupId!, startMaxRow + deltaRows);
              else onResizeElementSpan(block.members[0].id, 'row', startMaxRow + deltaRows);
            };
            const onUp = () => {
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
          }}
        />
      )}
    </div>
  );
}

function ResizeHandle({
  axis,
  className,
  cursor,
  icon,
  onStart
}: {
  axis: 'x' | 'y';
  className: string;
  cursor: string;
  icon: React.ReactNode;
  onStart: (startClient: number) => void;
}) {
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onStart(axis === 'x' ? e.clientX : e.clientY);
      }}
      title="Drag to resize"
      className={`z-20 flex items-center justify-center touch-none ${cursor} ${className}`}
    >
      <div className="flex size-3 items-center justify-center rounded-full border border-blue-500 bg-[#18181b] text-blue-500 shadow-sm">
        {icon}
      </div>
    </div>
  );
}
