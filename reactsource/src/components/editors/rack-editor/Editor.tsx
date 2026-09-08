import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type Modifier
} from '@dnd-kit/core';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/patchdocs-ui';
import { TbTrash, TbX } from 'react-icons/tb';
import type { FaceElement, DeviceConnection } from '@/types';
import { STANDARD_DEVICE_TYPES } from '@/lib/device-constants';
import { computePortNumber } from '../rack-device-editor/layout-utils';
import RackDeviceEditorDialog from '../rack-device-editor/Dialog';
import RackGrid, { ROW_PX, type HoverRange } from './RackGrid';
import DevicePalette from './DevicePalette';
import AddDeviceDialog from './AddDeviceDialog';
import DevicePortsPanel from './DevicePortsPanel';
import ConnectPortDialog from './ConnectPortDialog';
import { getDeviceVisual } from './device-icon';

/** A placed device's `elements` is its own frozen snapshot, never a live
 *  reference to the template it came from — editing the CustomRackDevice
 *  later must never reshuffle ports under a device that may already have
 *  cables landed on specific ones. Every id is regenerated so placing the
 *  same template twice (or re-linking one device twice) never lets two
 *  elements collide on the same id. */
function snapshotElements(templatePorts: FaceElement[] | undefined): FaceElement[] {
  return (templatePorts || []).map((el) => ({ ...el, id: crypto.randomUUID() }));
}

// Dragging a palette chip carries just a *category* now — real editor's own
// palette lists device-type categories (Cable Manager, Switch, ...), not
// individual catalog devices; which specific device gets placed is picked
// afterward in AddDeviceDialog (see handleDragEnd/pendingPlacement below).
type DragPayload = { kind: 'category'; category: string } | { kind: 'existing'; device: any };

/** Repositioning a placed device only ever moves it up/down its own rack
 *  column — locking the drag to the vertical axis makes that obvious and
 *  removes the wobble of a freely-tracked cursor. A fresh category chip still
 *  needs to travel sideways from the palette into the rack, so the lock
 *  only applies to `kind: 'existing'` drags. */
const lockExistingToVerticalAxis: Modifier = ({ transform, active }) => {
  if ((active?.data?.current as DragPayload | undefined)?.kind === 'existing') {
    return { ...transform, x: 0 };
  }
  return transform;
};

/** Shared by the live hover preview (onDragMove) and the actual commit
 *  (onDragEnd) so the highlighted footprint and the drop outcome can never
 *  disagree with each other. A category chip's eventual height isn't known
 *  until a specific device is picked in AddDeviceDialog, so drag/hover uses
 *  a 1U placeholder — handleInsertPendingDevice re-validates against the
 *  device actually picked before creating it. */
function resolveDrop(drag: DragPayload, hoveredUnit: number, heightU: number, subDevices: any[]) {
  const deviceHeightU = drag.kind === 'existing' ? drag.device.heightU || 1 : 1;
  const targetStart = hoveredUnit - deviceHeightU + 1;
  const targetTop = hoveredUnit;

  if (targetStart < 1 || targetTop > heightU) {
    return { targetStart, targetTop, valid: false, reason: "Doesn't fit there — off the top or bottom of the rack." };
  }

  const selfId = drag.kind === 'existing' ? drag.device._id : null;
  for (const other of subDevices) {
    if (other._id === selfId) continue;
    const otherStart = other.unit || 1;
    const otherTop = otherStart + (other.heightU || 1) - 1;
    if (targetStart <= otherTop && otherStart <= targetTop) {
      return { targetStart, targetTop, valid: false, reason: `Overlaps ${other.name}.` };
    }
  }

  return { targetStart, targetTop, valid: true, reason: null as string | null };
}

/**
 * Rack elevation editor — drag a device from the catalog onto the rack to
 * place it (creates it there), or drag a placed device onto a different
 * slot to move it (updates its `unit`). `unit` is always the device's
 * *bottom* occupied U (rack convention: U1 at the bottom); dropping anchors
 * the device's *top* edge to the slot under the cursor, which is the
 * intuitive way to drop something — so the target start is
 * `hoveredUnit - heightU + 1`.
 *
 * Sub-device create/delete/move aren't covered by any prop the parent page
 * passes (only update-by-id and whole-rack-delete are) — this component
 * owns those directly via useAuthenticatedApi, invalidating the same query
 * key the parent's subDevices list is read from.
 */
export default function RackEditor({
  rack,
  subDevices = [],
  onRackUpdate,
  onDeleteRack,
  onDeviceUpdate,
  isLoading,
  readOnly,
  customRackDevices = [],
  initialSelectedDeviceId,
  onSelectedDeviceChange,
  deviceConnections = [],
  onCreateDeviceConnections,
  onDeleteDeviceConnections,
  connectionsListOpen,
  setConnectionsListOpen,
}: {
  rack?: any;
  subDevices?: any[];
  onRackUpdate?: (data: any) => Promise<boolean> | void;
  onDeleteRack?: () => Promise<boolean> | void;
  onDeviceUpdate?: (subDeviceId: string, data: any) => Promise<boolean>;
  isLoading?: boolean;
  readOnly?: boolean;
  customRackDevices?: any[];
  initialSelectedDeviceId?: string;
  onSelectedDeviceChange?: (id: string | null) => void;
  /** Real prop names the page hosting this editor already sends (see
   *  t.$tenantId.locations.$locationId.devices.$deviceId.tsx) — connections
   *  touching any of subDevices' ports, keyed by device1Id/port1Name/
   *  device2Id/port2Name (see DeviceConnection in @/types). */
  deviceConnections?: DeviceConnection[];
  onCreateDeviceConnections?: (
    connections: Array<{
      locationId?: string;
      device1Id: string;
      port1Name: string;
      device2Id: string;
      port2Name: string;
      direction: string;
      connectionType: string;
    }>
  ) => Promise<void>;
  onDeleteDeviceConnections?: (connectionIds: string[]) => Promise<void>;
  connectionsListOpen?: boolean;
  setConnectionsListOpen?: (open: boolean) => void;
  [key: string]: any;
}) {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(initialSelectedDeviceId || null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null);
  const [hoverRange, setHoverRange] = useState<HoverRange | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<{ category: string; targetStart: number } | null>(null);
  const [inserting, setInserting] = useState(false);
  // "+ Create Custom Device" inside AddDeviceDialog jumps here — the Device
  // Library's own editor, pre-seeded with pendingPlacement's category — and
  // back once saved (see handleCustomDeviceCreated).
  const [creatingCustomDevice, setCreatingCustomDevice] = useState(false);
  // The port a Connect Port dialog is currently open for — real editor's
  // own connect flow (verified against a screen recording): clicking a
  // port opens a "Connect Port: <Device>/<Port>" dialog with a searchable
  // device list, not a click-elsewhere-on-canvas interaction.
  const [connectingFrom, setConnectingFrom] = useState<{ device: any; element: FaceElement } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    setSelectedDeviceId(initialSelectedDeviceId || null);
  }, [initialSelectedDeviceId]);

  useEffect(() => {
    if (!dropError) return;
    const t = setTimeout(() => setDropError(null), 3000);
    return () => clearTimeout(t);
  }, [dropError]);

  useEffect(() => {
    if (!connectError) return;
    const t = setTimeout(() => setConnectError(null), 3000);
    return () => clearTimeout(t);
  }, [connectError]);

  const heightU = rack?.heightU || 42;
  const tenantId = rack?.tenantId;

  const selectDevice = (id: string | null) => {
    setSelectedDeviceId(id);
    onSelectedDeviceChange?.(id);
  };

  const invalidateSubDevices = () => {
    queryClient.invalidateQueries({ queryKey: ['sub-devices-and-connections'] });
  };

  const handleDeleteDevice = async (id: string) => {
    if (!tenantId) return;
    await api.delete(`/tenant/${tenantId}/device/${id}`);
    selectDevice(null);
    invalidateSubDevices();
  };

  // A port click opens the Connect Port dialog for it — the actual
  // connection is only created once a target port is picked inside that
  // dialog, in handleConnectConfirm below.
  const handlePortClick = (device: any, element: FaceElement) => {
    setConnectingFrom({ device, element });
  };

  const handleConnectConfirm = async (targetDevice: any, targetElement: FaceElement) => {
    if (!connectingFrom) return;
    const { device: sourceDevice, element: sourceElement } = connectingFrom;
    setConnectingFrom(null);
    if (!onCreateDeviceConnections) {
      setConnectError('Connecting isn’t wired up here yet.');
      return;
    }
    try {
      await onCreateDeviceConnections([
        {
          locationId: rack?.locationId,
          device1Id: sourceDevice._id,
          port1Name: computePortNumber(sourceElement, sourceDevice.elements || []),
          device2Id: targetDevice._id,
          port2Name: computePortNumber(targetElement, targetDevice.elements || []),
          // Inferred format (side1-side2) — not directly observed.
          direction: `${sourceElement.side}-${targetElement.side}`,
          connectionType: 'user'
        }
      ]);
    } catch {
      setConnectError('Could not create that connection.');
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!onDeleteDeviceConnections) return;
    await onDeleteDeviceConnections([connectionId]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragPayload | undefined;
    if (data) setActiveDrag(data);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const drag = event.active.data.current as DragPayload | undefined;
    if (!drag || !event.over) {
      setHoverRange(null);
      return;
    }
    const hoveredUnit = (event.over.data.current as { unit: number }).unit;
    const { targetStart, targetTop, valid } = resolveDrop(drag, hoveredUnit, heightU, subDevices);
    setHoverRange({ start: targetStart, end: targetTop, valid });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const drag = activeDrag;
    setActiveDrag(null);
    setHoverRange(null);
    if (!drag || !event.over || !rack?._id || !tenantId) return;

    const hoveredUnit = (event.over.data.current as { unit: number }).unit;
    const { targetStart, valid, reason } = resolveDrop(drag, hoveredUnit, heightU, subDevices);

    if (!valid) {
      setDropError(reason);
      return;
    }

    if (drag.kind === 'category') {
      // A category chip only stages *where* — which specific device goes
      // there is picked next in AddDeviceDialog (handleInsertDevice below).
      // Real app's own flow: dropping a category never creates anything by
      // itself.
      setPendingPlacement({ category: drag.category, targetStart });
    } else {
      await onDeviceUpdate?.(drag.device._id, { unit: targetStart });
      invalidateSubDevices();
    }
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
    setHoverRange(null);
  };

  // AddDeviceDialog's own resolveDrop-style re-check: the drag/hover phase
  // assumed a 1U placeholder (a category chip's real height isn't known
  // until a device is picked), so the picked device's *actual* height has
  // to be validated against the same target slot before it's created —
  // it may no longer fit.
  const handleInsertDevice = async (pickedDevice: any) => {
    if (!pendingPlacement || !rack?._id || !tenantId) return;
    const pickedHeightU = pickedDevice.rackUnits || 1;
    const targetTop = pendingPlacement.targetStart + pickedHeightU - 1;
    if (pendingPlacement.targetStart < 1 || targetTop > heightU) {
      setDropError("That device doesn't fit there — off the top or bottom of the rack.");
      setPendingPlacement(null);
      return;
    }
    for (const other of subDevices) {
      const otherStart = other.unit || 1;
      const otherTop = otherStart + (other.heightU || 1) - 1;
      if (pendingPlacement.targetStart <= otherTop && otherStart <= targetTop) {
        setDropError(`Overlaps ${other.name}.`);
        setPendingPlacement(null);
        return;
      }
    }

    setInserting(true);
    try {
      const isBuiltin = typeof pickedDevice._id === 'string' && pickedDevice._id.startsWith('builtin-');
      await api.post(`/tenant/${tenantId}/device`, {
        tenantId,
        locationId: rack.locationId,
        floorId: rack.floorId,
        roomId: rack.roomId,
        rackId: rack._id,
        category: 'rack',
        name: pickedDevice.name,
        type: pickedDevice.type,
        heightU: pickedHeightU,
        unit: pendingPlacement.targetStart,
        side,
        // A builtin catalog entry (no real Device Library row behind it)
        // never claims customRackDeviceId — only a real CustomRackDevice
        // pick does, with its own frozen copy of that entry's port
        // layout (see snapshotElements above).
        customRackDeviceId: isBuiltin ? undefined : pickedDevice._id,
        elements: snapshotElements(pickedDevice.ports)
      });
      invalidateSubDevices();
      setPendingPlacement(null);
    } finally {
      setInserting(false);
    }
  };

  const handleCustomDeviceCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['custom-rack-devices'] });
    setCreatingCustomDevice(false);
    // The new device now exists in the catalog but AddDeviceDialog's own
    // list snapshot won't include it until that query refetches — closing
    // pendingPlacement too rather than leaving a stale dialog open; the
    // user re-drags the category to place it, now showing up in the list.
    setPendingPlacement(null);
  };

  const visibleSubDevices = subDevices.filter((d: any) => (d.side || 'front') === side);
  const selectedDevice = subDevices.find((d: any) => d._id === selectedDeviceId);

  // How many ports each device already has cabled — shown as a hint in the
  // Connect Port dialog's device list (the real dialog shows an existing
  // cable's short code instead, which we have no equivalent id for).
  const connectedCountByDeviceId = new Map<string, number>();
  for (const c of deviceConnections) {
    connectedCountByDeviceId.set(c.device1Id, (connectedCountByDeviceId.get(c.device1Id) || 0) + 1);
    connectedCountByDeviceId.set(c.device2Id, (connectedCountByDeviceId.get(c.device2Id) || 0) + 1);
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[lockExistingToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1 flex bg-[#0c0c0e] text-[#f4f4f5] overflow-hidden">
        {!readOnly && <DevicePalette />}

        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] rounded-lg p-1">
              {(['front', 'back'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`px-4 py-1 rounded text-xs font-medium capitalize ${
                    side === s ? 'bg-[#27272a] text-[#f4f4f5]' : 'text-[#a1a1aa]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {setConnectionsListOpen && (
              <button
                type="button"
                onClick={() => setConnectionsListOpen(!connectionsListOpen)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  connectionsListOpen
                    ? 'border-blue-400 bg-blue-500/10 text-blue-400'
                    : 'border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:text-[#f4f4f5]'
                }`}
              >
                Connections{deviceConnections.length > 0 ? ` (${deviceConnections.length})` : ''}
              </button>
            )}
          </div>

          {dropError && <p className="text-xs text-red-400">{dropError}</p>}
          {connectError && <p className="text-xs text-red-400">{connectError}</p>}

          {isLoading ? (
            <p className="text-xs text-[#a1a1aa]">Loading…</p>
          ) : (
            <RackGrid
              heightU={heightU}
              devices={visibleSubDevices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={selectDevice}
              readOnly={readOnly}
              hoverRange={hoverRange}
              viewSide={side}
              deviceConnections={deviceConnections}
              onDeleteConnection={readOnly ? undefined : handleDeleteConnection}
            />
          )}
        </div>

        {connectionsListOpen ? (
          <ConnectionsListPanel
            connections={deviceConnections}
            subDevices={subDevices}
            readOnly={readOnly}
            onDelete={handleDeleteConnection}
            onClose={() => setConnectionsListOpen?.(false)}
          />
        ) : (
          <RackSidePanel
            rack={rack}
            selectedDevice={selectedDevice}
            readOnly={readOnly}
            customRackDevices={customRackDevices}
            deviceConnections={deviceConnections}
            onPortClick={handlePortClick}
            onRackUpdate={onRackUpdate}
            onDeleteRack={onDeleteRack}
            onDeviceUpdate={onDeviceUpdate}
            onDeleteDevice={handleDeleteDevice}
            onClose={() => selectDevice(null)}
          />
        )}
      </div>

      <ConnectPortDialog
        open={!!connectingFrom}
        sourceDeviceName={connectingFrom?.device.name || ''}
        sourcePortName={connectingFrom ? computePortNumber(connectingFrom.element, connectingFrom.device.elements || []) : ''}
        targetDevices={subDevices.filter((d) => d._id !== connectingFrom?.device._id)}
        connectedCountByDeviceId={connectedCountByDeviceId}
        viewSide={side}
        onConnect={handleConnectConfirm}
        onClose={() => setConnectingFrom(null)}
      />

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeDrag && <DragGhost drag={activeDrag} />}
      </DragOverlay>

      <AddDeviceDialog
        open={!!pendingPlacement && !creatingCustomDevice}
        category={pendingPlacement?.category ?? null}
        categoryLabel={STANDARD_DEVICE_TYPES.rack.find((c) => c.id === pendingPlacement?.category)?.label() ?? ''}
        customRackDevices={customRackDevices}
        onInsert={handleInsertDevice}
        onCreateCustom={() => setCreatingCustomDevice(true)}
        onClose={() => setPendingPlacement(null)}
        inserting={inserting}
      />

      <RackDeviceEditorDialog
        open={creatingCustomDevice}
        onOpenChange={(next: boolean) => !next && setCreatingCustomDevice(false)}
        initialData={pendingPlacement ? ({ deviceType: pendingPlacement.category } as any) : undefined}
        onCreated={handleCustomDeviceCreated}
      />
    </DndContext>
  );
}

function DragGhost({ drag }: { drag: DragPayload }) {
  if (drag.kind === 'category') {
    const label = STANDARD_DEVICE_TYPES.rack.find((c) => c.id === drag.category)?.label() ?? drag.category;
    const { Icon, color } = getDeviceVisual(label);
    return (
      <div
        style={{ height: ROW_PX, width: 400, borderLeftColor: color }}
        className="flex cursor-grabbing items-center gap-1.5 overflow-hidden rounded-sm border border-l-[3px] border-blue-400 bg-[#202024]/95 px-2 text-left shadow-2xl shadow-black/60 ring-1 ring-blue-400/40"
      >
        <Icon className="size-3.5 shrink-0" style={{ color }} />
        <span className="min-w-0 flex-1 truncate text-[11px] text-[#f4f4f5]">{label}</span>
      </div>
    );
  }
  const heightU = drag.device.heightU || 1;
  const { Icon, color } = getDeviceVisual(drag.device.type);
  return (
    <div
      style={{ height: heightU * ROW_PX, width: 400, borderLeftColor: color }}
      className="flex cursor-grabbing items-center gap-1.5 overflow-hidden rounded-sm border border-l-[3px] border-blue-400 bg-[#202024]/95 px-2 text-left shadow-2xl shadow-black/60 ring-1 ring-blue-400/40"
    >
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[#f4f4f5]">{drag.device.name}</span>
      <span className="shrink-0 rounded bg-[#0c0c0e]/60 px-1 text-[9px] text-[#a1a1aa]">{heightU}U</span>
    </div>
  );
}

function RackSidePanel({
  rack,
  selectedDevice,
  readOnly,
  customRackDevices,
  deviceConnections,
  onPortClick,
  onRackUpdate,
  onDeleteRack,
  onDeviceUpdate,
  onDeleteDevice,
  onClose
}: {
  rack?: any;
  selectedDevice?: any;
  readOnly?: boolean;
  customRackDevices: any[];
  deviceConnections: DeviceConnection[];
  onPortClick: (device: any, element: FaceElement) => void;
  onRackUpdate?: (data: any) => Promise<boolean> | void;
  onDeleteRack?: () => Promise<boolean> | void;
  onDeviceUpdate?: (id: string, data: any) => Promise<boolean>;
  onDeleteDevice: (id: string) => void;
  onClose: () => void;
}) {
  if (selectedDevice) {
    return (
      <DeviceProperties
        key={selectedDevice._id}
        device={selectedDevice}
        readOnly={readOnly}
        customRackDevices={customRackDevices}
        deviceConnections={deviceConnections}
        onPortClick={onPortClick}
        onUpdate={onDeviceUpdate}
        onDelete={() => onDeleteDevice(selectedDevice._id)}
        onClose={onClose}
      />
    );
  }

  return (
    <RackProperties key={rack?._id} rack={rack} readOnly={readOnly} onUpdate={onRackUpdate} onDelete={onDeleteRack} />
  );
}

function RackProperties({
  rack,
  readOnly,
  onUpdate,
  onDelete
}: {
  rack?: any;
  readOnly?: boolean;
  onUpdate?: (data: any) => Promise<boolean> | void;
  onDelete?: () => Promise<boolean> | void;
}) {
  const [name, setName] = useState(rack?.name || '');
  const [heightU, setHeightU] = useState(rack?.heightU ?? 42);

  useEffect(() => {
    setName(rack?.name || '');
    setHeightU(rack?.heightU ?? 42);
  }, [rack?._id]);

  return (
    <aside className="w-72 border-l border-[#27272a] p-4 text-xs space-y-3 shrink-0 overflow-y-auto">
      <h3 className="font-semibold">Rack</h3>
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e: any) => setName(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Height (U)</Label>
        <Input
          type="number"
          value={heightU}
          onChange={(e: any) => setHeightU(Number(e.target.value))}
          disabled={readOnly}
        />
      </div>
      {!readOnly && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => onUpdate?.({ name, heightU })}>
            Save
          </Button>
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <TbTrash className="size-4 mr-1" /> Delete rack
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}

function DeviceProperties({
  device,
  readOnly,
  customRackDevices,
  deviceConnections,
  onPortClick,
  onUpdate,
  onDelete,
  onClose
}: {
  device: any;
  readOnly?: boolean;
  customRackDevices: any[];
  deviceConnections: DeviceConnection[];
  onPortClick: (device: any, element: FaceElement) => void;
  onUpdate?: (id: string, data: any) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(device.name || '');
  const [type, setType] = useState(device.type || '');
  const [heightU, setHeightU] = useState(device.heightU ?? 1);
  const [unit, setUnit] = useState(device.unit ?? 1);
  const [side, setSide] = useState(device.side || 'front');
  const [customRackDeviceId, setCustomRackDeviceId] = useState(device.customRackDeviceId || '');

  useEffect(() => {
    setName(device.name || '');
    setType(device.type || '');
    setHeightU(device.heightU ?? 1);
    setUnit(device.unit ?? 1);
    setSide(device.side || 'front');
    setCustomRackDeviceId(device.customRackDeviceId || '');
  }, [device._id]);

  const handleSave = () => {
    const patch: Record<string, any> = { name, type, heightU, unit, side };
    // Only touch elements/customRackDeviceId when the picked template
    // actually changed — every other field save (renaming, moving a U)
    // must never silently reset a device's ports.
    if (customRackDeviceId !== (device.customRackDeviceId || '')) {
      patch.customRackDeviceId = customRackDeviceId || null;
      const template = customRackDevices.find((d) => d._id === customRackDeviceId);
      patch.elements = customRackDeviceId ? snapshotElements(template?.ports) : [];
    }
    onUpdate?.(device._id, patch);
  };

  return (
    <aside className="w-72 border-l border-[#27272a] p-4 text-xs space-y-3 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Device</h3>
        <button type="button" onClick={onClose} className="text-[#a1a1aa] hover:text-[#f4f4f5]">
          <TbX className="size-4" />
        </button>
      </div>
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e: any) => setName(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Type</Label>
        <Input value={type} onChange={(e: any) => setType(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Starting U</Label>
        <Input type="number" min={1} value={unit} onChange={(e: any) => setUnit(Number(e.target.value))} disabled={readOnly} />
      </div>
      <div>
        <Label>Height (U)</Label>
        <Input type="number" min={1} value={heightU} onChange={(e: any) => setHeightU(Number(e.target.value))} disabled={readOnly} />
      </div>
      <div>
        <Label>Side</Label>
        <Select value={side} onValueChange={setSide} disabled={readOnly}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="back">Back</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Catalog device</Label>
        <Select
          value={customRackDeviceId || 'none'}
          onValueChange={(v: string) => setCustomRackDeviceId(v === 'none' ? '' : v)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="None">
              {customRackDeviceId ? customRackDevices.find((d) => d._id === customRackDeviceId)?.name || 'Unknown device' : 'None'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {customRackDevices.map((d) => (
              <SelectItem key={d._id} value={d._id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Picking a different device here replaces this device's ports
         * with that catalog device's layout on Save — a fresh snapshot,
         * not a live link, so a later edit to the catalog entry won't
         * reach back and change ports out from under any cables already
         * landed on this device. */}
        <p className="mt-1 text-[10px] text-[#52525b]">Linking replaces this device's ports with the catalog device's layout.</p>
      </div>

      <DevicePortsPanel
        device={device}
        deviceConnections={deviceConnections}
        onPortClick={(el) => onPortClick(device, el)}
        readOnly={readOnly}
      />

      {!readOnly && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <TbTrash className="size-4" />
          </Button>
        </div>
      )}
    </aside>
  );
}

/** Every connection touching this rack's devices, in one flat list — the
 *  fallback for pairs the SVG overlay in RackGrid doesn't draw a line for
 *  (a connection whose other end isn't on-screen: a different rack, or the
 *  opposite front/back side). */
function ConnectionsListPanel({
  connections,
  subDevices,
  readOnly,
  onDelete,
  onClose
}: {
  connections: DeviceConnection[];
  subDevices: any[];
  readOnly?: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const nameFor = (id: string) => subDevices.find((d) => d._id === id)?.name || 'Unknown device';

  return (
    <aside className="w-72 border-l border-[#27272a] p-4 text-xs space-y-3 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Connections</h3>
        <button type="button" onClick={onClose} className="text-[#a1a1aa] hover:text-[#f4f4f5]">
          <TbX className="size-4" />
        </button>
      </div>
      {connections.length === 0 && <p className="text-[#71717a]">No connections yet.</p>}
      <ul className="space-y-1.5">
        {connections.map((c) => {
          const id = c._id || c.id;
          return (
            <li key={id} className="rounded-sm border border-[#27272a] bg-[#18181b] p-2">
              <p className="truncate text-[#f4f4f5]">
                {nameFor(c.device1Id)} <span className="text-[#71717a]">{c.port1Name}</span>
              </p>
              <p className="truncate text-[#f4f4f5]">
                ↕ {nameFor(c.device2Id)} <span className="text-[#71717a]">{c.port2Name}</span>
              </p>
              {!readOnly && id && (
                <button type="button" onClick={() => onDelete(id)} className="mt-1 text-[10px] text-red-400 hover:text-red-300">
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
