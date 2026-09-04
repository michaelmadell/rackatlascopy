import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  TbBriefcase2,
  TbBuilding,
  TbStairs,
  TbDoor,
  TbServer,
  TbDevices,
  TbCloudDataConnection,
  TbWifi
} from 'react-icons/tb'
import axios from 'axios'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'
import isoCountries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import deLocale from 'i18n-iso-countries/langs/de.json'
isoCountries.registerLocale(enLocale)
isoCountries.registerLocale(deLocale)
import constants from '@patchdocs/constants'
import { STANDARD_DEVICE_TYPES } from '@/lib/device-constants'
import * as m from '@/paraglide/messages'
import type { IconType } from 'react-icons'
import type { User, Tenant, SearchResult, Address, Device, DeviceNamingConfig } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number, countryCode = 'AT', currency = 'EUR'): string {
  const locale = `${countryCode.toLowerCase()}-${countryCode}`
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(cents / 100)
}

export const resourceTypeIcons: Record<string, IconType> = {
  tenant: TbBriefcase2,
  location: TbBuilding,
  floor: TbStairs,
  room: TbDoor,
  rack: TbServer,
  device: TbDevices,
  'device-connection': TbDevices,
  vlan: TbCloudDataConnection,
  wlan: TbWifi
}

export type ResourceTypeKey =
  | 'customer'
  | 'tenant'
  | 'location'
  | 'floor'
  | 'room'
  | 'device'
  | 'device-connection'
  | 'connection'
  | 'rack'
  | 'port'
  | 'vlan'
  | 'wlan'
  | 'custom-rack-device'
  | 'user'

// Canonical resource-type → translated label, mirroring resourceTypeIcons above. Spans both the editors'
// `view` vocabularies (rack/port/connection) and the activity-log resource strings (customer→organisation,
// device-connection, vlan/wlan/custom-rack-device/user/tenant).
const resourceTypeLabels: Record<ResourceTypeKey, () => string> = {
  customer: m.organisation,
  tenant: m.tenant,
  location: m.location,
  floor: m.floor,
  room: m.room,
  device: m.device,
  'device-connection': m.device_connection,
  connection: m.connection,
  rack: m.rack,
  port: m.port,
  vlan: m.vlan,
  wlan: m.wlan,
  'custom-rack-device': m.custom_rack_device,
  user: m.user
}

// Server-driven log resource strings can be anything, so fall back to a title-cased raw value.
export function resourceTypeLabel(type: string): string {
  return resourceTypeLabels[type as ResourceTypeKey]?.() ?? type.charAt(0).toUpperCase() + type.slice(1)
}

/**
 * Formats a date for display in tables and UI components
 * @param date - The date to format (can be Date object, string, or null/undefined)
 * @param options - Optional Intl.DateTimeFormatOptions to override default formatting
 * @returns Formatted date string or '-' if no date provided
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(dateObj.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, options).format(dateObj)
}

/**
 * Formats a date for display (date only, no time)
 * @param date - The date to format (can be Date object, string, or null/undefined)
 * @returns Formatted date string or '-' if no date provided
 */
export function formatDate(date: Date | string | null | undefined): string {
  return formatDateTime(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Formats a time for display (time only, no date)
 * @param date - The date to format (can be Date object, string, or null/undefined)
 * @returns Formatted time string or '-' if no date provided
 */
export function formatTime(date: Date | string | null | undefined): string {
  return formatDateTime(date, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function isUserCustomerAdmin(user: User | null, customerId: string) {
  return user?.permissions?.some(
    (grant) => grant.resourceType === 'customer' && grant.resourceId === customerId && grant.role === 'admin'
  )
}

export function isUserAdminOfCurrentCustomer(user: User | null) {
  return user?.permissions?.some(
    (grant) => grant.resourceType === 'customer' && grant.resourceId === user?.customerId && grant.role === 'admin'
  )
}

export function isUserAdminOfCurrentTenant(user: User | null, activeTenant: Tenant | null): boolean {
  return (
    (isUserAdminOfCurrentCustomer(user) ||
      user?.permissions?.some(
        (permission) =>
          permission.resourceType === 'tenant' &&
          permission.role === 'admin' &&
          permission.resourceId === activeTenant?._id
      )) ??
    false
  )
}

export type MoveResourceType = 'location' | 'floor' | 'device'

/** A location's only parent is a tenant, so moving one needs a second tenant to move it to. */
export function canMoveResourceType(type: MoveResourceType, accountType: string | undefined, tenantCount: number) {
  return type !== 'location' || (accountType === 'systemIntegrator' && tenantCount > 1)
}

export function leadingZero(number: number): string {
  return number < 10 ? `0${number}` : String(number)
}

/**
 * Geocodes an address using Mapbox Forward Geocoding API
 * @param address - Address fields to geocode
 * @returns Coordinates { latitude, longitude } or null if geocoding fails
 */
export async function getCoordinatesFromAddress(address: {
  line1: string
  city: string
  state?: string
  postalCode: string
  countryCode: string
}): Promise<{ latitude: number; longitude: number } | null> {
  const addressString = [
    address.line1.trim(),
    address.city.trim(),
    (address.state || '').trim(),
    address.postalCode.trim(),
    address.countryCode
  ]
    .filter(Boolean)
    .join(', ')

  if (!addressString) {
    return null
  }

  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressString)}.json`,
      {
        params: {
          access_token: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
          limit: 1
        }
      }
    )

    if (response.data.features && response.data.features.length > 0) {
      const [lng, lat] = response.data.features[0].center
      return { latitude: lat, longitude: lng }
    }

    return null
  } catch (_error) {
    // If geocoding fails, return null
    // console.error('Geocoding failed:', error)
    return null
  }
}

/**
 * Gets navigation parameters for a search result or log item resource
 * @param result - The search result or resource data
 * @param tenantId - The active tenant ID
 * @returns Navigation object with to, params, and optional search, or null if navigation not available
 */
export function getResourceNavigation(
  result:
    | SearchResult
    | { type: string; _id: string; deviceType?: string; rackDeviceId?: string; locationId?: string; floorId?: string },
  tenantId: string | undefined
) {
  if (!tenantId) return null

  switch (result.type) {
    case 'location':
      return {
        to: '/app/t/$tenantId/locations/$locationId',
        params: { tenantId, locationId: result._id }
      }

    case 'floor':
      return result.locationId
        ? {
            to: '/app/t/$tenantId/locations/$locationId',
            params: { tenantId, locationId: result.locationId },
            search: { floorId: result._id }
          }
        : null

    case 'room':
      return result.locationId
        ? {
            to: '/app/t/$tenantId/locations/$locationId',
            params: { tenantId, locationId: result.locationId },
            search: { floorId: result.floorId, roomId: result._id }
          }
        : null

    case 'device':
      if (result.deviceType === 'rack') {
        return {
          to: '/app/t/$tenantId/locations/$locationId/devices/$deviceId',
          params: { tenantId, locationId: result.locationId, deviceId: result.rackDeviceId || result._id }
        }
      }
      if (result.rackDeviceId) {
        return {
          to: '/app/t/$tenantId/locations/$locationId/devices/$deviceId',
          params: { tenantId, locationId: result.locationId, deviceId: result.rackDeviceId || result._id },
          search: { subDeviceId: result._id }
        }
      }
      return result.locationId
        ? {
            to: '/app/t/$tenantId/locations/$locationId',
            params: { tenantId, locationId: result.locationId },
            search: { floorId: result.floorId, deviceId: result._id }
          }
        : null

    case 'vlan':
      return {
        to: '/app/t/$tenantId/vlan',
        params: { tenantId }
      }
    case 'wlan':
      return {
        to: '/app/t/$tenantId/wlan',
        params: { tenantId }
      }

    default:
      return null
  }
}

/**
 * Gets a formatted address string from an Address object
 * @param address - The Address object
 * @param includeState - Whether to include the state in the address string
 * @returns Formatted address string
 */
export function getAddressString(address: Address | null | undefined, includeState = false): string {
  if (!address?.line1) return ''
  return [
    address.line1,
    address.postalCode,
    address.city,
    includeState ? address.state : undefined,
    address.countryCode
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Generate the next available reference for a device
 * Tries PR1, PR2, PR3... until finding one that doesn't exist
 */
export function generateReference(options: {
  prefix: string
  parentId: string
  parentField: 'floorId' | 'rackDeviceId'
  devices: Device[]
}): string {
  const { prefix, parentId, parentField, devices } = options

  // Get all existing references in the same parent
  const existingReferences = new Set(
    devices
      .filter((d) => d[parentField] === parentId)
      .map((d) => d.reference)
      .filter(Boolean)
  )

  // Find first available number
  let number = 1
  while (existingReferences.has(`${prefix}${leadingZero(number)}`)) {
    number++
  }

  return `${prefix}${leadingZero(number)}`
}

/**
 * Get icon for a floor device type (standard or fallback)
 */
export function getFloorDeviceIcon(deviceType: string): IconType | null {
  const device = STANDARD_DEVICE_TYPES.floor.find((d) => d.id === deviceType)
  return device?.icon || null
}

/**
 * Get localized label for any device type (floor or rack)
 */
export function getDeviceTypeLabel(deviceType: string | undefined): string {
  if (!deviceType) return ''
  if (deviceType === 'custom') return m.custom()
  const allTypes = [...STANDARD_DEVICE_TYPES.floor, ...STANDARD_DEVICE_TYPES.rack]
  const match = allTypes.find((t) => t.id === deviceType)
  return match ? match.label() : deviceType
}

/**
 * `LOC/GF/RM/RACK-01/PBX-1 cassette 3`, which is how every dialog names a Patchbox cassette.
 */
export function getCassetteName(cassette: { fullReference: string; cassetteNumber?: number }): string {
  return m.cassette_color_cassette_name({ reference: cassette.fullReference, number: cassette.cassetteNumber ?? '' })
}

/**
 * Get label for a standard floor device type
 */
export function getFloorDeviceLabel(deviceType: string): string | null {
  const device = STANDARD_DEVICE_TYPES.floor.find((d) => d.id === deviceType)
  return device ? device.label() : null
}

/**
 * Get default prefix for a device type
 */
export function getDefaultPrefix(deviceTypeId: string): string {
  const floorDevice = STANDARD_DEVICE_TYPES.floor.find((d) => d.id === deviceTypeId)
  if (floorDevice) return floorDevice.defaultPrefix

  const rackDevice = STANDARD_DEVICE_TYPES.rack.find((d) => d.id === deviceTypeId)
  if (rackDevice) return rackDevice.defaultPrefix

  return deviceTypeId.substring(0, 3).toUpperCase()
}

export function getDeviceConnectorTypeOptions({ copper = true, fiber = true, other = true } = {}): string[] {
  const result: string[] = []
  if (copper) result.push(...constants.device.copperConnectorTypes)
  if (fiber) result.push(...constants.device.fiberConnectorTypes)
  if (other) result.push(...constants.device.passiveConnectorTypes.filter((t) => t !== 'power' && t !== 'wireless'))
  return result
}

/**
 * Get device prefix from customer naming config
 * Checks standard prefix overrides first, then custom device types, then falls back to default
 */
export function toUTCNoon(date: Date | undefined): Date | undefined {
  if (!date) return undefined
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0))
}

export function getDevicePrefix(deviceTypeId: string, naming?: DeviceNamingConfig): string {
  // Check standard prefix overrides
  const standardOverride = naming?.standardDeviceTypePrefixes?.find((p) => p.deviceType === deviceTypeId)
  if (standardOverride) return standardOverride.prefix

  // Check custom device types
  const customType = naming?.customDeviceTypes?.find((c) => c._id === deviceTypeId)
  if (customType) return customType.prefix

  // Fall back to default
  return getDefaultPrefix(deviceTypeId)
}

/** jsvat country configs filtered to EU countries (for VAT format validation) */
export { countries as jsvatAllCountries } from 'jsvat'
import { countries as _jsvatCountries } from 'jsvat'
export const jsvatEuCountries = _jsvatCountries.filter((c) => isEuCountry(c.codes[0]))

/** Returns the full country name for a given country code in the specified language */
export function getCountryName(countryCode: string, lang = 'en'): string {
  return isoCountries.getName(countryCode, lang) || countryCode
}

/** Returns all countries as { value, label } sorted alphabetically for the given language */
export function getCountryOptions(lang = 'en'): { value: string; label: string }[] {
  const names = isoCountries.getNames(lang)
  return Object.entries(names)
    .map(([code, name]) => ({ value: code, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Checks if a country code belongs to an EU member state */
export function isEuCountry(countryCode: string): boolean {
  return (constants.billing.euCountryCodes as readonly string[]).includes(countryCode)
}

/** Returns all Stripe tax ID types available for a given country code */
export function getTaxIdTypesForCountry(countryCode: string) {
  return constants.billing.stripeTaxIdTypes.filter((t) => t.countryCode === countryCode)
}

/** SHA-256 hex digest using Web Crypto. Lowercases + trims input (Google-standard email normalization). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase())
  const buf = await window.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Format phone number as E.164 given an ISO country code; returns trimmed input if unparseable. */
export function toE164(raw: string, countryCode: string): string {
  const parsed = parsePhoneNumberFromString(raw, countryCode as CountryCode)
  if (!parsed?.isValid()) return raw.trim()
  return parsed.format('E.164')
}

export function isFirefoxAndroid(userAgent: string = navigator.userAgent): boolean {
  return /Android/i.test(userAgent) && /Firefox/i.test(userAgent)
}
