import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { ApiError, notFound } from '../lib/errors'

const insertSql = `
  INSERT INTO device_connections
    (id, tenant_id, from_device_id, from_port, to_device_id, to_port, cable_color, cassette_color,
     type, direction, location_id, floor_id, room_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

/**
 * The app reads connections under a second set of names — `device1Id`,
 * `device2Id`, `port1Name`, `port2Name`, `connectionType`, plus `direction`
 * (t.$tenantId.locations.$locationId.index.tsx:224 filters on it) — so every
 * document carries both vocabularies over the same columns.
 */
function rowToDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    id: row.id,
    tenantId: row.tenant_id,
    fromDeviceId: row.from_device_id,
    device1Id: row.from_device_id,
    fromPort: row.from_port,
    port1Name: row.from_port,
    toDeviceId: row.to_device_id,
    device2Id: row.to_device_id,
    toPort: row.to_port,
    port2Name: row.to_port,
    cableColor: row.cable_color,
    cassetteColor: row.cassette_color,
    type: row.type,
    connectionType: row.type,
    direction: row.direction,
    locationId: row.location_id,
    floorId: row.floor_id,
    roomId: row.room_id
  }
}

function insertConnection(
  db: Database.Database,
  tenantId: string,
  c: Record<string, unknown>
): Record<string, unknown> {
  const id = randomUUID()
  db.prepare(insertSql).run(
    id,
    tenantId,
    c.fromDeviceId ?? c.device1Id ?? null,
    c.fromPort ?? c.port1Name ?? null,
    c.toDeviceId ?? c.device2Id ?? null,
    c.toPort ?? c.port2Name ?? null,
    c.cableColor ?? null,
    c.cassetteColor ?? null,
    c.type ?? c.connectionType ?? null,
    c.direction ?? null,
    c.locationId ?? null,
    c.floorId ?? null,
    c.roomId ?? null
  )
  // Build the response from the row actually persisted, not the raw request
  // body — the body may carry extraneous or spoofed fields (e.g. a fake
  // tenantId) that must never be echoed back as if they were saved.
  const row = db.prepare('SELECT * FROM device_connections WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any
  return rowToDoc(row)
}

export function registerDeviceConnectionRoutes(app: FastifyInstance, db: Database.Database): void {
  /**
   * Transactional create + delete in one request:
   *   { create: [...], delete: [id, ...] }
   * (t.$tenantId.locations.$locationId.devices.$deviceId.tsx:584-587/609-612,
   *  t.$tenantId.locations.$locationId.index.tsx:1120-1135/1239-1242/1270-1273).
   *
   * `hasChanges` answers the app's `hasCassetteChanges(response.data)` check —
   * this backend rewrites no cassette colours, so it is always false.
   */
  app.post('/tenant/:tenantId/device-connection/batch', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const body = (req.body ?? {}) as { create?: Array<Record<string, unknown>>; delete?: string[] }
    const toCreate = body.create ?? []
    const toDelete = body.delete ?? []
    if (!Array.isArray(toCreate) || !Array.isArray(toDelete)) {
      throw new ApiError(400, 'device-connection/batch requires `create` and `delete` arrays')
    }

    // All-or-nothing: a half-applied batch would leave the app's cached
    // connection ids pointing at rows that never existed.
    const apply = db.transaction(() => {
      const created = toCreate.map((c) => insertConnection(db, tenantId, c))
      const deleted: string[] = []
      const del = db.prepare('DELETE FROM device_connections WHERE id = ? AND tenant_id = ?')
      for (const id of toDelete) {
        // Scoped by tenant: an id belonging to another tenant simply matches
        // nothing rather than deleting across the boundary.
        if (del.run(id, tenantId).changes > 0) deleted.push(id)
      }
      return { created, deleted }
    })

    return { data: apply(), hasChanges: false }
  })

  /**
   * Despite the POST verb this is a READ: fetch a set of connections by id
   * (devices.$deviceId.tsx:123-126, index.tsx:219-221).
   */
  app.post('/tenant/:tenantId/device-connection/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { ids } = (req.body ?? {}) as { ids?: string[] }
    if (!Array.isArray(ids)) throw new ApiError(400, 'device-connection/bulk requires an `ids` array')
    if (ids.length === 0) return { data: [] }
    const placeholders = ids.map(() => '?').join(', ')
    const rows = db
      .prepare(`SELECT * FROM device_connections WHERE tenant_id = ? AND id IN (${placeholders})`)
      .all(tenantId, ...ids) as any[]
    return { data: rows.map(rowToDoc) }
  })

  app.patch('/tenant/:tenantId/device-connection/:id', async (req) => {
    const { tenantId, id } = req.params as { tenantId: string; id: string }
    const body = req.body as Record<string, unknown>
    const sets: string[] = []
    const values: unknown[] = []
    const map: Record<string, string> = {
      fromDeviceId: 'from_device_id',
      device1Id: 'from_device_id',
      fromPort: 'from_port',
      port1Name: 'from_port',
      toDeviceId: 'to_device_id',
      device2Id: 'to_device_id',
      toPort: 'to_port',
      port2Name: 'to_port',
      cableColor: 'cable_color',
      cassetteColor: 'cassette_color',
      type: 'type',
      connectionType: 'type',
      direction: 'direction',
      locationId: 'location_id',
      floorId: 'floor_id',
      roomId: 'room_id'
    }
    const assigned = new Set<string>()
    for (const [apiKey, dbKey] of Object.entries(map)) {
      if (apiKey in body && !assigned.has(dbKey)) {
        assigned.add(dbKey)
        sets.push(`${dbKey} = ?`)
        values.push(body[apiKey])
      }
    }
    if (sets.length > 0) {
      const result = db
        .prepare(`UPDATE device_connections SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`)
        .run(...values, id, tenantId)
      if (result.changes === 0) throw notFound('device-connection')
    }
    const row = db.prepare('SELECT * FROM device_connections WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any
    if (!row) throw notFound('device-connection')
    return { data: rowToDoc(row) }
  })

  app.delete('/tenant/:tenantId/device-connection/:id', async (req) => {
    const { tenantId, id } = req.params as { tenantId: string; id: string }
    const result = db.prepare('DELETE FROM device_connections WHERE id = ? AND tenant_id = ?').run(id, tenantId)
    if (result.changes === 0) throw notFound('device-connection')
    return { success: true }
  })
}
