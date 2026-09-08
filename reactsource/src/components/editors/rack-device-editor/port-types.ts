import { CopperIcon, FiberIcon, SfpIcon, UsbAIcon, UsbCIcon, HdmiIcon, DpIcon, VgaIcon, Ps2Icon, AudioIcon } from './port-icons';
import type { IconType } from 'react-icons';

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
  /** Sub-row this specific port sits in (0-indexed). Ports pasted from the
   *  real editor showed this is a real 2D grid, not a single "row-less"
   *  port that just stretches taller: growing a port vertically doesn't
   *  make one wider box, it adds a whole *second numbered port* stacked
   *  in the row below (data-port-row="1" alongside data-port-row="0",
   *  each its own <span>01</span>/<span>02</span>) — the exact same thing
   *  horizontal growth already does with columns. A group is therefore a
   *  dense minCol..maxCol × minRow..maxRow rectangle of individual ports,
   *  one FaceElement per occupied cell — never a single element spanning
   *  multiple cells by itself. */
  row: number;
  /** Ports sharing a groupId share idPrefix/connectorType/countingDirection and renumber together. */
  groupId?: string;
  portType?: string;
  connectorType?: string;
  idPrefix?: string;
  countingDirection?: CountingDirection;
  /** Per-port name override (ports) or the label text / icon id (text/icon elements). */
  value?: string;
  /** Text/icon elements only. Unlike a port group (many FaceElements, one
   *  per cell, dense rectangle), a single text/icon element IS the whole
   *  block — resizing it grows its own span, it never spawns siblings.
   *  Ports ignore these (their span always comes from the group
   *  rectangle). Defaults to 1 when absent. */
  colSpan?: number;
  rowSpan?: number;
}

/** Droppable port columns — cloned from the real editor's own grid-template
 *  (`grid-template-columns: 1fr repeat(28, 1fr) 1fr`): 28 port columns
 *  between a 1-column ear on the left and a 1-column side label on the
 *  right, so the CSS grid is 30 columns wide overall. `col` on a
 *  FaceElement is 0-indexed into just these 28 (grid column = col + 2). */
export const PORT_COLUMNS = 28;
/** Sub-rows per rack unit — see the FaceElement.row doc comment. */
export const SUB_ROWS_PER_U = 2;
