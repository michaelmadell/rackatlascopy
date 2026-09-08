import { CopperIcon, FiberIcon, SfpIcon, UsbAIcon, UsbCIcon, HdmiIcon, DpIcon, VgaIcon, Ps2Icon, AudioIcon } from './port-icons';
import type { IconType } from 'react-icons';
import type { CountingDirection, Side, FaceElement } from '@/types';

// FaceElement/Side/CountingDirection now live in @/types — it's the shape
// shared between CustomRackDevice.ports (this editor's template) and
// Device.elements (a placed instance's own snapshot copy). Re-exported here
// so every existing `from './port-types'` import in this editor keeps working.
export type { CountingDirection, Side, FaceElement };

export interface PortTypeDef {
  id: string;
  label: string;
  icon: IconType;
  /** Connector variants offered in Port Group Settings, first is the default. */
  connectors: string[];
}

/** The toolbar's "Port Types" palette — cloned from app.patchdocs.io's Rack
 *  Device Editor. Icons are the real editor's own bespoke per-type SVGs
 *  (see port-icons.tsx), copied verbatim from a real pasted DOM dump.
 *  Connector-variant lists are a best-effort match (the real set per type
 *  wasn't fully exhaustible), not a verified 1:1 copy. */
export const PORT_TYPES: PortTypeDef[] = [
  { id: 'copper', label: 'Copper', icon: CopperIcon, connectors: ['RJ45', 'RJ11'] },
  { id: 'fiber', label: 'Fiber', icon: FiberIcon, connectors: ['LC', 'SC'] },
  { id: 'sfp', label: 'SFP', icon: SfpIcon, connectors: ['SFP', 'SFP+'] },
  { id: 'usb-a', label: 'USB-A', icon: UsbAIcon, connectors: ['USB-A'] },
  { id: 'usb-c', label: 'USB-C', icon: UsbCIcon, connectors: ['USB-C'] },
  { id: 'hdmi', label: 'HDMI', icon: HdmiIcon, connectors: ['HDMI'] },
  { id: 'dp', label: 'DP', icon: DpIcon, connectors: ['DisplayPort'] },
  { id: 'vga', label: 'VGA', icon: VgaIcon, connectors: ['VGA'] },
  { id: 'ps2', label: 'PS/2', icon: Ps2Icon, connectors: ['PS/2'] },
  { id: 'audio', label: 'Audio', icon: AudioIcon, connectors: ['3.5mm', '6.35mm'] }
];

export function getPortTypeDef(id: string): PortTypeDef | undefined {
  return PORT_TYPES.find((p) => p.id === id);
}

export const COUNTING_DIRECTIONS: { id: CountingDirection; label: string }[] = [
  { id: 'ltr', label: 'Left to right' },
  { id: 'rtl', label: 'Right to left' }
];

/** Droppable port columns — cloned from the real editor's own grid-template
 *  (`grid-template-columns: 1fr repeat(28, 1fr) 1fr`): 28 port columns
 *  between a 1-column ear on the left and a 1-column side label on the
 *  right, so the CSS grid is 30 columns wide overall. `col` on a
 *  FaceElement is 0-indexed into just these 28 (grid column = col + 2). */
export const PORT_COLUMNS = 28;
/** Sub-rows per rack unit — see the FaceElement.row doc comment. */
export const SUB_ROWS_PER_U = 2;
