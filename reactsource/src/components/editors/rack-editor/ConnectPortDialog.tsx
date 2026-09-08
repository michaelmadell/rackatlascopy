import { useEffect, useState } from 'react';
import { Dialog, DialogContent, Input, Button } from '@/patchdocs-ui';
import { TbSearch, TbArrowLeft } from 'react-icons/tb';
import DeviceFaceGrid from '../rack-device-editor/DeviceFaceGrid';
import { SUB_ROWS_PER_U } from '../rack-device-editor/port-types';
import type { FaceElement, Side } from '@/types';

/**
 * "Connect Port" — cloned from the real editor's own connection flow
 * (verified against a real screen recording): clicking a port does NOT
 * start a click-elsewhere-to-finish interaction on the canvas. It opens
 * this dialog instead, titled "Connect Port: <Device>/<Port>", with a
 * searchable list of the *other* devices in the rack. Picking one drills
 * into that device's own port face (the same DeviceFaceGrid every other
 * port picker in this app already uses) to choose the exact target port.
 *
 * The real dialog shows an existing-cable reference (e.g. "CAB01") next to
 * a device that already has one — we have no such short-code id, so each
 * row shows a connected-port count instead, a reasonable substitute
 * rather than fabricating a fake code format.
 */
export default function ConnectPortDialog({
  open,
  sourceDeviceName,
  sourcePortName,
  targetDevices,
  connectedCountByDeviceId,
  viewSide,
  onConnect,
  onClose
}: {
  open: boolean;
  sourceDeviceName: string;
  sourcePortName: string;
  /** Every other device in the rack — the source device is excluded by the caller. */
  targetDevices: any[];
  connectedCountByDeviceId: Map<string, number>;
  /** Which of *each device's own* port sides to show when picking a target
   *  port — the rack elevation's current Front/Back toggle. */
  viewSide: Side;
  onConnect: (targetDevice: any, targetElement: FaceElement) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [pickedDeviceId, setPickedDeviceId] = useState<string | null>(null);

  // A fresh dialog (new source port) always starts back at the device list.
  useEffect(() => {
    if (open) {
      setSearch('');
      setPickedDeviceId(null);
    }
  }, [open, sourceDeviceName, sourcePortName]);

  const pickedDevice = targetDevices.find((d) => d._id === pickedDeviceId) || null;
  const filtered = targetDevices.filter((d) => (d.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="max-w-md sm:max-w-md">
        <h2 className="mb-3 pr-8 text-sm font-bold text-[#f4f4f5]">
          Connect Port: {sourceDeviceName}/{sourcePortName}
        </h2>

        {!pickedDevice ? (
          <>
            <div className="relative mb-3">
              <TbSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#71717a]" />
              <Input
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
                placeholder="Search devices…"
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filtered.length === 0 && <p className="py-6 text-center text-xs text-[#71717a]">No devices found.</p>}
              {filtered.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  onClick={() => setPickedDeviceId(d._id)}
                  disabled={!(d.elements || []).some((e: FaceElement) => e.kind === 'port')}
                  className="flex w-full items-center gap-2 rounded-sm border border-[#27272a] bg-[#18181b] px-2.5 py-2 text-left text-xs hover:border-[#3f3f46] hover:bg-[#202024] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="shrink-0 rounded bg-[#0c0c0e] px-1.5 py-0.5 text-[10px] text-[#71717a]">{d.unit || 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[#f4f4f5]">{d.name}</span>
                  {connectedCountByDeviceId.get(d._id) ? (
                    <span className="shrink-0 text-[10px] text-blue-400">{connectedCountByDeviceId.get(d._id)} connected</span>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setPickedDeviceId(null)}
              className="mb-2 flex items-center gap-1 text-[10px] text-[#a1a1aa] hover:text-[#f4f4f5]"
            >
              <TbArrowLeft className="size-3" /> Back to devices
            </button>
            <p className="mb-2 text-[11px] text-[#a1a1aa]">Pick a port on {pickedDevice.name}:</p>
            <div className="overflow-x-auto rounded-sm border border-[#3f3f46]">
              <DeviceFaceGrid
                side={viewSide}
                subRows={(pickedDevice.heightU || 1) * SUB_ROWS_PER_U}
                elements={pickedDevice.elements || []}
                selectedId={null}
                onSelect={(id) => {
                  const el = (pickedDevice.elements || []).find((e: FaceElement) => e.id === id);
                  if (el) onConnect(pickedDevice, el);
                }}
                onResizeGroup={() => {}}
                onResizeGroupVertical={() => {}}
                onResizeElementSpan={() => {}}
                readOnly
              />
            </div>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
