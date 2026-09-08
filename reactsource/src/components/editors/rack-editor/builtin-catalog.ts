import type { FaceElement } from '@/types';

/**
 * Built-in, non-custom catalog entries shown alongside a customer's own
 * CustomRackDevices inside a category's Add-device list — cloned from a
 * real screen recording, which showed these under "Miscellaneous",
 * "Switch", and "Server" (`Placeholder - 8RU`/`2RU`, `Switch - 24/48
 * Ports · RJ45`, `Server - 9RU`/`2RU`). Only those three categories were
 * actually observed with entries; every other category (Cable Manager,
 * Firewall, Patch Panel, PatchBox, Rack Tray, Rack Tray Device, Router,
 * SFP Device, UPS) is left with none rather than inventing sizes never
 * seen — a customer's own custom devices still show there.
 */
export interface BuiltinDevice {
  _id: string;
  name: string;
  brand?: string;
  rackUnits: number;
  type: string;
  ports: FaceElement[];
}

/** A dense grid of same-type copper/RJ45 ports, 2 sub-rows tall per U —
 *  the only builtin shape actually observed (a 24/48-port switch preview
 *  showed a real port grid, not a blank box). Column-major: port 01/02
 *  share column 0, 03/04 share column 1, and so on — matching
 *  computePortNumber's own column-major ordering (see layout-utils.ts),
 *  the same layout every real switch/patch-panel group has when built
 *  through the port editor. */
function generateSwitchPorts(count: number): FaceElement[] {
  const groupId = crypto.randomUUID();
  const ports: FaceElement[] = [];
  for (let i = 0; i < count; i++) {
    ports.push({
      id: crypto.randomUUID(),
      kind: 'port',
      side: 'front',
      col: Math.floor(i / 2),
      row: i % 2,
      groupId,
      portType: 'copper',
      connectorType: 'RJ45',
      idPrefix: '',
      countingDirection: 'ltr'
    });
  }
  return ports;
}

export const BUILTIN_CATALOG_BY_CATEGORY: Record<string, BuiltinDevice[]> = {
  'rack-misc': [
    { _id: 'builtin-placeholder-8ru', name: 'Placeholder - 8RU', brand: 'Placeholder', rackUnits: 8, type: 'rack-misc', ports: [] },
    { _id: 'builtin-placeholder-2ru', name: 'Placeholder - 2RU', brand: 'Placeholder', rackUnits: 2, type: 'rack-misc', ports: [] }
  ],
  switch: [
    {
      _id: 'builtin-switch-24',
      name: 'Switch - 24 Ports · RJ45',
      rackUnits: 1,
      type: 'switch',
      ports: generateSwitchPorts(24)
    },
    {
      _id: 'builtin-switch-48',
      name: 'Switch - 48 Ports · RJ45',
      rackUnits: 1,
      type: 'switch',
      ports: generateSwitchPorts(48)
    }
  ],
  server: [
    { _id: 'builtin-server-9ru', name: 'Server - 9RU', rackUnits: 9, type: 'server', ports: [] },
    { _id: 'builtin-server-2ru', name: 'Server - 2RU', rackUnits: 2, type: 'server', ports: [] }
  ]
};

export function getBuiltinDevicesForCategory(categoryId: string): BuiltinDevice[] {
  return BUILTIN_CATALOG_BY_CATEGORY[categoryId] || [];
}
