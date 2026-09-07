import { useEffect, useState } from 'react';
import { Button, Input, Label } from '@/patchdocs-ui';
import { TbTrash, TbX } from 'react-icons/tb';

export interface InfoSidebarProps {
  open?: boolean;
  onToggle?: () => void;
  view?: 'floor' | 'room' | 'device';
  isSaving?: boolean;
  floorData?: any;
  rooms?: any[];
  floorCount?: number;
  roomData?: any;
  deviceData?: any;
  readOnly?: boolean;
  onUpdateFloor?: (data: any) => Promise<boolean>;
  onUpdateRoom?: (data: any) => Promise<boolean>;
  onUpdateDevice?: (data: any) => Promise<boolean>;
  onDeleteFloor?: () => Promise<boolean>;
  onDeleteRoom?: () => Promise<boolean>;
  onDeleteDevice?: () => Promise<boolean>;
  [key: string]: any;
}

/**
 * Edit panel for whatever is currently selected in FloorEditor (a room or a
 * device — "click a rack to edit it" lands here). No visual floor-plan
 * concepts (measuring, connection cabling, building-to-building links) —
 * those props are accepted so the parent page doesn't need special-casing,
 * just not rendered.
 */
export default function InfoSidebar({
  open = true,
  onToggle,
  view = 'floor',
  isSaving,
  floorData,
  rooms = [],
  roomData,
  deviceData,
  readOnly,
  onUpdateFloor,
  onUpdateRoom,
  onUpdateDevice,
  onDeleteFloor,
  onDeleteRoom,
  onDeleteDevice
}: InfoSidebarProps) {
  if (!open) return null;

  if (view === 'device' && deviceData) {
    return (
      <DeviceForm
        key={deviceData._id}
        device={deviceData}
        readOnly={readOnly}
        isSaving={isSaving}
        onUpdate={onUpdateDevice}
        onDelete={onDeleteDevice}
        onClose={onToggle}
      />
    );
  }

  if (view === 'room' && roomData) {
    return (
      <RoomForm
        key={roomData._id}
        room={roomData}
        readOnly={readOnly}
        isSaving={isSaving}
        onUpdate={onUpdateRoom}
        onDelete={onDeleteRoom}
        onClose={onToggle}
      />
    );
  }

  return (
    <FloorForm
      floor={floorData}
      roomCount={rooms.length}
      readOnly={readOnly}
      isSaving={isSaving}
      onUpdate={onUpdateFloor}
      onDelete={onDeleteFloor}
      onClose={onToggle}
    />
  );
}

function FloorForm({
  floor,
  roomCount,
  readOnly,
  isSaving,
  onUpdate,
  onDelete,
  onClose
}: {
  floor?: any;
  roomCount: number;
  readOnly?: boolean;
  isSaving?: boolean;
  onUpdate?: (data: any) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onClose?: () => void;
}) {
  const [name, setName] = useState(floor?.name || '');

  useEffect(() => {
    setName(floor?.name || '');
  }, [floor?._id]);

  return (
    <aside className="w-80 border-l border-[#27272a] bg-[#141416] p-4 text-xs text-[#f4f4f5] overflow-y-auto space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Floor</h3>
        <button type="button" onClick={onClose} className="text-[#a1a1aa] hover:text-[#f4f4f5]">
          <TbX className="size-4" />
        </button>
      </div>

      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e: any) => setName(e.target.value)} disabled={readOnly} />
      </div>
      <p className="text-[#a1a1aa]">{roomCount} room{roomCount === 1 ? '' : 's'}</p>

      {!readOnly && (
        <div className="flex gap-2 pt-2">
          {onUpdate && (
            <Button size="sm" disabled={isSaving} onClick={() => onUpdate({ name })}>
              Save
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <TbTrash className="size-4 mr-1" /> Delete floor
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}

function DeviceForm({
  device,
  readOnly,
  isSaving,
  onUpdate,
  onDelete,
  onClose
}: {
  device: any;
  readOnly?: boolean;
  isSaving?: boolean;
  onUpdate?: (data: any) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onClose?: () => void;
}) {
  const [name, setName] = useState(device.name || '');
  const [label, setLabel] = useState(device.label || '');
  const [type, setType] = useState(device.type || device.deviceType || '');
  const [heightU, setHeightU] = useState(device.heightU ?? device.rackUnitsCount ?? '');

  useEffect(() => {
    setName(device.name || '');
    setLabel(device.label || '');
    setType(device.type || device.deviceType || '');
    setHeightU(device.heightU ?? device.rackUnitsCount ?? '');
  }, [device._id]);

  return (
    <aside className="w-80 border-l border-[#27272a] bg-[#141416] p-4 text-xs text-[#f4f4f5] overflow-y-auto space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Edit device</h3>
        <button type="button" onClick={onClose} className="text-[#a1a1aa] hover:text-[#f4f4f5]">
          <TbX className="size-4" />
        </button>
      </div>

      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e: any) => setName(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Label</Label>
        <Input value={label} onChange={(e: any) => setLabel(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Type</Label>
        <Input value={type} onChange={(e: any) => setType(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Height (U)</Label>
        <Input
          type="number"
          value={heightU}
          onChange={(e: any) => setHeightU(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={readOnly}
        />
      </div>

      {!readOnly && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => onUpdate?.({ name, label, type, heightU: heightU === '' ? undefined : heightU })}
          >
            Save
          </Button>
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <TbTrash className="size-4" />
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}

function RoomForm({
  room,
  readOnly,
  isSaving,
  onUpdate,
  onDelete,
  onClose
}: {
  room: any;
  readOnly?: boolean;
  isSaving?: boolean;
  onUpdate?: (data: any) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onClose?: () => void;
}) {
  const [name, setName] = useState(room.name || '');
  const [reference, setReference] = useState(room.reference || '');

  useEffect(() => {
    setName(room.name || '');
    setReference(room.reference || '');
  }, [room._id]);

  return (
    <aside className="w-80 border-l border-[#27272a] bg-[#141416] p-4 text-xs text-[#f4f4f5] overflow-y-auto space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Edit room</h3>
        <button type="button" onClick={onClose} className="text-[#a1a1aa] hover:text-[#f4f4f5]">
          <TbX className="size-4" />
        </button>
      </div>

      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e: any) => setName(e.target.value)} disabled={readOnly} />
      </div>
      <div>
        <Label>Reference</Label>
        <Input value={reference} onChange={(e: any) => setReference(e.target.value)} disabled={readOnly} />
      </div>

      {!readOnly && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" disabled={isSaving} onClick={() => onUpdate?.({ name, reference })}>
            Save
          </Button>
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <TbTrash className="size-4" />
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
