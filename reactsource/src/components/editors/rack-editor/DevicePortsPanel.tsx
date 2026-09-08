import { useEffect, useState } from 'react';
import { Input, Label, Button } from '@/patchdocs-ui';
import DeviceFaceGrid from '../rack-device-editor/DeviceFaceGrid';
import { computePortNumber } from '../rack-device-editor/layout-utils';
import { SUB_ROWS_PER_U, getPortTypeDef } from '../rack-device-editor/port-types';
import { TbChevronDown, TbChevronUp, TbPlugConnected } from 'react-icons/tb';
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
  const [wiredPortsOpen, setWiredPortsOpen] = useState(true);

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

      <WiredPortsList
        elements={elements}
        selectedPortId={selectedPortId}
        connectedPortNames={connectedPortNames}
        open={wiredPortsOpen}
        onToggleOpen={() => setWiredPortsOpen((o) => !o)}
        onSelect={(el) => {
          setSelectedPortId(el.id);
          setPanelSide(el.side);
        }}
        onConnectClick={onConnectClick}
        readOnly={readOnly}
      />
    </div>
  );
}

/** A screenshot sequence (105428/105449) showed a distinct "Wired ports"
 *  list below a placed device's face grid — every real port grouped under
 *  Front/Back headers, named (MGMT01, PTHR01-12, LAG01-04, ...) with its
 *  connector type, plus a small per-row icon. The icon's exact action
 *  wasn't legible in those frames; a direct Connect shortcut is the
 *  reading that fits the rest of this panel (select-then-Connect already
 *  exists below the grid — a row's own icon std doing the same in one
 *  click is a natural shortcut, not a new mechanic). Clicking the row
 *  itself selects that port, same as clicking its tick on the grid above —
 *  flips the Front/Back grid toggle too so the highlighted tick is never
 *  on a hidden side. */
function WiredPortsList({
  elements,
  selectedPortId,
  connectedPortNames,
  open,
  onToggleOpen,
  onSelect,
  onConnectClick,
  readOnly
}: {
  elements: FaceElement[];
  selectedPortId: string | null;
  connectedPortNames: Set<string>;
  open: boolean;
  onToggleOpen: () => void;
  onSelect: (element: FaceElement) => void;
  onConnectClick: (element: FaceElement) => void;
  readOnly?: boolean;
}) {
  const ports = elements.filter((e) => e.kind === 'port');
  if (ports.length === 0) return null;

  const groups: Array<{ side: Side; label: string; items: FaceElement[] }> = [
    { side: 'front', label: 'Front', items: ports.filter((e) => e.side === 'front') },
    { side: 'back', label: 'Back', items: ports.filter((e) => e.side === 'back') }
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-1.5 border-t border-[#27272a] pt-2">
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between text-[11px] font-semibold text-[#f4f4f5]"
      >
        Wired ports
        {open ? <TbChevronUp className="size-3.5 text-[#71717a]" /> : <TbChevronDown className="size-3.5 text-[#71717a]" />}
      </button>

      {open && (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.side} className="space-y-0.5">
              <p className="px-1 text-[9px] font-semibold uppercase tracking-wide text-[#52525b]">{group.label}</p>
              {group.items.map((el) => {
                const portName = computePortNumber(el, elements);
                const typeLabel = el.connectorType || getPortTypeDef(el.portType || '')?.label || '';
                const connected = connectedPortNames.has(portName);
                return (
                  <div
                    key={el.id}
                    className={`flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[10px] ${
                      selectedPortId === el.id ? 'bg-blue-500/10 text-[#f4f4f5]' : 'text-[#d4d4d8] hover:bg-[#18181b]'
                    }`}
                  >
                    <button type="button" onClick={() => onSelect(el)} className="flex flex-1 items-center gap-1.5 text-left">
                      <span className="font-medium">{portName}</span>
                      {typeLabel && <span className="text-[#71717a]">{typeLabel}</span>}
                      {connected && <span className="ml-auto size-1.5 rounded-full bg-blue-400" />}
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onConnectClick(el)}
                        className="shrink-0 text-[#52525b] hover:text-blue-400"
                        title={`Connect ${portName}`}
                      >
                        <TbPlugConnected className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
