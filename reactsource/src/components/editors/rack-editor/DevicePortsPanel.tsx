import { useState } from 'react';
import DeviceFaceGrid from '../rack-device-editor/DeviceFaceGrid';
import { SUB_ROWS_PER_U } from '../rack-device-editor/port-types';
import type { FaceElement, Side, DeviceConnection } from '@/types';

/** Read-only render of a placed device's own port face (reuses
 *  rack-device-editor's DeviceFaceGrid — readOnly hides its resize handles,
 *  but a port's click-to-select still fires): clicking a port opens the
 *  ConnectPortDialog for it (see Editor.tsx) — the real editor's own
 *  connections flow is a dialog, not a click-elsewhere-on-canvas
 *  interaction, so there's no "pending" state to track here anymore.
 *  Ports already carrying a cable are marked so it's clear at a glance
 *  which jacks are already in use. */
export default function DevicePortsPanel({
  device,
  deviceConnections,
  onPortClick,
  readOnly
}: {
  device: any;
  deviceConnections: DeviceConnection[];
  onPortClick: (element: FaceElement) => void;
  readOnly?: boolean;
}) {
  const [panelSide, setPanelSide] = useState<Side>('front');
  const elements: FaceElement[] = device.elements || [];
  if (elements.length === 0) return null;

  const subRows = (device.heightU || 1) * SUB_ROWS_PER_U;

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

      <div className="overflow-x-auto rounded-sm border border-[#3f3f46]">
        <DeviceFaceGrid
          side={panelSide}
          subRows={subRows}
          elements={elements}
          selectedId={null}
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
