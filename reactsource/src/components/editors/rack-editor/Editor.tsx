import { useEffect, useRef, useState } from 'react';
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
import { useResponsibleUserOptions } from '@/hooks/useResponsibleUserOptions';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/patchdocs-ui';
import { TbTrash, TbX, TbZoomIn, TbZoomOut, TbZoomReset } from 'react-icons/tb';
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
import Combobox from '@/components/common/Combobox';
import PhotosField from './PhotosField';
import NotesField from './NotesField';

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
  // Which port has the little orange pin floating above it on the rack
  // elevation — a real recording corrected this session's own earlier
  // drag-to-connect guess: clicking a port just selects it and drops this
  // pin, and it's the *pin* that opens the Connect Port dialog below.
  const [selectedPort, setSelectedPort] = useState<{ deviceId: string; elementId: string } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Real recording shows ctrl+scroll zooming the rack elevation, plus a
  // small +/-/reset control stack on the canvas's own left edge.
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    setSelectedDeviceId(initialSelectedDeviceId || null);
  }, [initialSelectedDeviceId]);

  // A plain onWheel prop can't reliably preventDefault — React (17+)
  // registers the root wheel listener as passive for scroll performance,
  // and calling preventDefault inside a passive listener is a silent
  // no-op (or a console warning) depending on the browser. A real
  // (non-passive) listener attached directly to the canvas node is the
  // only way to actually stop the page from scrolling while ctrl+scroll
  // zooms the rack instead.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(2, Math.max(0.25, z * (1 - e.deltaY * 0.001))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

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
    // Any device-selection change NOT driven by a port click (see
    // onPortClick below) drops whatever pin is showing — a real recording
    // only ever shows one pin at a time, tied to the port last clicked.
    setSelectedPort(null);
  };

  const invalidateSubDevices = () => {
    queryClient.invalidateQueries({ queryKey: ['sub-devices-and-connections'] });
  };

  // A device with no customRackDeviceId used to be linked by hand (a
  // "Catalog device" picker in DeviceProperties). That picker's gone —
  // every device that has a real catalog match now gets linked
  // automatically instead, same match rule AddDeviceDialog already uses
  // (device.type against a catalog entry's deviceType/type). A builtin
  // catalog entry never has a real _id to link to, so a device placed
  // from one stays unlinked until a matching CustomRackDevice exists in
  // the Device Library. `autoLinkAttempted` stops a device from being
  // retried every render — once tried, it's tried, whether or not a
  // match existed at that moment (a template added later doesn't
  // retroactively sweep up devices this effect already looked at).
  const autoLinkAttempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (readOnly || !onDeviceUpdate) return;
    for (const d of subDevices) {
      if (d.customRackDeviceId || autoLinkAttempted.current.has(d._id)) continue;
      autoLinkAttempted.current.add(d._id);
      const match = customRackDevices.find((cd) => (cd.deviceType || cd.type) === d.type);
      if (!match) continue;
      onDeviceUpdate(d._id, { customRackDeviceId: match._id, elements: snapshotElements(match.ports) }).then(
        invalidateSubDevices
      );
    }
  }, [subDevices, customRackDevices, readOnly, onDeviceUpdate]);

  const handleDeleteDevice = async (id: string) => {
    if (!tenantId) return;
    await api.delete(`/tenant/${tenantId}/device/${id}`);
    selectDevice(null);
    invalidateSubDevices();
  };

  // Opens the Connect Port dialog for a port — the actual connection is
  // only created once a target port is picked inside that dialog, in
  // handleConnectConfirm below. Two entry points share this: the sidebar's
  // DevicePortsPanel (a port row click opens it directly) and, on the rack
  // elevation itself, clicking the *pin* above an already-selected port
  // (RackGrid's own onPinClick — see the <RackGrid> call site below).
  const handlePortClick = (device: any, element: FaceElement) => {
    setConnectingFrom({ device, element });
  };

  const createConnection = async (sourceDevice: any, sourceElement: FaceElement, targetDevice: any, targetElement: FaceElement) => {
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

  const handleConnectConfirm = async (targetDevice: any, targetElement: FaceElement) => {
    if (!connectingFrom) return;
    const { device: sourceDevice, element: sourceElement } = connectingFrom;
    setConnectingFrom(null);
    await createConnection(sourceDevice, sourceElement, targetDevice, targetElement);
  };

  // Dropping a dragged port directly onto another port on the rack
  // elevation — the real app's own direct connect gesture, alongside (not
  // instead of) the plain-click-selects-a-pin flow above: a real
  // recording shows both starting from the same press-on-a-port, and
  // RackGrid's own startPortDrag is what tells them apart by whether the
  // pointer moved before release.
  const handleCableDrop = (sourceDevice: any, sourceElement: FaceElement, targetDevice: any, targetElement: FaceElement) =>
    createConnection(sourceDevice, sourceElement, targetDevice, targetElement);

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
      <div className="h-full flex bg-[#0c0c0e] text-[#f4f4f5] overflow-hidden">
        {!readOnly && <DevicePalette />}

        {/* relative wrapper so the zoom controls below stay pinned to the
         * canvas's own viewport instead of scrolling away with its
         * content — the scrollable div itself can't host them directly,
         * `position: sticky` inside a scroll container still moves with
         * cross-axis scroll and this canvas only scrolls one axis anyway. */}
        <div className="min-h-0 flex-1 relative">
          {/* p-10/gap-8: a real recording shows real breathing room around
           * the rack elevation itself — space above/below it inside the
           * scrollable canvas, not the rack butted up against the toolbar
           * and the edges of the view. */}
          <div ref={canvasRef} className="h-full overflow-y-auto p-10 flex flex-col items-center gap-8">
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
              onCableDrop={readOnly ? undefined : handleCableDrop}
              selectedPort={selectedPort}
              onPortClick={
                readOnly
                  ? undefined
                  : (device, element) => {
                      selectDevice(device._id);
                      setSelectedPort({ deviceId: device._id, elementId: element.id });
                    }
              }
              onPinClick={readOnly ? undefined : handlePortClick}
              zoom={zoom}
            />
          )}
          </div>

          {/* Floats over the canvas like the zoom stack — was inline in the
           * scrollable content before (part of the flex column above the
           * rack), scrolling away with it instead of staying put. */}
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#27272a] bg-[#18181b] p-1">
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

          <div className="absolute left-4 top-4 flex flex-col gap-1 rounded-lg border border-[#27272a] bg-[#18181b] p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2, z * 1.2))}
              className="rounded p-1.5 text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5]"
              title="Zoom in"
            >
              <TbZoomIn className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))}
              className="rounded p-1.5 text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5]"
              title="Zoom out"
            >
              <TbZoomOut className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded p-1.5 text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5]"
              title="Reset zoom"
            >
              <TbZoomReset className="size-4" />
            </button>
          </div>
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
  const [reference, setReference] = useState(rack?.reference || '');
  const [name, setName] = useState(rack?.name || '');
  const [responsibleUserId, setResponsibleUserId] = useState(rack?.responsibleUserId || '');
  const [heightU, setHeightU] = useState(rack?.heightU ?? 42);
  const [manufacturer, setManufacturer] = useState(rack?.manufacturer || '');
  const [modelName, setModelName] = useState(rack?.modelName || '');
  const [serialNumber, setSerialNumber] = useState(rack?.serialNumber || '');
  const [purchaseDate, setPurchaseDate] = useState(rack?.purchaseDate || '');
  const [operationStart, setOperationStart] = useState(rack?.operationStart || '');
  const [photos, setPhotos] = useState<string[]>(rack?.photos || []);
  const userOptions = useResponsibleUserOptions();

  useEffect(() => {
    setReference(rack?.reference || '');
    setName(rack?.name || '');
    setResponsibleUserId(rack?.responsibleUserId || '');
    setHeightU(rack?.heightU ?? 42);
    setManufacturer(rack?.manufacturer || '');
    setModelName(rack?.modelName || '');
    setSerialNumber(rack?.serialNumber || '');
    setPurchaseDate(rack?.purchaseDate || '');
    setOperationStart(rack?.operationStart || '');
    setPhotos(rack?.photos || []);
  }, [rack?._id]);

  return (
    <aside className="min-h-0 w-72 shrink-0 overflow-y-auto border-l border-[#27272a] p-4 text-xs space-y-3">
      <h3 className="font-semibold">Rack</h3>
      <div>
        <Label>ID</Label>
        <Input value={reference} onChange={(e: any) => setReference(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e: any) => setName(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Responsible person</Label>
        <Combobox options={userOptions} value={responsibleUserId} onChange={setResponsibleUserId} disabled={readOnly} />
      </div>
      <div>
        <Label>Rack units</Label>
        <Input
          type="number"
          value={heightU}
          onChange={(e: any) => setHeightU(Number(e.target.value))}
          disabled={readOnly}
        />
      </div>
      <div>
        <Label>Manufacturer</Label>
        <Input value={manufacturer} onChange={(e: any) => setManufacturer(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Model name</Label>
        <Input value={modelName} onChange={(e: any) => setModelName(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Serial number</Label>
        <Input value={serialNumber} onChange={(e: any) => setSerialNumber(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Purchase date</Label>
        <Input type="date" value={purchaseDate} onChange={(e: any) => setPurchaseDate(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Operation start</Label>
        <Input type="date" value={operationStart} onChange={(e: any) => setOperationStart(e.target.value)} disabled={readOnly} />
      </div>

      <PhotosField photos={photos} onChange={setPhotos} readOnly={readOnly} />

      {!readOnly && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() =>
              onUpdate?.({
                reference,
                name,
                responsibleUserId: responsibleUserId || null,
                heightU,
                manufacturer,
                modelName,
                serialNumber,
                purchaseDate,
                operationStart,
                photos
              })
            }
          >
            Save
          </Button>
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <TbTrash className="size-4 mr-1" /> Delete rack
            </Button>
          )}
        </div>
      )}

      <NotesField
        notes={rack?.notes || ''}
        resourceName={rack?.name || ''}
        readOnly={readOnly}
        onSave={(content) => onUpdate?.({ notes: content })}
      />
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
  const [reference, setReference] = useState(device.reference || '');
  const [name, setName] = useState(device.name || '');
  const [type, setType] = useState(device.type || '');
  const [heightU, setHeightU] = useState(device.heightU ?? 1);
  const [unit, setUnit] = useState(device.unit ?? 1);
  const [side, setSide] = useState(device.side || 'front');
  const [responsibleUserId, setResponsibleUserId] = useState(device.responsibleUserId || '');
  const [manufacturer, setManufacturer] = useState(device.manufacturer || '');
  const [modelName, setModelName] = useState(device.modelName || '');
  const [serialNumber, setSerialNumber] = useState(device.serialNumber || '');
  const [purchaseDate, setPurchaseDate] = useState(device.purchaseDate || '');
  const [operationStart, setOperationStart] = useState(device.operationStart || '');
  const [photos, setPhotos] = useState<string[]>(device.photos || []);
  const userOptions = useResponsibleUserOptions();
  // Per-port edits (Port name/Speed/VLAN from DevicePortsPanel) land here
  // first, not straight onto `device` — null means "no local edits yet",
  // distinct from an edited-but-empty array, so Save knows whether to
  // touch `elements` at all. Catalog linking is automatic now (see
  // RackEditor's own auto-link effect) — this component never touches
  // customRackDeviceId/elements wholesale itself any more, only per-port.
  const [elementsDraft, setElementsDraft] = useState<FaceElement[] | null>(null);

  useEffect(() => {
    setReference(device.reference || '');
    setName(device.name || '');
    setType(device.type || '');
    setHeightU(device.heightU ?? 1);
    setUnit(device.unit ?? 1);
    setSide(device.side || 'front');
    setResponsibleUserId(device.responsibleUserId || '');
    setManufacturer(device.manufacturer || '');
    setModelName(device.modelName || '');
    setSerialNumber(device.serialNumber || '');
    setPurchaseDate(device.purchaseDate || '');
    setOperationStart(device.operationStart || '');
    setPhotos(device.photos || []);
    setElementsDraft(null);
  }, [device._id]);

  const handleUpdatePort = (elementId: string, patch: Partial<FaceElement>) => {
    setElementsDraft((prev) => (prev || device.elements || []).map((e: FaceElement) => (e.id === elementId ? { ...e, ...patch } : e)));
  };

  const handleSave = () => {
    const patch: Record<string, any> = {
      reference,
      name,
      type,
      heightU,
      unit,
      side,
      responsibleUserId: responsibleUserId || null,
      manufacturer,
      modelName,
      serialNumber,
      purchaseDate,
      operationStart,
      photos
    };
    if (elementsDraft !== null) patch.elements = elementsDraft;
    onUpdate?.(device._id, patch);
  };

  return (
    <aside className="min-h-0 w-72 shrink-0 overflow-y-auto border-l border-[#27272a] p-4 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Device</h3>
        <button type="button" onClick={onClose} className="text-[#a1a1aa] hover:text-[#f4f4f5]">
          <TbX className="size-4" />
        </button>
      </div>
      <div>
        <Label>ID</Label>
        <Input value={reference} onChange={(e: any) => setReference(e.target.value)} disabled={readOnly} />
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
        <Label>Responsible person</Label>
        <Combobox options={userOptions} value={responsibleUserId} onChange={setResponsibleUserId} disabled={readOnly} />
      </div>
      <div>
        <Label>Manufacturer</Label>
        <Input value={manufacturer} onChange={(e: any) => setManufacturer(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Model name</Label>
        <Input value={modelName} onChange={(e: any) => setModelName(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Serial number</Label>
        <Input value={serialNumber} onChange={(e: any) => setSerialNumber(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Purchase date</Label>
        <Input type="date" value={purchaseDate} onChange={(e: any) => setPurchaseDate(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Operation start</Label>
        <Input type="date" value={operationStart} onChange={(e: any) => setOperationStart(e.target.value)} disabled={readOnly} />
      </div>

      <PhotosField photos={photos} onChange={setPhotos} readOnly={readOnly} />

      <div>
        <Label>Catalog device</Label>
        {/* No manual picker any more — RackEditor's own auto-link effect
         * links (or re-links) this device by matching `type` against the
         * Device Library as soon as a match exists, so there's nothing
         * left for a person to pick. This is read-only status, not a
         * control. */}
        <p className="text-[11px] text-[#d4d4d8]">
          {device.customRackDeviceId
            ? customRackDevices.find((d) => d._id === device.customRackDeviceId)?.name || 'Unknown device'
            : 'Not in Device Library'}
        </p>
      </div>

      <DevicePortsPanel
        device={elementsDraft !== null ? { ...device, elements: elementsDraft } : device}
        deviceConnections={deviceConnections}
        onUpdatePort={handleUpdatePort}
        onConnectClick={(el) => onPortClick(device, el)}
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

      <NotesField
        notes={device.notes || ''}
        resourceName={device.name || ''}
        readOnly={readOnly}
        onSave={(content) => onUpdate?.(device._id, { notes: content })}
      />
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
    <aside className="min-h-0 w-72 shrink-0 overflow-y-auto border-l border-[#27272a] p-4 text-xs space-y-3">
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
