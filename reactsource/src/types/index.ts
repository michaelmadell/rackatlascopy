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

export interface DeviceConnection {
  _id?: string;
  id?: string;
  fromDeviceId: string;
  fromPort: string;
  toDeviceId: string;
  toPort: string;
  cableColor?: string;
  type?: string;
}

export interface DeviceElement {
  id: string;
  type: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
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


