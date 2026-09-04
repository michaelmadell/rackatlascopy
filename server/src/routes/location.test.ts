import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('location/floor/room routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(TENANT_ID, 'HOME', 'cust-1')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run('tenant-2', 'OTHER', 'cust-1')
    // The mock-dev-access-token used by AUTH resolves to the first seeded user
    // (see auth/middleware.ts) — every protected-route test file seeds one.
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('creates a location, floor, and room, scoped by tenantId', async () => {
    const location = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/location`,
      headers: AUTH,
      payload: { name: 'HQ', city: 'Newton Abbot', country: 'GB' }
    })
    expect(location.statusCode).toBe(200)
    const locationId = location.json().data._id

    const floor = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/floor`,
      headers: AUTH,
      payload: { name: 'Ground Floor', level: 0, locationId }
    })
    expect(floor.statusCode).toBe(200)
    const floorId = floor.json().data._id

    const room = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/room`,
      headers: AUTH,
      payload: { name: 'Server Room', floorId }
    })
    expect(room.statusCode).toBe(200)

    const listedLocations = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/location`, headers: AUTH })
    expect(listedLocations.json().data.totalDocs).toBe(1)

    const listedFloors = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/floor`, headers: AUTH })
    expect(listedFloors.json().data.docs[0].locationId).toBe(locationId)
  })

  it('does not return resources scoped to a different tenant', async () => {
    await app.inject({
      method: 'POST',
      url: '/tenant/tenant-2/location',
      headers: AUTH,
      payload: { name: 'Other HQ' }
    })
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/location`, headers: AUTH })
    expect(res.json().data.totalDocs).toBe(0)
  })

  it('GET/PATCH/DELETE on a location reject a mismatched tenantId in the URL (404, no mutation)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/location`,
      headers: AUTH,
      payload: { name: 'HQ', city: 'Newton Abbot', country: 'GB' }
    })
    const locationId = created.json().data._id

    const getWrongTenant = await app.inject({
      method: 'GET',
      url: `/tenant/tenant-2/location/${locationId}`,
      headers: AUTH
    })
    expect(getWrongTenant.statusCode).toBe(404)

    const patchWrongTenant = await app.inject({
      method: 'PATCH',
      url: `/tenant/tenant-2/location/${locationId}`,
      headers: AUTH,
      payload: { name: 'Hijacked' }
    })
    expect(patchWrongTenant.statusCode).toBe(404)

    const deleteWrongTenant = await app.inject({
      method: 'DELETE',
      url: `/tenant/tenant-2/location/${locationId}`,
      headers: AUTH
    })
    expect(deleteWrongTenant.statusCode).toBe(404)

    // Confirm the location was neither modified nor deleted.
    const stillThere = await app.inject({
      method: 'GET',
      url: `/tenant/${TENANT_ID}/location/${locationId}`,
      headers: AUTH
    })
    expect(stillThere.statusCode).toBe(200)
    expect(stillThere.json().data.name).toBe('HQ')
  })

  // POST /room/bulk is a READ despite the verb: the app posts
  // { floorId, attachRoomPermissions } to list one floor's rooms
  // (t.$tenantId.locations.$locationId.index.tsx:172-181).
  describe('POST /tenant/:tenantId/room/bulk (list rooms by floor)', () => {
    async function makeRoom(tenantId: string, name: string, floorId: string) {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${tenantId}/room`,
        headers: AUTH,
        payload: { name, floorId }
      })
      expect(res.statusCode).toBe(200)
      return res.json().data._id as string
    }

    it('returns the rooms of the requested floor, and nothing from other floors', async () => {
      await makeRoom(TENANT_ID, 'Room A', 'flr-1')
      await makeRoom(TENANT_ID, 'Room B', 'flr-1')
      await makeRoom(TENANT_ID, 'Elsewhere', 'flr-2')

      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/room/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1', attachRoomPermissions: true }
      })
      expect(res.statusCode).toBe(200)
      const names = res.json().data.map((r: { name: string }) => r.name).sort()
      expect(names).toEqual(['Room A', 'Room B'])
      // The app reads res.data.permissions; no permissions system here, so an
      // empty map keeps the destructure honest.
      expect(res.json().permissions).toEqual({})
    })

    it('creates nothing — it is a read', async () => {
      await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/room/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1' }
      })
      const count = db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as { n: number }
      expect(count.n).toBe(0)
    })

    it('never crosses the tenant boundary', async () => {
      await makeRoom('tenant-2', 'Other tenant room', 'flr-1')

      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/room/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1' }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toEqual([])
    })

    it('rejects a body with no floorId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/room/bulk`,
        headers: AUTH,
        payload: {}
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns floorPlanShapePoints, the field name the app reads', async () => {
      const roomId = await makeRoom(TENANT_ID, 'Shaped', 'flr-1')
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 }
      ]
      const patched = await app.inject({
        method: 'PATCH',
        url: `/tenant/${TENANT_ID}/room/${roomId}`,
        headers: AUTH,
        payload: { floorId: 'flr-1', floorPlanShapePoints: points }
      })
      expect(patched.statusCode).toBe(200)
      expect(patched.json().data.floorPlanShapePoints).toEqual(points)

      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/room/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1' }
      })
      expect(res.json().data[0].floorPlanShapePoints).toEqual(points)
    })
  })

  it('PATCH /room/:id rejects an unrecognized field instead of silently dropping it', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/room`,
      headers: AUTH,
      payload: { name: 'Server Room', floorId: 'flr-1' }
    })
    const roomId = created.json().data._id

    const res = await app.inject({
      method: 'PATCH',
      url: `/tenant/${TENANT_ID}/room/${roomId}`,
      headers: AUTH,
      payload: { nmae: 'typo' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('nmae')
  })

  it('GET /tenant/:tenantId/floor/:id/floor-plan returns bounds + rooms', async () => {
    const floor = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/floor`,
      headers: AUTH,
      payload: { name: 'Ground Floor', level: 0, locationId: 'loc-1', bounds: { width: 100, height: 80 } }
    })
    const floorId = floor.json().data._id
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/floor/${floorId}/floor-plan`, headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.bounds).toEqual({ width: 100, height: 80 })
  })
})
