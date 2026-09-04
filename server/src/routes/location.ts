import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'
import { ApiError, notFound } from '../lib/errors'

/**
 * Shape of a room as the frontend consumes it.
 *
 * `floorPlanShapePoints` is the name the app both writes and reads
 * (t.$tenantId.locations.$locationId.index.tsx:938/943); `polygon` is kept as
 * an alias so the seed data and the older floor-plan payload keep working.
 */
export function roomRowToDoc(row: any): Record<string, unknown> {
  const points = row.polygon_json ? JSON.parse(row.polygon_json) : []
  return {
    _id: row.id,
    id: row.id,
    tenantId: row.tenant_id,
    floorId: row.floor_id,
    locationId: row.location_id,
    name: row.name,
    label: row.label,
    reference: row.reference,
    color: row.color,
    responsibleUserId: row.responsible_user_id,
    floorPlanShapeType: row.floor_plan_shape_type,
    floorPlanShapePoints: points,
    polygon: points
  }
}

export function registerLocationRoutes(app: FastifyInstance, db: Database.Database): void {
  const scope = { column: 'tenant_id', param: 'tenantId' }

  registerCrudRoutes(app, db, '/tenant/:tenantId/location', {
    table: 'locations',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'reference', api: 'reference' },
      { db: 'address', api: 'address' },
      { db: 'city', api: 'city' },
      { db: 'country', api: 'country' },
      { db: 'latitude', api: 'latitude' },
      { db: 'longitude', api: 'longitude' },
      { db: 'responsible_user_id', api: 'responsibleUserId' }
    ],
    sortableColumns: ['name'],
    defaultSort: 'name'
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/floor', {
    table: 'floors',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'reference', api: 'reference' },
      { db: 'level', api: 'level' },
      { db: 'location_id', api: 'locationId' },
      { db: 'floor_plan_image', api: 'floorPlanImage' },
      { db: 'bounds_json', api: 'bounds', json: true },
      { db: 'responsible_user_id', api: 'responsibleUserId' }
    ],
    sortableColumns: ['name', 'level'],
    filterableColumns: ['locationId']
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
        rooms: rooms.map(roomRowToDoc)
      }
    }
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/room', {
    table: 'rooms',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'label', api: 'label' },
      { db: 'reference', api: 'reference' },
      { db: 'color', api: 'color' },
      { db: 'floor_id', api: 'floorId' },
      { db: 'location_id', api: 'locationId' },
      { db: 'responsible_user_id', api: 'responsibleUserId' },
      { db: 'floor_plan_shape_type', api: 'floorPlanShapeType' },
      { db: 'polygon_json', api: 'polygon', json: true },
      // The name the app actually writes and reads back; shares polygon_json
      // with the legacy `polygon` alias above.
      { db: 'polygon_json', api: 'floorPlanShapePoints', json: true }
    ],
    sortableColumns: ['name'],
    filterableColumns: ['floorId', 'locationId']
  })

  /**
   * Despite the POST verb this is a READ: the app uses it to list the rooms of
   * one floor (t.$tenantId.locations.$locationId.index.tsx:172-181).
   * `attachRoomPermissions` is accepted and answered with an empty
   * `permissions` map — this backend has no permissions system (plan non-goal).
   */
  app.post('/tenant/:tenantId/room/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { floorId } = (req.body ?? {}) as { floorId?: string }
    if (!floorId) throw new ApiError(400, 'room/bulk requires a floorId')
    const rows = db
      .prepare('SELECT * FROM rooms WHERE tenant_id = ? AND floor_id = ?')
      .all(tenantId, floorId) as any[]
    return { data: rows.map(roomRowToDoc), permissions: {} }
  })
}
