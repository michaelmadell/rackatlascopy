import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { notFound } from '../lib/errors'

const insertSql = `
  INSERT INTO device_connections (id, tenant_id, from_device_id, from_port, to_device_id, to_port, cable_color, type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`

function rowToDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    id: row.id,
    tenantId: row.tenant_id,
    fromDeviceId: row.from_device_id,
    fromPort: row.from_port,
    toDeviceId: row.to_device_id,
    toPort: row.to_port,
    cableColor: row.cable_color,
    type: row.type
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
    c.fromDeviceId ?? null,
    c.fromPort ?? null,
    c.toDeviceId ?? null,
    c.toPort ?? null,
    c.cableColor ?? null,
    c.type ?? null
  )
  // Build the response from the row actually persisted, not the raw request
  // body — the body may carry extraneous or spoofed fields (e.g. a fake
  // tenantId) that must never be echoed back as if they were saved.
  const row = db.prepare('SELECT * FROM device_connections WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any
  return rowToDoc(row)
}

export function registerDeviceConnectionRoutes(app: FastifyInstance, db: Database.Database): void {
  app.post('/tenant/:tenantId/device-connection/batch', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { connections } = req.body as { connections: Array<Record<string, unknown>> }
    return { data: connections.map((c) => insertConnection(db, tenantId, c)) }
  })

  app.post('/tenant/:tenantId/device-connection/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { connections } = req.body as { connections: Array<Record<string, unknown>> }
    return { data: connections.map((c) => insertConnection(db, tenantId, c)) }
  })

  app.patch('/tenant/:tenantId/device-connection/:id', async (req) => {
    const { tenantId, id } = req.params as { tenantId: string; id: string }
    const body = req.body as Record<string, unknown>
    const sets: string[] = []
    const values: unknown[] = []
    const map: Record<string, string> = {
      fromDeviceId: 'from_device_id',
      fromPort: 'from_port',
      toDeviceId: 'to_device_id',
      toPort: 'to_port',
      cableColor: 'cable_color',
      type: 'type'
    }
    for (const [apiKey, dbKey] of Object.entries(map)) {
      if (apiKey in body) {
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
