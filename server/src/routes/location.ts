import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { registerCrudRoutes } from '../lib/crud-factory'
import { notFound } from '../lib/errors'

export function registerLocationRoutes(app: FastifyInstance, db: Database.Database): void {
  const scope = { column: 'tenant_id', param: 'tenantId' }

  registerCrudRoutes(app, db, '/tenant/:tenantId/location', {
    table: 'locations',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'address', api: 'address' },
      { db: 'city', api: 'city' },
      { db: 'country', api: 'country' }
    ],
    sortableColumns: ['name'],
    defaultSort: 'name'
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/floor', {
    table: 'floors',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'level', api: 'level' },
      { db: 'location_id', api: 'locationId' },
      { db: 'floor_plan_image', api: 'floorPlanImage' },
      { db: 'bounds_json', api: 'bounds', json: true }
    ],
    sortableColumns: ['name', 'level']
  })

  app.get('/tenant/:tenantId/floor/:id/floor-plan', async (req) => {
    const { tenantId, id } = req.params as { tenantId: string; id: string }
    const floor = db.prepare('SELECT * FROM floors WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any
    if (!floor) throw notFound('floor')
    const rooms = db.prepare('SELECT * FROM rooms WHERE floor_id = ? AND tenant_id = ?').all(id, tenantId) as any[]
    return {
      data: {
        _id: floor.id,
        id: floor.id,
        floorPlanImage: floor.floor_plan_image,
        bounds: floor.bounds_json ? JSON.parse(floor.bounds_json) : undefined,
        rooms: rooms.map((r) => ({
          _id: r.id,
          id: r.id,
          name: r.name,
          label: r.label,
          color: r.color,
          polygon: r.polygon_json ? JSON.parse(r.polygon_json) : []
        }))
      }
    }
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/room', {
    table: 'rooms',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'label', api: 'label' },
      { db: 'color', api: 'color' },
      { db: 'floor_id', api: 'floorId' },
      { db: 'polygon_json', api: 'polygon', json: true }
    ],
    sortableColumns: ['name']
  })

  app.post('/tenant/:tenantId/room/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { rooms } = req.body as { rooms: Array<Record<string, unknown>> }
    const insert = db.prepare(
      `INSERT INTO rooms (id, tenant_id, floor_id, name, label, color, polygon_json) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const created = rooms.map((room) => {
      const id = randomUUID()
      insert.run(
        id,
        tenantId,
        room.floorId ?? null,
        room.name ?? '',
        room.label ?? null,
        room.color ?? null,
        JSON.stringify(room.polygon ?? [])
      )
      return { _id: id, id, ...room }
    })
    return { data: created }
  })
}
