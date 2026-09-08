import type { ReactNode } from "react";

export type Theme = 'dark' | 'light' | 'system';

export type DeviceCategory = 'floor' | 'rack';

export interface User {
  _id: string;
  id?: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  isCustomerAdmin?: boolean;
}

export interface Customer {
  tax: any;
  address: any;
  _id: string;
  id?: string;
  name: string;
  billing?: {
    status?: string;
    plan?: string;
    validUntil?: string;
  };
  customDeviceTypes?: CustomDeviceType[];
  standardDeviceTypePrefixes?: Array<{ deviceType: string; prefix: string }>;
}

export interface Tenant {
  reference: string;
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  customerId: string;
}

export interface CustomDeviceType {
  _id: string;
  id?: string;
  name: string;
  category: DeviceCategory;
  defaultPrefix: string;
  prefix?: string;
  description?: string;
  icon?: string;
}

export interface CustomRackDevice {
  _id: string;
  id?: string;
  name: string;
  brand: string;
  type: string;
  rackUnits: number;
  /** Same underlying columns as brand/type/rackUnits, under the names the
   *  Device Library page (library.tsx) and Rack Device Editor actually
   *  read — see server/src/routes/custom-rack-device.ts's column aliases. */
  manufacturer?: string;
  deviceType?: string;
  height?: number;
  portsCount?: number;
  ports?: Array<{
    id?: string;
    number: string;
    type: string;
    row?: number;
    col?: number;
    /** Present on entries the Rack Device Editor wrote — a legacy/external
     *  entry may only have number/type/row/col. */
    kind?: 'port' | 'text' | 'icon';
    side?: 'front' | 'back';
    groupId?: string;
    connectorType?: string;
    idPrefix?: string;
    countingDirection?: 'ltr' | 'rtl';
    value?: string;
  }>;
  /** Not yet computed by the backend — always empty/undefined today. Present so the
   *  Device Library's "used by N devices" edit-impact flow type-checks against real usage. */
  usedInDevices?: Array<{ _id: string; name: string; locationId?: string; rackId?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

/** A cable between two ports, possibly on devices in different racks —
 *  matches the real app's own vocabulary (device1Id/port1Name/device2Id/
 *  port2Name, confirmed against the reverse-engineered
 *  devices.$deviceId.tsx and locations.$locationId.index.tsx routes); the
 *  server's device-connection route double-writes both this and the older
 *  fromDeviceId/fromPort/toDeviceId/toPort names onto the same columns, so
 *  either vocabulary round-trips, but new code should read/write this one. */
export interface DeviceConnection {
  _id?: string;
  id?: string;
  device1Id: string;
  port1Name: string;
  device2Id: string;
  port2Name: string;
  /** Which faces the cable runs between, e.g. `"front-back"` — inferred
   *  format, not directly observed. */
  direction?: string;
  /** Inferred value for a device-to-device (port-level) connection is
   *  `'user'`, as opposed to `'building'` used for floor-level rack-to-rack
   *  connections (t.$tenantId.locations.$locationId.index.tsx) — not
   *  directly observed either. */
  connectionType?: string;
  cableColor?: string;
  cassetteColor?: string;
  locationId?: string;
  floorId?: string;
  roomId?: string;
  /** @deprecated older vocabulary for the same columns — see above. */
  fromDeviceId?: string;
  fromPort?: string;
  toDeviceId?: string;
  toPort?: string;
  type?: string;
}

/** @deprecated Stale placeholder shape (free-form x/y) predating the real
 *  face-editor model — nothing in the app actually stores DeviceElement
 *  values in this shape. Kept only so any existing `import type` of it
 *  doesn't break; use `FaceElement` for anything touching a device's real
 *  port/text/icon layout. */
export interface DeviceElement {
  id: string;
  type: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
}

export type CountingDirection = 'ltr' | 'rtl';
export type Side = 'front' | 'back';

/** One cell on a device's face — a real port (`kind: 'port'`) or a free
 *  label/icon annotation (`kind: 'text' | 'icon'`). Canonical shape shared
 *  by two places: `CustomRackDevice.ports` (the Device Library template —
 *  see rack-device-editor/port-types.ts, which re-exports this) and
 *  `Device.elements` (a placed device's own per-instance copy, snapshotted
 *  from a template at placement/link time — see rack-editor/Editor.tsx). */
export interface FaceElement {
  id: string;
  kind: 'port' | 'text' | 'icon';
  side: Side;
  col: number;
  /** Sub-row this specific port sits in (0-indexed) — a group is a dense
   *  minCol..maxCol × minRow..maxRow rectangle of individual ports, one
   *  FaceElement per occupied cell, never a single element spanning
   *  multiple cells by itself (verified against real pasted markup: growing
   *  a port vertically adds a second numbered port, doesn't stretch one). */
  row: number;
  /** Ports sharing a groupId share idPrefix/connectorType/countingDirection and renumber together. */
  groupId?: string;
  portType?: string;
  connectorType?: string;
  idPrefix?: string;
  countingDirection?: CountingDirection;
  /** Per-port name override (ports) or the label text / icon id (text/icon elements). */
  value?: string;
  /** Text/icon elements only — resizing grows this element's own span
   *  rather than spawning siblings the way a port group's resize does.
   *  Defaults to 1 when absent. */
  colSpan?: number;
  rowSpan?: number;
  /** Per-port metadata a real recording showed in a settings panel when a
   *  *placed device's* port is selected (Speed (Mbps), VLAN) — distinct
   *  from the port-group settings (idPrefix/connectorType/...) the
   *  Device Library's own editor exposes on a template's ports. Ports only. */
  speed?: string;
  vlan?: string;
  /** Ids of every DeviceConnection touching this port — mirrors the real
   *  app's own model exactly (see device-connection.ts's
   *  addConnectionToElement/removeConnectionFromElement on the server,
   *  and subDevicesAndConnectionsQuery in
   *  t.$tenantId.locations.$locationId.devices.$deviceId.tsx, which scans
   *  this array to discover a device's connections — there is no other
   *  way the app finds them). Server-owned: never set this from the
   *  client, it's written by the connection routes. */
  deviceConnectionIds?: string[];
}

export interface Device {
  _id: string;
  id?: string;
  name: string;
  label?: string;
  type: string;
  unit?: number;
  heightU?: number;
  rackUnits?: number;
  side?: 'front' | 'back' | 'Front' | 'Back';
  locationId?: string;
  roomId?: string;
  rackId?: string;
  subDevices?: any[];
  ports?: any[];
  connections?: DeviceConnection[];
  floorPlanPosition?: { x: number; y: number };
  /** Links this placed device back to the CustomRackDevice template it was
   *  placed/linked from — distinct from customDeviceTypeId (the coarser
   *  "Device Types" category registry), which carries no port layout. */
  customRackDeviceId?: string;
  /** This device's own port/text/icon layout — a frozen snapshot copied
   *  from customRackDeviceId's template at placement/link time, never
   *  re-synced automatically (see rack-editor/Editor.tsx). */
  elements?: FaceElement[];
  /** Inventory fields shown in the real editor's own device side panel
   *  (confirmed against a screen recording) — asset tracking, not
   *  anything the port/connection model reads. */
  manufacturer?: string;
  modelName?: string;
  serialNumber?: string;
  /** The short human-readable code shown as "ID" at the top of both the
   *  Rack and Device settings panels (e.g. "RK01", "SRV01") — confirmed
   *  against a screenshot sequence. Same underlying column server-side as
   *  `reference` elsewhere in this app (Location, Room, ...), just not
   *  previously declared on this interface. A Rack is a `Device` row too
   *  (see rack-editor/Editor.tsx's `rack` prop), so this one interface
   *  covers both panels. */
  reference?: string;
  /** Same `responsible_user_id` column/convention already used by
   *  Location/Room/Floor (see useResponsibleUserOptions) — not previously
   *  declared here even though the server route already round-trips it. */
  responsibleUserId?: string;
  /** ISO date strings (`YYYY-MM-DD`) — a screenshot sequence showed both
   *  as native date pickers on the Rack and Device settings panels. */
  purchaseDate?: string;
  operationStart?: string;
  /** Data-URI thumbnails — this local clone has no real file/object
   *  storage, so a photo is persisted straight into this JSON column
   *  rather than through an upload endpoint. */
  photos?: string[];
  /** Free-form notes, same column/dialog convention as Vlan/Location/Room
   *  (see NoteEditorDialogMdx's other call sites) — a screenshot sequence
   *  showed the same "Add your first note… / Edit" section on both the
   *  Rack and Device settings panels. */
  notes?: string;
}

export interface Room {
  _id: string;
  id?: string;
  name: string;
  label?: string;
  polygon?: Array<[number, number]>;
  floorId?: string;
  color?: string;
}

export interface Floor {
  _id: string;
  id?: string;
  name: string;
  level: number;
  locationId: string;
  rooms?: Room[];
  devices?: Device[];
  floorPlanImage?: string;
  bounds?: { width: number; height: number };
}

export interface Location {
  _id: string;
  id?: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  floors?: Floor[];
  rooms?: Room[];
}

export interface PermissionsCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface Vlan {
  _id: string;
  vlanId: number;
  name: string;
  description?: string;
  ports?: any[];
  tenantId?: string;
}

export interface Wlan {
  _id: string;
  ssid: string;
  security?: string;
  description?: string;
  devices?: any[];
  tenantId?: string;
}

export interface SearchResult {
  ssid: ReactNode;
  reference: ReactNode;
  fullReference: string;
  networkNumber: ReactNode;
  deviceType: string;
  _id: string;
  name: string;
  type: string;
}

export interface Address {
  line1?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface DeviceNamingConfig {
  prefix: string;
  startingIndex?: number;
}

export interface CustomerBilling {
  status?: string;
  plan?: string;
  exempt?: boolean;
  blockedAt?: string;
  readOnlyAt?: string;
  readOnlyPeriodDays?: number;
  subscriptionStatus?: string;
  paymentFailedAt?: string;
  paymentMethodType?: string;
  gracePeriodDays?: number;
  trialEndsAt?: string;
  enterprisePrice?: any;
  prices?: any;
  billingInterval?: string;
  welcomeOffer?: any;
  welcomeOfferApplied?: boolean;
  subscriptionId?: string;
}

export interface OfferCoupon {
  percentOff: number;
  duration?: string;
  durationInMonths?: number;
}

export interface EnrichedLogListItem {
  _id: string;
  action: string;
  resource: string;
  resourceId?: string;
  resourceData?: Record<string, any>;
  userId?: { email?: string; name?: string };
  createdAt: string;
}


