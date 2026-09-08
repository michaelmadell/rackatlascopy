import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'
import { ApiError } from '../lib/errors'

const deviceColumns = [
  // Read-only: `tenant_id` is already the scope column (always enforced from
  // the URL, never the body — see crud-factory's ALWAYS_ALLOWED_BODY_KEYS).
  // Adding it here too just so single-device reads (GET/POST/PATCH via the
  // generic CRUD routes) carry `tenantId` in the response, matching what
  // `deviceRowToDoc` below already gives the bespoke `/device/bulk` route —
  // without it, a device fetched via `GET .../device/:id` had no tenantId at
  // all, unlike one fetched via bulk. `readOnly: true` keeps `docToRow` from
  // also treating it as writable, which would double up with the scope
  // column in the INSERT/UPDATE.
  { db: 'tenant_id', api: 'tenantId', readOnly: true },
  { db: 'name', api: 'name' },
  { db: 'label', api: 'label' },
  { db: 'reference', api: 'reference' },
  { db: 'category', api: 'category' },
  { db: 'type', api: 'type' },
  // The name the real frontend both writes and filters on
  // (t.$tenantId.racks.tsx:306, t.$tenantId.locations.$locationId.index.tsx:1048);
  // shares the `type` column with the legacy `type` alias above.
  { db: 'type', api: 'deviceType' },
  { db: 'custom_device_type_id', api: 'customDeviceTypeId' },
  // Links a placed device back to the CustomRackDevice template it was
  // placed/linked from (see rack-device-editor) — distinct from
  // customDeviceTypeId above, which points at the coarser "Device Types"
  // category registry and carries no port layout.
  { db: 'custom_rack_device_id', api: 'customRackDeviceId' },
  { db: 'unit', api: 'unit' },
  { db: 'height_u', api: 'heightU' },
  // ...index.tsx:1051 — same column, the name the app sends.
  { db: 'height_u', api: 'rackUnitsCount' },
  { db: 'side', api: 'side' },
  { db: 'location_id', api: 'locationId' },
  { db: 'floor_id', api: 'floorId' },
  { db: 'room_id', api: 'roomId' },
  { db: 'rack_id', api: 'rackId' },
  // ...devices.$deviceId.tsx:740 — the parent rack, under the app's own name.
  { db: 'rack_id', api: 'rackDeviceId' },
  { db: 'responsible_user_id', api: 'responsibleUserId' },
  { db: 'sub_devices_json', api: 'subDevices', json: true },
  { db: 'ports_json', api: 'ports', json: true },
  // The app's ports/faceplate model (`subDevice.elements`), distinct from `ports`.
  { db: 'elements_json', api: 'elements', json: true },
  { db: 'floor_plan_position_json', api: 'floorPlanPosition', json: true }
]

export function deviceRowToDoc(row: any): Record<string, unknown> {
  const parse = (raw: unknown, fallback: unknown) => (raw != null ? JSON.parse(raw as string) : fallback)
  return {
    _id: row.id,
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    label: row.label,
    reference: row.reference,
    category: row.category,
    type: row.type,
    deviceType: row.type,
    customDeviceTypeId: row.custom_device_type_id,
    customRackDeviceId: row.custom_rack_device_id,
    unit: row.unit,
    heightU: row.height_u,
    rackUnitsCount: row.height_u,
    side: row.side,
    locationId: row.location_id,
    floorId: row.floor_id,
    roomId: row.room_id,
    rackId: row.rack_id,
    rackDeviceId: row.rack_id,
    responsibleUserId: row.responsible_user_id,
    subDevices: parse(row.sub_devices_json, []),
    ports: parse(row.ports_json, []),
    elements: parse(row.elements_json, []),
    floorPlanPosition: parse(row.floor_plan_position_json, null)
  }
}

export function registerDeviceRoutes(app: FastifyInstance, db: Database.Database): void {
  registerCrudRoutes(app, db, '/tenant/:tenantId/device', {
    table: 'devices',
    scope: { column: 'tenant_id', param: 'tenantId' },
    columns: deviceColumns,
    sortableColumns: ['name'],
    filterableColumns: ['deviceType', 'type', 'category', 'rackId', 'rackDeviceId', 'roomId', 'floorId', 'locationId']
  })

  /**
   * Despite the POST verb this is a READ. Two mutually exclusive body shapes,
   * both confirmed against the app:
   *   { floorId, attachDevicePermissions? } — every device on a floor
   *     (t.$tenantId.locations.$locationId.index.tsx:186-194)
   *   { rackDeviceId }                      — the sub-devices of one rack
   *     (t.$tenantId.locations.$locationId.devices.$deviceId.tsx:102-104)
   * `attachDevicePermissions` is answered with an empty `permissions` map —
   * this backend has no permissions system (plan non-goal).
   */
  app.post('/tenant/:tenantId/device/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { floorId, rackDeviceId } = (req.body ?? {}) as { floorId?: string; rackDeviceId?: string }

    let rows: any[]
    if (rackDeviceId) {
      rows = db
        .prepare('SELECT * FROM devices WHERE tenant_id = ? AND rack_id = ?')
        .all(tenantId, rackDeviceId) as any[]
    } else if (floorId) {
      // A device reaches a floor either directly (floor_id, what the app sets
      // on create) or through its room — seeded data only carries room_id.
      rows = db
        .prepare(
          `SELECT * FROM devices
           WHERE tenant_id = ?
             AND (floor_id = ?
                  OR room_id IN (SELECT id FROM rooms WHERE tenant_id = ? AND floor_id = ?))`
        )
        .all(tenantId, floorId, tenantId, floorId) as any[]
    } else {
      throw new ApiError(400, 'device/bulk requires either a floorId or a rackDeviceId')
    }

    return { data: rows.map(deviceRowToDoc), permissions: {} }
  })

  app.post('/tenant/:tenantId/device/:rackId/deactivate', async (req) => {
    const { tenantId, rackId } = req.params as { tenantId: string; rackId: string }
    db.prepare('UPDATE devices SET rack_id = NULL WHERE rack_id = ? AND tenant_id = ?').run(rackId, tenantId)
    return { success: true }
  })
}
