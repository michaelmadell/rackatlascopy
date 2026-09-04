import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { ApiError, notFound } from '../lib/errors'

interface MovableConfig {
  table: string
  columns: Record<string, string> // api field -> db column, for fields the move body may set
}

const MOVABLE: Record<string, MovableConfig> = {
  location: { table: 'locations', columns: {} },
  floor: { table: 'floors', columns: { locationId: 'location_id' } },
  room: { table: 'rooms', columns: { floorId: 'floor_id' } },
  device: {
    table: 'devices',
    columns: { locationId: 'location_id', roomId: 'room_id', rackId: 'rack_id', unit: 'unit' }
  }
}

export function registerMoveRoutes(app: FastifyInstance, db: Database.Database): void {
  app.post('/tenant/:tenantId/:type/:id/move', async (req) => {
    const { tenantId, type, id } = req.params as { tenantId: string; type: string; id: string }
    const config = MOVABLE[type]
    if (!config) throw new ApiError(400, `Unsupported move type: ${type}`)

    const body = { ...(req.body as Record<string, unknown>) }
    delete body.vlanStrategy // strategy hint only, not a column on any movable table

    const sets: string[] = []
    const values: unknown[] = []
    for (const [apiKey, dbKey] of Object.entries(config.columns)) {
      if (apiKey in body) {
        sets.push(`${dbKey} = ?`)
        values.push(body[apiKey])
      }
    }
    if (sets.length > 0) {
      const result = db
        .prepare(`UPDATE ${config.table} SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`)
        .run(...values, id, tenantId)
      if (result.changes === 0) throw notFound(type)
    }
    const row = db.prepare(`SELECT * FROM ${config.table} WHERE id = ? AND tenant_id = ?`).get(id, tenantId) as any
    if (!row) throw notFound(type)

    const doc: Record<string, unknown> = { _id: row.id, id: row.id }
    for (const [apiKey, dbKey] of Object.entries(config.columns)) {
      doc[apiKey] = row[dbKey]
    }
    return { data: doc }
  })
}
