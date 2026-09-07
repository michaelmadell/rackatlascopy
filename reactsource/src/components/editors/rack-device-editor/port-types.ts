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
  col: number;
  /** Visual height in px. Verified against the real editor's own markup
   *  for a placed port: its grid placement is *always* `grid-row: 1 / -1`
   *  (the full row-track span of the device's height, however many
   *  sub-rows that is) with `align-self: center` — a port never actually
   *  "lives" in one specific row. What makes it look like it only fills
   *  the sub-row it landed on is this explicit height (one sub-row by
   *  default) centered within that full span; dragging the bottom handle
   *  grows this height, up to the full available span, rather than moving
   *  the element to cover more grid rows. One column can only ever hold
   *  one port (its grid placement always claims the whole column's row
   *  range), so horizontal grouping only needs to check column adjacency. */
  heightPx?: number;
  /** Ports sharing a groupId share idPrefix/connectorType/countingDirection and renumber together. */
  groupId?: string;
  portType?: string;
  connectorType?: string;
  idPrefix?: string;
  countingDirection?: CountingDirection;
  /** Per-port name override (ports) or the label text / icon id (text/icon elements). */
  value?: string;
}

/** Droppable port columns — cloned from the real editor's own grid-template
 *  (`grid-template-columns: 1fr repeat(28, 1fr) 1fr`): 28 port columns
 *  between a 1-column ear on the left and a 1-column side label on the
 *  right, so the CSS grid is 30 columns wide overall. `col` on a
 *  FaceElement is 0-indexed into just these 28 (grid column = col + 2). */
export const PORT_COLUMNS = 28;
/** Sub-rows per rack unit — see the FaceElement.row doc comment. */
export const SUB_ROWS_PER_U = 2;
