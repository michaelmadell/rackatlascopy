import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/patchdocs-ui';
import { TbPlus, TbServer } from 'react-icons/tb';

/**
 * List-based floor view: rooms as sections, devices/racks as clickable rows
 * within them. There is no visual floor-plan canvas here (drag/drop,
 * coordinates, shapes) — that's a much larger, separate piece of work. This
 * gives every room/device a click target (`onRoomSelect`/`onDeviceSelect`,
 * which the parent page already wires to InfoSidebar) and a way to create
 * new ones (`onCreateRoom`/`onCreateDevice`).
 */
export default function FloorEditor({
  floor,
  floors,
  currentFloorId,
  location,
  rooms = [],
  devices = [],
  selectedRoomId,
  selectedDeviceId,
  isFloorEmpty,
  readOnly,
  onRoomSelect,
  onCreateRoom,
  onDeviceSelect,
  onCreateDevice,
}: {
  floor?: any;
  // The caller (t.$tenantId.locations.$locationId.index.tsx) never passes a
  // single resolved `floor` — it passes the whole `floors` array plus
  // `currentFloorId`, same as it hands FloorSelector. Accept both shapes:
  // an explicit `floor` wins if a future caller ever passes one directly,
  // otherwise resolve it from `floors`/`currentFloorId` below.
  floors?: any[];
  currentFloorId?: string;
  location?: any;
  rooms?: any[];
  devices?: any[];
  selectedRoomId?: string | null;
  selectedDeviceId?: string | null;
  isFloorEmpty?: boolean;
  readOnly?: boolean;
  onRoomSelect?: (roomId: string | null) => void;
  onCreateRoom?: (data: { reference: string; name?: string; floorPlanShapePoints: { x: number; y: number }[]; floorPlanShapeType: 'polygon' | 'rectangle' }) => Promise<boolean>;
  onDeviceSelect?: (deviceId: string | null) => void;
  onCreateDevice?: (data: { floorId: string; roomId: string; reference: string; name?: string; category: 'floor'; deviceType: string }) => Promise<boolean>;
  [key: string]: any;
}) {
  const currentFloor = floor ?? floors?.find((f: any) => f._id === currentFloorId);
  const [newRoomName, setNewRoomName] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('rack');
  const [addingDeviceForRoom, setAddingDeviceForRoom] = useState<string | null>(null);

  const devicesByRoom = (roomId: string) => devices.filter((d: any) => d.roomId === roomId);

  const handleAddRoom = async () => {
    if (!newRoomName.trim() || !onCreateRoom) return;
    const ok = await onCreateRoom({
      name: newRoomName.trim(),
      reference: newRoomName.trim().toUpperCase().replace(/\s+/g, '-'),
      // Placeholder shape — this view has no canvas to draw a real one on.
      floorPlanShapePoints: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ],
      floorPlanShapeType: 'rectangle'
    });
    if (ok) {
      setNewRoomName('');
      setAddingRoom(false);
    }
  };

  const handleAddDevice = async (roomId: string) => {
    if (!newDeviceName.trim() || !onCreateDevice || !currentFloor?._id) return;
    const ok = await onCreateDevice({
      floorId: currentFloor._id,
      roomId,
      reference: newDeviceName.trim().toUpperCase().replace(/\s+/g, '-'),
      name: newDeviceName.trim(),
      category: 'floor',
      deviceType: newDeviceType
    });
    if (ok) {
      setNewDeviceName('');
      setAddingDeviceForRoom(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0c0c0e] text-[#f4f4f5] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">{currentFloor?.name || 'Floor'}</h2>
          <p className="text-xs text-[#a1a1aa]">{location?.name}</p>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setAddingRoom((v) => !v)}>
            <TbPlus className="size-4 mr-1" /> Room
          </Button>
        )}
      </div>

      {addingRoom && (
        <Card>
          <CardContent className="pt-4 flex items-end gap-2">
            <div className="flex-1">
              <Label>Room name</Label>
              <Input value={newRoomName} onChange={(e: any) => setNewRoomName(e.target.value)} placeholder="e.g. Server Room" />
            </div>
            <Button size="sm" onClick={handleAddRoom}>
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      {isFloorEmpty && !addingRoom && (
        <p className="text-xs text-[#a1a1aa]">No rooms on this floor yet. Add one to start placing devices.</p>
      )}

      {rooms.map((room: any) => (
        <Card
          key={room._id}
          className={selectedRoomId === room._id ? 'border-[#f4f4f5]' : undefined}
        >
          <CardHeader
            className="cursor-pointer"
            onClick={() => onRoomSelect?.(selectedRoomId === room._id ? null : room._id)}
          >
            <CardTitle className="text-sm">{room.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {devicesByRoom(room._id).map((device: any) => (
              <button
                key={device._id}
                type="button"
                onClick={() => onDeviceSelect?.(device._id)}
                className={`w-full flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs hover:bg-[#1c1c1f] ${
                  selectedDeviceId === device._id ? 'border-[#f4f4f5]' : 'border-[#27272a]'
                }`}
              >
                <TbServer className="size-4 shrink-0" />
                <span className="flex-1 truncate">{device.name || device.reference}</span>
                <span className="text-[#a1a1aa]">{device.type || device.deviceType}</span>
              </button>
            ))}

            {!readOnly &&
              (addingDeviceForRoom === room._id ? (
                <div className="flex items-end gap-2 pt-1">
                  <div className="flex-1">
                    <Label>Device name</Label>
                    <Input value={newDeviceName} onChange={(e: any) => setNewDeviceName(e.target.value)} placeholder="e.g. Rack 1" />
                  </div>
                  <div className="w-32">
                    <Label>Type</Label>
                    <Select value={newDeviceType} onValueChange={setNewDeviceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rack">Rack</SelectItem>
                        <SelectItem value="switch">Switch</SelectItem>
                        <SelectItem value="patch-panel">Patch panel</SelectItem>
                        <SelectItem value="device">Device</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => handleAddDevice(room._id)}>
                    Add
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setAddingDeviceForRoom(room._id)}>
                  <TbPlus className="size-4 mr-1" /> Device
                </Button>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
