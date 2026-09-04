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
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run('tenant-2', 'OTHER', 'cust-1')
    await app.inject({
      method: 'POST',
      url: '/tenant/tenant-2/location',
      headers: AUTH,
      payload: { name: 'Other HQ' }
    })
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/location`, headers: AUTH })
    expect(res.json().data.totalDocs).toBe(0)
  })

  it('POST /tenant/:tenantId/room/bulk creates multiple rooms', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/room/bulk`,
      headers: AUTH,
      payload: { rooms: [{ name: 'Room A', floorId: 'flr-1' }, { name: 'Room B', floorId: 'flr-1' }] }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(2)
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
