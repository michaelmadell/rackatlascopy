import { useDroppable } from '@dnd-kit/core';
import { TbTypography, TbPhoto, TbChevronRight, TbChevronDown } from 'react-icons/tb';
import { PORT_COLUMNS, getPortTypeDef, type FaceElement, type Side } from './port-types';
import { computePortNumber } from './layout-utils';

/** Height of one sub-row — half a U. Matches the real editor: its cell
 *  height doubles 1U→2U (74px→146px), i.e. 2 sub-rows of ~37px each. */
export const SUB_ROW_H = 37;

/** A real CSS grid, cloned column-for-column from the real editor's own
 *  markup (`grid-template-columns: 1fr repeat(28, 1fr) 1fr`). Two things
 *  verified directly from pasted real markup, both different from this
 *  file's first pass:
 *
 *  1. A horizontal port group is ONE grid item (`gridColumn` spanning
 *     minCol→maxCol), not N separate per-cell buttons — selecting it
 *     highlights the whole span at once, not just one sub-cell.
 *  2. A port's `gridRow` is *always* `1 / -1` (the full row-track span,
 *     however many sub-rows the device has), never a specific row —
 *     `height` (default one sub-row) + `align-self: center` is what
 *     makes it look like it only occupies the sub-row it landed on.
 *     Growing that height via the bottom handle is what fills more of
 *     the device's height, up to the full span. One column can only
 *     ever hold one port, so grouping only needs column adjacency. */
export default function DeviceFaceGrid({
  side,
  subRows,
  elements,
  selectedId,
  onSelect,
  onResizeGroup,
  onResizeHeight,
  readOnly
}: {
  side: Side;
  subRows: number;
  elements: FaceElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  onResizeHeight: (memberIds: string[], newHeightPx: number) => void;
  readOnly?: boolean;
}) {
  const bySideElements = elements.filter((e) => e.side === side);
  const blocks = buildBlocks(bySideElements);
  const selectedGroupId = bySideElements.find((e) => e.id === selectedId)?.groupId;
  const occupiedCols = new Set(blocks.flatMap((b) => Array.from({ length: b.maxCol - b.minCol + 1 }, (_, i) => b.minCol + i)));
  const maxHeightPx = subRows * SUB_ROW_H;

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

      {Array.from({ length: PORT_COLUMNS }, (_, col) => {
        if (occupiedCols.has(col)) return null;
        return <DropCell key={`drop-${col}`} side={side} col={col} readOnly={readOnly} />;
      })}

      {blocks.map((b) => (
        <PortBlock
          key={b.key}
          block={b}
          allElements={elements}
          selected={b.groupId != null && b.groupId === selectedGroupId}
          selectedId={selectedId}
          maxHeightPx={maxHeightPx}
          onSelect={onSelect}
          onResizeGroup={onResizeGroup}
          onResizeHeight={onResizeHeight}
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
  heightPx: number;
  minCol: number;
  maxCol: number;
}

/** Groups same-groupId ports into one spanning block; text/icon elements
 *  (and any stray groupless port) are each their own single-column block. */
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
      heightPx: Math.max(...members.map((m) => m.heightPx || SUB_ROW_H)),
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
      heightPx: e.heightPx || SUB_ROW_H,
      minCol: e.col,
      maxCol: e.col
    });
  }
  return blocks;
}

function DropCell({ side, col, readOnly }: { side: Side; col: number; readOnly?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `face-cell-${side}-${col}`,
    data: { side, col },
    disabled: readOnly
  });
  return (
    <div
      ref={setNodeRef}
      style={{ gridColumn: col + 2, gridRow: '1 / -1', backgroundColor: isOver ? 'rgba(59,130,246,0.25)' : undefined }}
    />
  );
}

function PortBlock({
  block,
  allElements,
  selected,
  selectedId,
  maxHeightPx,
  onSelect,
  onResizeGroup,
  onResizeHeight,
  readOnly
}: {
  block: Block;
  allElements: FaceElement[];
  selected: boolean;
  selectedId: string | null;
  maxHeightPx: number;
  onSelect: (id: string) => void;
  onResizeGroup: (groupId: string, newMaxCol: number) => void;
  onResizeHeight: (memberIds: string[], newHeightPx: number) => void;
  readOnly?: boolean;
}) {
  const colSpan = block.maxCol - block.minCol + 1;

  return (
    <div
      style={{
        gridColumn: `${block.minCol + 2} / span ${colSpan}`,
        gridRow: '1 / -1',
        alignSelf: 'center',
        height: block.heightPx,
        borderColor: selected ? '#3b82f6' : '#52525b',
        backgroundColor: 'transparent',
        zIndex: 10
      }}
      className="relative rounded-sm border font-mono text-[8px]"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${block.members.length}, 1fr)` }}>
          {block.kind === 'port'
            ? block.members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(m.id)}
                  style={{ backgroundColor: m.id === selectedId ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)' }}
                  className="flex flex-col items-center justify-center gap-0 overflow-hidden rounded-[2px] text-[#d4d4d8] hover:brightness-125"
                >
                  {(() => {
                    const def = getPortTypeDef(m.portType || '');
                    const Icon = def?.icon || TbTypography;
                    return (
                      <>
                        <span>{computePortNumber(m, allElements)}</span>
                        <Icon className="size-3" />
                      </>
                    );
                  })()}
                </button>
              ))
            : (
                <button
                  type="button"
                  onClick={() => onSelect(block.members[0].id)}
                  className="flex flex-col items-center justify-center gap-0 text-[#d4d4d8] hover:brightness-125"
                >
                  <ElementGlyph element={block.members[0]} />
                </button>
              )}
        </div>
      </div>

      {block.kind === 'port' && !readOnly && (
        <ResizeHandle
          axis="x"
          className="absolute top-0 -right-1.5 h-full w-3"
          cursor="cursor-ew-resize"
          icon={<TbChevronRight className="size-2" />}
          onStart={(startClientX) => {
            const groupId = block.groupId!;
            const startMaxCol = block.maxCol;
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
        />
      )}
      {!readOnly && (
        <ResizeHandle
          axis="y"
          className="absolute -bottom-1.5 left-0 h-3 w-full"
          cursor="cursor-ns-resize"
          icon={<TbChevronDown className="size-2" />}
          onStart={(startClientY) => {
            const startHeight = block.heightPx;
            const onMove = (ev: PointerEvent) => {
              const deltaPx = ev.clientY - startClientY;
              const next = Math.max(SUB_ROW_H, Math.min(maxHeightPx, startHeight + deltaPx));
              onResizeHeight(block.memberIds, next);
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
