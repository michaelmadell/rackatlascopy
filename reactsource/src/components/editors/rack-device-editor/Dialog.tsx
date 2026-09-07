import { useEffect, useMemo, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import {
  Dialog,
  DialogContent,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/patchdocs-ui';
import { useAppStore } from '@/lib/app-store';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { STANDARD_DEVICE_TYPES } from '@/lib/device-constants';
import type { CustomRackDevice } from '@/types';
import PortToolbar from './PortToolbar';
import DeviceFaceGrid from './DeviceFaceGrid';
import PortSettingsPanel from './PortSettingsPanel';
import { resolveGroupForDrop, computePortNumber } from './layout-utils';
import { PORT_COLUMNS, SUB_ROWS_PER_U, type FaceElement, type Side } from './port-types';

/** Grows/shrinks a group to a new minCol..maxCol × minRow..maxRow rectangle
 *  (one of the two bounds always equals the group's current one — the
 *  horizontal handle only ever moves maxCol, the vertical handle only
 *  ever moves maxRow), filling in a real FaceElement for every newly
 *  covered cell and dropping any that fall outside the new rectangle.
 *  Stops extending in a direction as soon as it would land on a cell a
 *  *different* group already occupies. */
function resizeGroupRect(
  prev: FaceElement[],
  groupId: string,
  minCol: number,
  maxCol: number,
  minRow: number,
  maxRow: number
): FaceElement[] {
  const group = prev.filter((e) => e.kind === 'port' && e.groupId === groupId);
  if (!group.length) return prev;
  const base = group[0];
  const currentKeys = new Set(group.map((e) => `${e.row}:${e.col}`));
  const targetCells: Array<[row: number, col: number]> = [];
  for (let c = minCol; c <= maxCol; c++) for (let r = minRow; r <= maxRow; r++) targetCells.push([r, c]);
  const targetKeys = new Set(targetCells.map(([r, c]) => `${r}:${c}`));

  let next = prev.filter((e) => !(e.kind === 'port' && e.groupId === groupId && !targetKeys.has(`${e.row}:${e.col}`)));
  for (const [r, c] of targetCells) {
    const key = `${r}:${c}`;
    if (currentKeys.has(key)) continue;
    const occupied = prev.some((e) => e.side === base.side && e.row === r && e.col === c && e.groupId !== groupId);
    if (occupied) continue;
    next = [
      ...next,
      {
        id: crypto.randomUUID(),
        kind: 'port',
        side: base.side,
        row: r,
        col: c,
        portType: base.portType,
        groupId,
        idPrefix: base.idPrefix,
        connectorType: base.connectorType,
        countingDirection: base.countingDirection
      }
    ];
  }
  return next;
}

/**
 * Rack Device Editor — clone of app.patchdocs.io's Device Library "create
 * custom device" dialog: top fields (Name/Brand/Device type/Rack units), a
 * Port Types + Elements toolbar, a front/back device-face canvas you drag
 * ports onto, and a settings panel for whichever port (or text/icon
 * element) is selected.
 */
export default function RackDeviceEditorDialog({
  open,
  onOpenChange,
  initialData,
  viewOnly,
  forceEditable,
  onCreated,
  onUpdated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CustomRackDevice;
  viewOnly?: boolean;
  forceEditable?: boolean;
  onCreated?: () => void;
  onUpdated?: () => void;
}) {
  const customer = useAppStore((s) => s.customer);
  const api = useAuthenticatedApi();
  const rackDevice = initialData;
  const isEdit = !!rackDevice;
  const readOnly = !!viewOnly && !forceEditable;
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [rackUnits, setRackUnits] = useState(1);
  const [side, setSide] = useState<Side>('front');
  const [elements, setElements] = useState<FaceElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(rackDevice?.name || '');
    setBrand((rackDevice as any)?.manufacturer || rackDevice?.brand || '');
    setDeviceType((rackDevice as any)?.deviceType || rackDevice?.type || '');
    setRackUnits((rackDevice as any)?.height || rackDevice?.rackUnits || 1);
    setSide('front');
    setSelectedId(null);
    // Existing entries are only ever the richer FaceElement shape this
    // editor writes (older seed data has ports:[] with nothing to migrate)
    // — anything malformed is dropped rather than crash the canvas.
    const loaded = ((rackDevice?.ports as any[]) || []).filter((p) => p && typeof p === 'object' && p.id && p.side && p.kind);
    setElements(loaded);
  }, [open, rackDevice]);

  const deviceTypeOptions = useMemo(() => {
    const standard = STANDARD_DEVICE_TYPES.rack.map((d) => ({ id: d.id, label: d.label() }));
    const custom = (customer?.customDeviceTypes || [])
      .filter((d) => d.category === 'rack')
      .map((d) => ({ id: d._id, label: d.name }));
    return [...standard, ...custom];
  }, [customer?.customDeviceTypes]);

  const deviceTypeLabel = deviceTypeOptions.find((d) => d.id === deviceType)?.label;

  const selectedElement = elements.find((e) => e.id === selectedId) || null;

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly || !event.over) return;
    const dropData = event.active.data.current as { kind: 'port' | 'text' | 'icon'; portType?: string };
    const { side: dropSide, row, col } = event.over.data.current as { side: Side; row: number; col: number };

    const id = crypto.randomUUID();
    let next: FaceElement;
    if (dropData.kind === 'port') {
      const group = resolveGroupForDrop(dropData.portType!, dropSide, row, col, elements);
      next = { id, kind: 'port', side: dropSide, row, col, portType: dropData.portType, ...group };
    } else {
      next = { id, kind: dropData.kind, side: dropSide, row, col };
    }
    setElements((prev) => [...prev, next]);
    setSelectedId(id);
  };

  const updateGroup = (groupId: string, patch: Partial<FaceElement>) => {
    setElements((prev) => prev.map((e) => (e.kind === 'port' && e.groupId === groupId ? { ...e, ...patch } : e)));
  };

  // Drag the handle on a group's rightmost column to extend/shrink it
  // horizontally — adds a whole new column of ports (one per row the
  // group already spans) up to newMaxCol, or drops whatever falls past it
  // when shrinking. minCol and the row range never move; this is a
  // right-edge-only handle.
  const resizeGroup = (groupId: string, newMaxCol: number) => {
    setElements((prev) => {
      const group = prev.filter((e) => e.kind === 'port' && e.groupId === groupId);
      if (!group.length) return prev;
      const minCol = Math.min(...group.map((e) => e.col));
      const minRow = Math.min(...group.map((e) => e.row));
      const maxRow = Math.max(...group.map((e) => e.row));
      newMaxCol = Math.max(minCol, Math.min(PORT_COLUMNS - 1, newMaxCol));
      return resizeGroupRect(prev, groupId, minCol, newMaxCol, minRow, maxRow);
    });
  };

  // Drag the handle on a group's bottom row to extend/shrink it
  // vertically — adds a whole new row of ports (one per column the group
  // already spans) up to newMaxRow, or drops whatever falls past it when
  // shrinking. minRow and the column range never move.
  const resizeGroupVertical = (groupId: string, newMaxRow: number, subRows: number) => {
    setElements((prev) => {
      const group = prev.filter((e) => e.kind === 'port' && e.groupId === groupId);
      if (!group.length) return prev;
      const minCol = Math.min(...group.map((e) => e.col));
      const maxCol = Math.max(...group.map((e) => e.col));
      const minRow = Math.min(...group.map((e) => e.row));
      newMaxRow = Math.max(minRow, Math.min(subRows - 1, newMaxRow));
      return resizeGroupRect(prev, groupId, minCol, maxCol, minRow, newMaxRow);
    });
  };

  // Text/icon elements resize independently — not a group rectangle, just
  // this one element's own colSpan/rowSpan growing/shrinking from its
  // fixed col/row origin (mirrors resizeGroup/resizeGroupVertical's
  // right/bottom-edge-only math, just against a single element instead of
  // a whole port group).
  const resizeElementSpan = (id: string, axis: 'col' | 'row', newMax: number, subRows: number) => {
    setElements((prev) => {
      const el = prev.find((e) => e.id === id);
      if (!el) return prev;
      if (axis === 'col') {
        const clamped = Math.max(el.col, Math.min(PORT_COLUMNS - 1, newMax));
        const rowSpanNow = el.rowSpan || 1;
        for (let c = el.col + (el.colSpan || 1); c <= clamped; c++) {
          for (let r = el.row; r < el.row + rowSpanNow; r++) {
            if (prev.some((o) => o.id !== id && o.side === el.side && o.row === r && o.col === c)) return prev;
          }
        }
        return prev.map((e) => (e.id === id ? { ...e, colSpan: clamped - el.col + 1 } : e));
      } else {
        const clamped = Math.max(el.row, Math.min(subRows - 1, newMax));
        const colSpanNow = el.colSpan || 1;
        for (let r = el.row + (el.rowSpan || 1); r <= clamped; r++) {
          for (let c = el.col; c < el.col + colSpanNow; c++) {
            if (prev.some((o) => o.id !== id && o.side === el.side && o.row === r && o.col === c)) return prev;
          }
        }
        return prev.map((e) => (e.id === id ? { ...e, rowSpan: clamped - el.row + 1 } : e));
      }
    });
  };

  const updateValue = (id: string, value: string) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, value } : e)));
  };

  const deleteElement = (el: FaceElement) => {
    setElements((prev) => prev.filter((e) => (el.kind === 'port' && el.groupId ? e.groupId !== el.groupId : e.id !== el.id)));
    setSelectedId(null);
  };

  const portCount = elements.filter((e) => e.kind === 'port').length;

  const handleSubmit = async () => {
    const ports = elements.map((e) => (e.kind === 'port' ? { ...e, number: computePortNumber(e, elements) } : e));
    const payload = {
      name,
      manufacturer: brand,
      deviceType,
      height: rackUnits,
      portsCount: portCount,
      ports
    };
    setSaving(true);
    try {
      if (isEdit && rackDevice) {
        await api.patch(`/custom-rack-device/${rackDevice._id}`, payload);
        onUpdated?.();
      } else {
        await api.post('/custom-rack-device', payload);
        onCreated?.();
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-w-4xl alone loses to the component's own default className,
       * which bakes in `sm:max-w-sm` (see src/patchdocs-ui/index.js's
       * DialogContent) — twMerge only dedupes classes in the same
       * responsive-variant slot, so an unprefixed override never touches a
       * `sm:`-prefixed default. Overriding that exact slot is what wins. */}
      <DialogContent className="max-w-4xl sm:max-w-4xl">
        {/* DialogContent already renders its own top-2 right-2 close button
         * (showCloseButton defaults to true) — a second one here was a
         * literal duplicate. pr-8 keeps the title clear of it. */}
        <h2 className="mb-4 pr-8 text-base font-bold text-[#f4f4f5]">Rack Device Editor</h2>

        <div className="mb-4 grid grid-cols-4 gap-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Name" disabled={readOnly} />
          </div>
          <div>
            <Label>Brand</Label>
            <Input value={brand} onChange={(e: any) => setBrand(e.target.value)} placeholder="e.g. Cisco" disabled={readOnly} />
          </div>
          <div>
            <Label>Device type *</Label>
            <Select value={deviceType} onValueChange={setDeviceType} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select…">{deviceTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {deviceTypeOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rack units</Label>
            <Select value={String(rackUnits)} onValueChange={(v: string) => setRackUnits(Number(v))} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue>{rackUnits} RU</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} RU
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DndContext onDragEnd={handleDragEnd}>
          {/* Real: toolbar row + canvas share one `p-4 bg-muted
           * dark:bg-input/30 rounded-md space-y-6` card — not two separate
           * flat elements. */}
          <div className="mb-4 space-y-6 rounded-md p-4" style={{ backgroundColor: '#27272a' }}>
            <div className="flex items-start justify-between gap-3">
              {!readOnly ? <PortToolbar /> : <div />}
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-[#3f3f46] p-1" style={{ backgroundColor: '#09090b' }}>
                {(['front', 'back'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    // Real active state is an inverted pill
                    // (bg-foreground text-background), not a subtle
                    // same-tone highlight.
                    style={{ backgroundColor: side === s ? '#f4f4f5' : undefined }}
                    className={`px-3 py-1 rounded text-xs font-medium capitalize ${side === s ? 'text-[#09090b]' : 'text-[#a1a1aa]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <DeviceFaceGrid
                side={side}
                subRows={rackUnits * SUB_ROWS_PER_U}
                elements={elements}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onResizeGroup={resizeGroup}
                onResizeGroupVertical={(groupId, newMaxRow) => resizeGroupVertical(groupId, newMaxRow, rackUnits * SUB_ROWS_PER_U)}
                onResizeElementSpan={(id, axis, newMax) => resizeElementSpan(id, axis, newMax, rackUnits * SUB_ROWS_PER_U)}
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="mb-4">
            <PortSettingsPanel
              element={selectedElement}
              allElements={elements}
              hasAnyElements={elements.length > 0}
              onUpdateGroup={updateGroup}
              onUpdateValue={updateValue}
              onDelete={deleteElement}
              readOnly={readOnly}
            />
          </div>
        </DndContext>

        {/* Real footer bleeds to the dialog's edges as its own bordered bar
         * (bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4), not a plain
         * flex row sharing the body's padding. */}
        <div
          className="-mx-4 -mb-4 flex justify-end gap-2.5 rounded-b-xl border-t border-[#27272a] p-4"
          style={{ backgroundColor: 'rgba(39,39,42,0.5)' }}
        >
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmit} disabled={!name || !deviceType || saving}>
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
