import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { registerCrudRoutes } from '../lib/crud-factory'

const deviceColumns = [
  { db: 'name', api: 'name' },
  { db: 'label', api: 'label' },
  { db: 'type', api: 'type' },
  { db: 'unit', api: 'unit' },
  { db: 'height_u', api: 'heightU' },
  { db: 'side', api: 'side' },
  { db: 'location_id', api: 'locationId' },
  { db: 'room_id', api: 'roomId' },
  { db: 'rack_id', api: 'rackId' },
  { db: 'sub_devices_json', api: 'subDevices', json: true },
  { db: 'ports_json', api: 'ports', json: true },
  { db: 'floor_plan_position_json', api: 'floorPlanPosition', json: true }
]

export function registerDeviceRoutes(app: FastifyInstance, db: Database.Database): void {
  registerCrudRoutes(app, db, '/tenant/:tenantId/device', {
    table: 'devices',
    scope: { column: 'tenant_id', param: 'tenantId' },
    columns: deviceColumns,
    sortableColumns: ['name']
  })

  app.post('/tenant/:tenantId/device/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { devices } = req.body as { devices: Array<Record<string, unknown>> }
    const insert = db.prepare(
      `INSERT INTO devices (id, tenant_id, name, label, type, unit, height_u, side, location_id, room_id, rack_id, sub_devices_json, ports_json, floor_plan_position_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const select = db.prepare('SELECT * FROM devices WHERE id = ? AND tenant_id = ?')
    const created = devices.map((device) => {
      const id = randomUUID()
      insert.run(
        id,
        tenantId,
        device.name ?? '',
        device.label ?? null,
        device.type ?? null,
        device.unit ?? null,
        device.heightU ?? null,
        device.side ?? null,
        device.locationId ?? null,
        device.roomId ?? null,
        device.rackId ?? null,
        JSON.stringify(device.subDevices ?? []),
        JSON.stringify(device.ports ?? []),
        JSON.stringify(device.floorPlanPosition ?? null)
      )
      // Build the response from the row actually persisted, not the raw request
      // body — the body may carry extraneous or spoofed fields (e.g. a fake
      // tenantId) that must never be echoed back as if they were saved.
      const row = select.get(id, tenantId) as any
      return {
        _id: row.id,
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        label: row.label,
        type: row.type,
        unit: row.unit,
        heightU: row.height_u,
        side: row.side,
        locationId: row.location_id,
        roomId: row.room_id,
        rackId: row.rack_id,
        subDevices: row.sub_devices_json ? JSON.parse(row.sub_devices_json) : [],
        ports: row.ports_json ? JSON.parse(row.ports_json) : [],
        floorPlanPosition: row.floor_plan_position_json ? JSON.parse(row.floor_plan_position_json) : null
      }
    })
    return { data: created }
  })

  app.post('/tenant/:tenantId/device/:rackId/deactivate', async (req) => {
    const { tenantId, rackId } = req.params as { tenantId: string; rackId: string }
    db.prepare('UPDATE devices SET rack_id = NULL WHERE rack_id = ? AND tenant_id = ?').run(rackId, tenantId)
    return { success: true }
  })
}
