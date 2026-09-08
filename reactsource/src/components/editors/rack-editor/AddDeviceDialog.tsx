import { useEffect, useState } from 'react';
import { Dialog, DialogContent, Button, Input } from '@/patchdocs-ui';
import { TbSearch } from 'react-icons/tb';
import { getDeviceVisual } from './device-icon';
import { getBuiltinDevicesForCategory, type BuiltinDevice } from './builtin-catalog';

/** A device pickable from this dialog — either a real CustomRackDevice
 *  (`.ports`, `._id` a real database id) or a BuiltinDevice (`.ports`
 *  generated, `._id` a `builtin-...` literal — Editor.tsx's insert
 *  handler only sets `customRackDeviceId` when it's a real one, so a
 *  builtin never claims a link back to a Device Library entry that
 *  doesn't exist). */
type PickableDevice = (BuiltinDevice | any) & { _id: string; name: string; rackUnits?: number; brand?: string };

/**
 * "Add device" — cloned from a real screen recording: opened already
 * scoped to one category (dragging a category chip off DevicePalette
 * picks it), a search box, a list mixing that category's built-in
 * catalog entries with the customer's own matching CustomRackDevices,
 * and a preview + "Insert device" panel once one is selected. A
 * "+ Create Custom Device" shortcut at the bottom jumps straight to the
 * Device Library's own editor, pre-seeded with this category, without
 * leaving the rack.
 */
export default function AddDeviceDialog({
  open,
  category,
  categoryLabel,
  customRackDevices,
  onInsert,
  onCreateCustom,
  onClose,
  inserting
}: {
  open: boolean;
  category: string | null;
  categoryLabel: string;
  customRackDevices: any[];
  onInsert: (device: PickableDevice) => void;
  onCreateCustom: () => void;
  onClose: () => void;
  inserting?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedId(null);
    }
  }, [open, category]);

  if (!category) return null;

  const matchingCustom = customRackDevices.filter((d) => d.deviceType === category || d.type === category);
  const devices: PickableDevice[] = [...getBuiltinDevicesForCategory(category), ...matchingCustom];
  const filtered = devices.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const selected = devices.find((d) => d._id === selectedId) || null;

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <h2 className="mb-1 pr-8 text-base font-bold text-[#f4f4f5]">Add device</h2>
        <p className="mb-3 text-xs text-[#71717a]">{categoryLabel}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="relative mb-2">
              <TbSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#71717a]" />
              <Input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search…" className="pl-8" autoFocus />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.length === 0 && <p className="py-4 text-center text-xs text-[#71717a]">No devices found.</p>}
              {filtered.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  onClick={() => setSelectedId(d._id)}
                  className={`flex w-full items-center gap-2 rounded-sm border px-2.5 py-2 text-left text-xs transition-colors ${
                    selectedId === d._id
                      ? 'border-blue-400 bg-blue-500/10 text-[#f4f4f5]'
                      : 'border-[#27272a] bg-[#18181b] text-[#d4d4d8] hover:border-[#3f3f46] hover:bg-[#202024]'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <span className="shrink-0 rounded bg-[#0c0c0e]/60 px-1 text-[9px] text-[#71717a]">{d.rackUnits || 1}U</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={onCreateCustom} className="mt-2 text-[11px] text-blue-400 hover:text-blue-300">
              + Create Custom Device
            </button>
          </div>

          <div>
            {!selected ? (
              <div className="flex h-full min-h-48 items-center justify-center rounded-md border border-dashed border-[#27272a] px-3 text-center text-xs text-[#71717a]">
                Select a device to see its details.
              </div>
            ) : (
              <DevicePreview device={selected} onInsert={() => onInsert(selected)} inserting={inserting} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DevicePreview({ device, onInsert, inserting }: { device: PickableDevice; onInsert: () => void; inserting?: boolean }) {
  const { Icon, color } = getDeviceVisual(device.type);
  const heightU = device.rackUnits || 1;

  return (
    <div>
      <div className="mb-4 space-y-2">
        <PreviewStrip label="FRONT" name={device.name} Icon={Icon} color={color} />
        <PreviewStrip label="BACK" name={device.name} Icon={Icon} color={color} />
      </div>

      <div className="mb-4 flex items-center justify-between rounded-md border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs">
        <span className="text-[#a1a1aa]">
          Rack units: <span className="font-medium text-[#f4f4f5]">{heightU} RU</span>
          <span className="mx-2 text-[#3f3f46]">•</span>
          Brand: <span className="font-medium text-[#f4f4f5]">{device.brand || '-'}</span>
        </span>
        <span className="shrink-0 rounded bg-[#27272a] px-2 py-0.5 text-[10px] text-[#a1a1aa]">
          {typeof device._id === 'string' && device._id.startsWith('builtin-') ? 'Standard' : 'Custom'}
        </span>
      </div>

      <Button className="w-full" onClick={onInsert} disabled={inserting}>
        {inserting ? 'Inserting…' : 'Insert device'}
      </Button>
    </div>
  );
}

function PreviewStrip({ label, name, Icon, color }: { label: string; name: string; Icon: any; color: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-[#71717a]">{label}</p>
      <div className="flex h-8 items-center gap-2 rounded-sm border border-[#3f3f46] bg-gradient-to-b from-[#202024] to-[#18181b] px-3">
        <Icon className="size-3.5 shrink-0" style={{ color }} />
        <span className="truncate text-[11px] text-[#d4d4d8]">{name}</span>
      </div>
    </div>
  );
}
