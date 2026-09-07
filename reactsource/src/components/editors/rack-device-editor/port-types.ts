import {
  TbPlugConnected,
  TbWaveSine,
  TbDisc,
  TbUsb,
  TbDeviceUsb,
  TbDeviceTv,
  TbVideo,
  TbDeviceDesktop,
  TbMouse,
  TbHeadphones
} from 'react-icons/tb';
import type { IconType } from 'react-icons';

export interface PortTypeDef {
  id: string;
  label: string;
  icon: IconType;
  /** Connector variants offered in Port Group Settings, first is the default. */
  connectors: string[];
}

/** The toolbar's "Port Types" palette — cloned from app.patchdocs.io's Rack
 *  Device Editor. Connector-variant lists are a best-effort match (the real
 *  set per type wasn't fully exhaustible), not a verified 1:1 copy. */
export const PORT_TYPES: PortTypeDef[] = [
  { id: 'copper', label: 'Copper', icon: TbPlugConnected, connectors: ['RJ45', 'RJ11'] },
  { id: 'fiber', label: 'Fiber', icon: TbWaveSine, connectors: ['LC', 'SC'] },
  { id: 'sfp', label: 'SFP', icon: TbDisc, connectors: ['SFP', 'SFP+'] },
  { id: 'usb-a', label: 'USB-A', icon: TbUsb, connectors: ['USB-A'] },
  { id: 'usb-c', label: 'USB-C', icon: TbDeviceUsb, connectors: ['USB-C'] },
  { id: 'hdmi', label: 'HDMI', icon: TbDeviceTv, connectors: ['HDMI'] },
  { id: 'dp', label: 'DP', icon: TbVideo, connectors: ['DisplayPort'] },
  { id: 'vga', label: 'VGA', icon: TbDeviceDesktop, connectors: ['VGA'] },
  { id: 'ps2', label: 'PS/2', icon: TbMouse, connectors: ['PS/2'] },
  { id: 'audio', label: 'Audio', icon: TbHeadphones, connectors: ['3.5mm', '6.35mm'] }
];

export function getPortTypeDef(id: string): PortTypeDef | undefined {
  return PORT_TYPES.find((p) => p.id === id);
}

export const COUNTING_DIRECTIONS = [
  { id: 'ltr', label: 'Left to right' },
  { id: 'rtl', label: 'Right to left' }
] as const;

export type CountingDirection = (typeof COUNTING_DIRECTIONS)[number]['id'];

export type Side = 'front' | 'back';

/** One cell on the device face — a real port (`kind: 'port'`) or a free
 *  label/icon annotation (`kind: 'text' | 'icon'`). Stored client-side while
 *  editing, then flattened into `CustomRackDevice.ports` on Create/Save —
 *  the existing `ports_json` column takes the richer shape as-is (opaque
 *  JSON), so no backend change was needed for text/icon elements. */
export interface FaceElement {
  id: string;
  kind: 'port' | 'text' | 'icon';
  side: Side;
  /** Which U row on the face this sits in — 0-indexed from the top of the
   *  device (a 1U device has only row 0; a 2U device has rows 0 and 1). */
  row: number;
  col: number;
  /** Ports sharing a groupId share idPrefix/connectorType/countingDirection and renumber together. */
  groupId?: string;
  portType?: string;
  connectorType?: string;
  idPrefix?: string;
  countingDirection?: CountingDirection;
  /** Per-port name override (ports) or the label text / icon id (text/icon elements). */
  value?: string;
}

export const GRID_COLUMNS = 24;
