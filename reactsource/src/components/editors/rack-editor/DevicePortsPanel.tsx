import { useEffect, useState } from 'react';
import { Input, Label, Button } from '@/patchdocs-ui';
import DeviceFaceGrid from '../rack-device-editor/DeviceFaceGrid';
import { computePortNumber } from '../rack-device-editor/layout-utils';
import { SUB_ROWS_PER_U } from '../rack-device-editor/port-types';
import type { FaceElement, Side, DeviceConnection } from '@/types';

/** Read-only render of a placed device's own port face (reuses
 *  rack-device-editor's DeviceFaceGrid — readOnly hides its resize handles,
 *  but a port's click-to-select still fires). Clicking a port *selects*
 *  it — a real recording showed this opens a settings panel (Port name /
 *  Speed (Mbps) / VLAN), not the Connect Port dialog directly; that only
 *  opens from an explicit "Connect" button inside that panel. Ports
 *  already carrying a cable are marked so it's clear at a glance which
 *  jacks are already in use. */
export default function DevicePortsPanel({
  device,
  deviceConnections,
  onUpdatePort,
  onConnectClick,
  readOnly
}: {
  device: any;
  deviceConnections: DeviceConnection[];
  onUpdatePort: (elementId: string, patch: Partial<FaceElement>) => void;
  onConnectClick: (element: FaceElement) => void;
  readOnly?: boolean;
}) {
  const [panelSide, setPanelSide] = useState<Side>('front');
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);

  const elements: FaceElement[] = device.elements || [];

  // A device's own edit clears the current selection rather than pointing
  // at a stale/foreign element.
  useEffect(() => {
    setSelectedPortId(null);
  }, [device._id]);

  if (elements.length === 0) return null;

  const subRows = (device.heightU || 1) * SUB_ROWS_PER_U;
  const selectedPort = elements.find((e) => e.id === selectedPortId) || null;

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
          selectedId={selectedPortId}
          onSelect={(id) => !readOnly && setSelectedPortId(id)}
          onResizeGroup={noop}
          onResizeGroupVertical={noop}
          onResizeElementSpan={noop}
          readOnly
        />
      </div>

      {selectedPort && (
        <div className="space-y-2 rounded-sm border border-[#27272a] bg-[#18181b] p-2.5">
          <p className="text-[10px] font-semibold text-[#f4f4f5]">
            Port {computePortNumber(selectedPort, elements)}
            {connectedPortNames.has(computePortNumber(selectedPort, elements)) && (
              <span className="ml-1.5 text-blue-400">· Connected</span>
            )}
          </p>
          {selectedPort.kind === 'port' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Port name</Label>
                <Input
                  value={selectedPort.value || ''}
                  onChange={(e: any) => onUpdatePort(selectedPort.id, { value: e.target.value })}
                  placeholder={computePortNumber(selectedPort, elements)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label className="text-[10px]">Speed (Mbps)</Label>
                <Input
                  value={selectedPort.speed || ''}
                  onChange={(e: any) => onUpdatePort(selectedPort.id, { speed: e.target.value })}
                  placeholder="e.g. 1000"
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">VLAN</Label>
                <Input
                  value={selectedPort.vlan || ''}
                  onChange={(e: any) => onUpdatePort(selectedPort.id, { vlan: e.target.value })}
                  placeholder="Unassigned"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}
          {!readOnly && selectedPort.kind === 'port' && (
            <Button size="sm" className="w-full" onClick={() => onConnectClick(selectedPort)}>
              Connect
            </Button>
          )}
        </div>
      )}

      {connectedPortNames.size > 0 && (
        <p className="text-[10px] text-[#52525b]">Connected: {[...connectedPortNames].join(', ')}</p>
      )}
    </div>
  );
}
