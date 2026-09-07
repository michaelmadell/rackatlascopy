import { Dialog, DialogContent, Button } from '@/patchdocs-ui';
import { TbX } from 'react-icons/tb';
import { getDeviceVisual } from './device-icon';

/**
 * Confirmation step for placing a catalog device onto the rack — cloned
 * from app.patchdocs.io's "Add device" dialog: a front/back face preview,
 * a rack-units/brand summary row, and a single "Insert device" action.
 * Dropping a catalog item onto a slot opens this instead of creating the
 * device immediately (Editor.tsx holds the pending placement until the
 * user confirms or cancels here); repositioning an already-placed device
 * stays instant — the real app only gates *new* devices behind this step.
 */
export default function AddDeviceModal({
  open,
  device,
  onClose,
  onInsert,
  inserting
}: {
  open: boolean;
  device: any | null;
  onClose: () => void;
  onInsert: () => void;
  inserting?: boolean;
}) {
  if (!device) return null;
  const { Icon, color } = getDeviceVisual(device.type);
  const heightU = device.rackUnits || 1;

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#f4f4f5]">Add device</h2>
          <button type="button" onClick={onClose} className="text-[#a1a1aa] hover:text-[#f4f4f5]">
            <TbX className="size-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-[#71717a]">{device.type || 'Device'}</p>

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
          <span className="shrink-0 rounded bg-[#27272a] px-2 py-0.5 text-[10px] text-[#a1a1aa]">Standard</span>
        </div>

        <Button className="w-full" onClick={onInsert} disabled={inserting}>
          {inserting ? 'Inserting…' : 'Insert device'}
        </Button>
      </DialogContent>
    </Dialog>
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
