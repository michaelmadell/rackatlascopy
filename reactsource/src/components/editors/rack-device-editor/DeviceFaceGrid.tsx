import { useDroppable } from '@dnd-kit/core';
import { TbTypography, TbPhoto } from 'react-icons/tb';
import { PORT_COLUMNS, getPortTypeDef, type FaceElement, type Side } from './port-types';
import { computePortNumber } from './layout-utils';

/** Height of one sub-row — half a U. Matches the real editor: its cell
 *  height doubles 1U→2U (74px→146px), i.e. 2 sub-rows of ~37px each. */
export const SUB_ROW_H = 37;

/** A real CSS grid, cloned column-for-column from the real editor's own
 *  markup (`grid-template-columns: 1fr repeat(28, 1fr) 1fr`; a droppable
 *  cell per (row, col) `grid-area`) rather than the flexbox-of-buttons
 *  this used before. The reason: a horizontal port group used to render
 *  as N separate per-cell buttons, so selecting one only highlighted that
 *  one cell — the rest of the group looked disconnected. Grid-area
 *  spanning lets one group render as a single block that can seamlessly
 *  cover multiple columns (and, vertically, multiple sub-rows), so its
 *  selected/hover state visually covers the whole group at once. */
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
  onResizeRowSpan: (memberIds: string[], newRowSpan: number) => void;
  readOnly?: boolean;
}) {
  const bySideElements = elements.filter((e) => e.side === side);
  const blocks = buildBlocks(bySideElements);
  const selectedGroupId = bySideElements.find((e) => e.id === selectedId)?.groupId;

  const occupied = new Set<string>();
  for (const b of blocks) {
    for (let r = b.row; r < b.row + b.rowSpan; r++) {
      for (let c = b.minCol; c <= b.maxCol; c++) occupied.add(`${r}:${c}`);
    }
  }

  return (
    <div
      className="relative select-none rounded-sm border border-[#3f3f46]"
      style={{
        display: 'grid',
        gridTemplateColumns: `1fr repeat(${PORT_COLUMNS}, 1fr)  1fr`,
        gridTemplateRows: `repeat(${subRows}, minmax(${SUB_ROW_H}px, 1fr))`,
        backgroundColor: '#18181b'
      }}
    >
      <div
        style={{ gridColumn: 1, gridRow: `1 / span ${subRows}`, backgroundColor: 'rgba(255,255,255,0.12)' }}
        className="border-r border-[rgba(255,255,255,0.08)]"
      />
      <div
        style={{ gridColumn: PORT_COLUMNS + 2, gridRow: `1 / span ${subRows}`, backgroundColor: '#0c0c0e' }}
        className="flex items-center justify-center border-l border-[rgba(255,255,255,0.08)] text-[9px] font-bold uppercase tracking-widest text-[#71717a]"
      >
        <span style={{ writingMode: 'vertical-rl' }}>{side}</span>
      </div>

      {Array.from({ length: PORT_COLUMNS }, (_, col) => (
        <div
          key={`div-${col}`}
          style={{ gridColumn: col + 2, gridRow: `1 / span ${subRows}` }}
          className="pointer-events-none border-r border-[rgba(255,255,255,0.08)]"
        />
      ))}

      {Array.from({ length: subRows }, (_, row) =>
        Array.from({ length: PORT_COLUMNS }, (_, col) => {
          if (occupied.has(`${row}:${col}`)) return null;
          return <DropCell key={`drop-${row}-${col}`} side={side} row={row} col={col} readOnly={readOnly} />;
        })
      )}

      {blocks.map((b) => (
        <PortBlock
          key={b.key}
          block={b}
          allElements={elements}
          selected={b.groupId != null && b.groupId === selectedGroupId}
          selectedId={selectedId}
          onSelect={onSelect}
          onResizeGroup={onResizeGroup}
          onResizeRowSpan={onResizeRowSpan}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

interface Block {
  key: string;
  groupId?: string;
  memberIds: string[];
  members: FaceElement[];
  kind: FaceElement['kind'];
  row: number;
  rowSpan: number;
  minCol: number;
  maxCol: number;
}

/** Groups same-groupId ports into one spanning block; text/icon elements
 *  (and any stray groupless port) are each their own single-cell block. */
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
    const cols = members.map((m) => m.col);
    blocks.push({
      key: groupId,
      groupId,
      memberIds: members.map((m) => m.id),
      members: [...members].sort((a, b) => a.col - b.col),
      kind: 'port',
      row: members[0].row,
      rowSpan: Math.max(...members.map((m) => m.rowSpan || 1)),
      minCol: Math.min(...cols),
      maxCol: Math.max(...cols)
    });
  }
  for (const e of singles) {
    blocks.push({
      key: e.id,
      groupId: e.groupId,
      memberIds: [e.id],
      members: [e],
      kind: e.kind,
      row: e.row,
      rowSpan: e.rowSpan || 1,
      minCol: e.col,
      maxCol: e.col
    });
  }
  return blocks;
}

function DropCell({
  side,
  row,
  col,
  readOnly
}: {
  side: Side;
  row: number;
  col: number;
  readOnly?: boolean;
}) {
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
  allElements,
  selected,
  selectedId,
  onSelect,
  onResizeGroup,
  onResizeRowSpan,
  readOnly
}: {
  block: Block;
  allElements: FaceElement[];
  selected: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  onResizeRowSpan: (memberIds: string[], newRowSpan: number) => void;
  readOnly?: boolean;
}) {
  const colSpan = block.maxCol - block.minCol + 1;

  return (
    <div
      style={{
        gridColumn: `${block.minCol + 2} / span ${colSpan}`,
        gridRow: `${block.row + 1} / span ${block.rowSpan}`,
        borderColor: selected ? '#3b82f6' : '#52525b',
        backgroundColor: selected ? 'rgba(59,130,246,0.2)' : '#27272a',
        zIndex: 1
      }}
      className="relative flex items-stretch overflow-hidden rounded-[3px] border"
    >
      {block.kind === 'port'
        ? block.members.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              style={{
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : undefined,
                color: m.id === selectedId ? '#93c5fd' : '#d4d4d8'
              }}
              className="flex flex-1 flex-col items-center justify-center gap-0 text-[8px] leading-none hover:text-[#f4f4f5]"
            >
              {(() => {
                const def = getPortTypeDef(m.portType || '');
                const Icon = def?.icon || TbTypography;
                return (
                  <>
                    <Icon className="size-3" />
                    <span>{computePortNumber(m, allElements)}</span>
                  </>
                );
              })()}
            </button>
          ))
        : (
            <button
              type="button"
              onClick={() => onSelect(block.members[0].id)}
              style={{ color: '#d4d4d8' }}
              className="flex flex-1 flex-col items-center justify-center gap-0 text-[8px] leading-none hover:text-[#f4f4f5]"
            >
              <ElementGlyph element={block.members[0]} />
            </button>
          )}

      {block.kind === 'port' && !readOnly && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            const groupId = block.groupId!;
            const startMaxCol = block.maxCol;
            const startClientX = e.clientX;
            const onMove = (ev: PointerEvent) => {
              const deltaCols = Math.round((ev.clientX - startClientX) / 28);
              const next = Math.max(block.minCol, Math.min(PORT_COLUMNS - 1, startMaxCol + deltaCols));
              onResizeGroup(groupId, next);
            };
            const onUp = () => {
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
          }}
          title="Drag to resize this port group"
          style={{ top: '20%', height: '60%' }}
          className="absolute -right-1 z-10 w-2 cursor-ew-resize"
        >
          <div className="absolute right-0 top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm bg-blue-500" />
        </div>
      )}
      {!readOnly && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            const startRowSpan = block.rowSpan;
            const startClientY = e.clientY;
            const onMove = (ev: PointerEvent) => {
              const deltaRows = Math.round((ev.clientY - startClientY) / SUB_ROW_H);
              const next = Math.max(1, startRowSpan + deltaRows);
              onResizeRowSpan(block.memberIds, next);
            };
            const onUp = () => {
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
          }}
          title="Drag to resize this port vertically"
          style={{ left: '20%', width: '60%' }}
          className="absolute bottom-0 z-10 h-2 cursor-ns-resize"
        >
          <div className="absolute left-1/2 bottom-0 h-1 w-3 -translate-x-1/2 rounded-sm bg-blue-500" />
        </div>
      )}
    </div>
  );
}

function ElementGlyph({ element }: { element: FaceElement }) {
  if (element.kind === 'text') {
    return (
      <>
        <TbTypography className="size-3" />
        <span className="max-w-full truncate">{element.value || 'Text'}</span>
      </>
    );
  }
  return <TbPhoto className="size-3.5" />;
}
