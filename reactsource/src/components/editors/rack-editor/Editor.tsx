import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/patchdocs-ui';
import { TbTrash, TbX } from 'react-icons/tb';

/**
 * Rack elevation editor — a vertical stack of U-slots, click to place a
 * device (from the catalog) into an empty run of slots, click a placed
 * device to edit/delete it. No drag-and-drop (the real app's Rack Studio
 * editor has that; this is the click-based equivalent, same underlying
 * data model: `unit` = starting U position, `heightU` = how many it spans,
 * `rackId` = this rack's id).
 *
 * Sub-device create/delete aren't covered by any prop the parent page
 * passes (only update/rack-delete are) — this component owns those two
 * directly via useAuthenticatedApi, invalidating the same query key the
 * parent's subDevices list is read from.
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
  [key: string]: any;
}) {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(initialSelectedDeviceId || null);
  const [armedCatalogId, setArmedCatalogId] = useState<string>('');
  const [placingAtUnit, setPlacingAtUnit] = useState<number | null>(null);

  useEffect(() => {
    setSelectedDeviceId(initialSelectedDeviceId || null);
  }, [initialSelectedDeviceId]);

  const heightU = rack?.heightU || 42;
  const tenantId = rack?.tenantId;

  const selectDevice = (id: string | null) => {
    setSelectedDeviceId(id);
    onSelectedDeviceChange?.(id);
  };

  const invalidateSubDevices = () => {
    queryClient.invalidateQueries({ queryKey: ['sub-devices-and-connections'] });
  };

  const handlePlace = async (startUnit: number) => {
    const catalogDevice = customRackDevices.find((d: any) => d._id === armedCatalogId);
    if (!catalogDevice || !rack?._id || !tenantId) return;
    await api.post(`/tenant/${tenantId}/device`, {
      tenantId,
      locationId: rack.locationId,
      floorId: rack.floorId,
      roomId: rack.roomId,
      rackId: rack._id,
      category: 'rack',
      name: catalogDevice.name,
      type: catalogDevice.type,
      heightU: catalogDevice.rackUnits || 1,
      unit: startUnit,
      side: 'front'
    });
    setArmedCatalogId('');
    setPlacingAtUnit(null);
    invalidateSubDevices();
  };

  const handleDeleteDevice = async (id: string) => {
    if (!tenantId) return;
    await api.delete(`/tenant/${tenantId}/device/${id}`);
    selectDevice(null);
    invalidateSubDevices();
  };

  // Map every U row to the device occupying it (if any), and which row is
  // that device's *first* row (so it renders once, spanning its height).
  const rowOccupant = useMemo(() => {
    const map = new Map<number, { device: any; isStart: boolean }>();
    for (const device of subDevices) {
      const start = device.unit || 1;
      const span = device.heightU || 1;
      for (let u = start; u < start + span; u++) {
        map.set(u, { device, isStart: u === start });
      }
    }
    return map;
  }, [subDevices]);

  const rows = Array.from({ length: heightU }, (_, i) => i + 1);
  const selectedDevice = subDevices.find((d: any) => d._id === selectedDeviceId);

  return (
    <div className="flex-1 flex bg-[#0c0c0e] text-[#f4f4f5] overflow-hidden">
      {!readOnly && (
        <div className="w-56 border-r border-[#27272a] p-3 overflow-y-auto space-y-1 shrink-0">
          <p className="text-xs text-[#a1a1aa] mb-2">
            {armedCatalogId ? 'Click an empty slot to place it' : 'Select a device, then click a slot'}
          </p>
          {customRackDevices.map((d: any) => (
            <button
              key={d._id}
              type="button"
              onClick={() => setArmedCatalogId(armedCatalogId === d._id ? '' : d._id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs ${
                armedCatalogId === d._id ? 'bg-[#27272a] text-[#f4f4f5]' : 'text-[#a1a1aa] hover:bg-[#18181b]'
              }`}
            >
              {d.name} <span className="text-[#71717a]">({d.rackUnits || 1}U)</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        {isLoading ? (
          <p className="text-xs text-[#a1a1aa]">Loading…</p>
        ) : (
          <div className="border border-[#27272a] rounded-md overflow-hidden w-full max-w-md">
            {rows.map((u) => {
              const occupant = rowOccupant.get(u);
              if (occupant && !occupant.isStart) return null; // rendered as part of its start row
              if (occupant) {
                const device = occupant.device;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => selectDevice(device._id)}
                    style={{ height: `${(device.heightU || 1) * 22}px` }}
                    className={`w-full flex items-center gap-2 px-2 text-xs border-b border-[#27272a] hover:bg-[#1c1c1f] ${
                      selectedDeviceId === device._id ? 'bg-[#27272a]' : 'bg-[#141416]'
                    }`}
                  >
                    <span className="text-[#71717a] w-6 shrink-0">U{u}</span>
                    <span className="truncate">{device.name}</span>
                  </button>
                );
              }
              return (
                <button
                  key={u}
                  type="button"
                  disabled={readOnly}
                  onClick={() => (armedCatalogId ? handlePlace(u) : setPlacingAtUnit(u))}
                  className="w-full h-[22px] flex items-center gap-2 px-2 text-[10px] border-b border-[#1c1c1f] text-[#3f3f46] hover:bg-[#141416] hover:text-[#71717a]"
                >
                  <span className="w-6 shrink-0">U{u}</span>
                  {armedCatalogId && placingAtUnit === null && <span>Click to place</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <RackSidePanel
        rack={rack}
        selectedDevice={selectedDevice}
        readOnly={readOnly}
        onRackUpdate={onRackUpdate}
        onDeleteRack={onDeleteRack}
        onDeviceUpdate={onDeviceUpdate}
        onDeleteDevice={handleDeleteDevice}
        onClose={() => selectDevice(null)}
      />
    </div>
  );
}

function RackSidePanel({
  rack,
  selectedDevice,
  readOnly,
  onRackUpdate,
  onDeleteRack,
  onDeviceUpdate,
  onDeleteDevice,
  onClose
}: {
  rack?: any;
  selectedDevice?: any;
  readOnly?: boolean;
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
  onUpdate,
  onDelete,
  onClose
}: {
  device: any;
  readOnly?: boolean;
  onUpdate?: (id: string, data: any) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(device.name || '');
  const [type, setType] = useState(device.type || '');
  const [heightU, setHeightU] = useState(device.heightU ?? 1);
  const [unit, setUnit] = useState(device.unit ?? 1);
  const [side, setSide] = useState(device.side || 'front');

  useEffect(() => {
    setName(device.name || '');
    setType(device.type || '');
    setHeightU(device.heightU ?? 1);
    setUnit(device.unit ?? 1);
    setSide(device.side || 'front');
  }, [device._id]);

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

      {!readOnly && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => onUpdate?.(device._id, { name, type, heightU, unit, side })}>
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
