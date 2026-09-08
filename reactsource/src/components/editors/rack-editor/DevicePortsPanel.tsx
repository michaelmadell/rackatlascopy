import { useState } from 'react';
import DeviceFaceGrid from '../rack-device-editor/DeviceFaceGrid';
import { SUB_ROWS_PER_U } from '../rack-device-editor/port-types';
import type { FaceElement, Side, DeviceConnection } from '@/types';

export interface PendingConnection {
  deviceId: string;
  deviceName: string;
  elementId: string;
  portName: string;
}

/** Read-only render of a placed device's own port face (reuses
 *  rack-device-editor's DeviceFaceGrid — readOnly hides its resize handles,
 *  but a port's click-to-select still fires) plus the click-to-connect
 *  interaction: clicking a port here either starts a pending connection (if
 *  none is active) or, if one is already pending *on a different device*,
 *  finishes it. Ports already carrying a cable are marked so a second cable
 *  isn't accidentally landed on the same jack. */
export default function DevicePortsPanel({
  device,
  deviceConnections,
  pendingConnection,
  onPortClick,
  readOnly
}: {
  device: any;
  deviceConnections: DeviceConnection[];
  pendingConnection: PendingConnection | null;
  onPortClick: (element: FaceElement) => void;
  readOnly?: boolean;
}) {
  const [panelSide, setPanelSide] = useState<Side>('front');
  const elements: FaceElement[] = device.elements || [];
  if (elements.length === 0) return null;

  const subRows = (device.heightU || 1) * SUB_ROWS_PER_U;
  const isPendingHere = pendingConnection?.deviceId === device._id;

  // Looked up by port *name* — the only thing a real DeviceConnection
  // references (see DeviceConnection in @/types), not by element id.
  const connectedPortNames = new Set(
    deviceConnections
      .filter((c) => c.device1Id === device._id || c.device2Id === device._id)
      .map((c) => (c.device1Id === device._id ? c.port1Name : c.port2Name))
  );

  const noop = () => {};

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold text-[#f4f4f5]">Ports</h4>
        <div className="flex items-center gap-1 rounded-md border border-[#27272a] bg-[#18181b] p-0.5">
          {(['front', 'back'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPanelSide(s)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize ${
                panelSide === s ? 'bg-[#27272a] text-[#f4f4f5]' : 'text-[#a1a1aa]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isPendingHere && (
        <p className="rounded-sm border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-400">
          Connecting from {pendingConnection!.portName} — click a port on another device to finish, or click it again to cancel.
        </p>
      )}

      <div className="overflow-x-auto rounded-sm border border-[#3f3f46]">
        <DeviceFaceGrid
          side={panelSide}
          subRows={subRows}
          elements={elements}
          selectedId={isPendingHere ? pendingConnection!.elementId : null}
          onSelect={(id) => {
            if (readOnly) return;
            const el = elements.find((e) => e.id === id);
            if (el) onPortClick(el);
          }}
          onResizeGroup={noop}
          onResizeGroupVertical={noop}
          onResizeElementSpan={noop}
          readOnly
        />
      </div>

      {connectedPortNames.size > 0 && (
        <p className="text-[10px] text-[#52525b]">Connected: {[...connectedPortNames].join(', ')}</p>
      )}
    </div>
  );
}
