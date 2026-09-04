import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('move route', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(TENANT_ID, 'HOME', 'cust-1')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run('tenant-2', 'OTHER', 'cust-1')
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('moves a device to a new room/rack', async () => {
    const device = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch 1', type: 'switch', roomId: 'room-a' }
    })
    const deviceId = device.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/${deviceId}/move`,
      headers: AUTH,
      payload: { roomId: 'room-b', rackId: 'rack-9' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.roomId).toBe('room-b')
    expect(res.json().data.rackId).toBe('rack-9')
  })

  it('returns 400 for an unsupported type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/widget/some-id/move`,
      headers: AUTH,
      payload: {}
    })
    expect(res.statusCode).toBe(400)
  })

  it('moving a device across tenants (wrong URL tenantId) 404s and does not mutate', async () => {
    const device = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch 1', type: 'switch', roomId: 'room-a' }
    })
    const deviceId = device.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/tenant-2/device/${deviceId}/move`,
      headers: AUTH,
      payload: { roomId: 'room-b', rackId: 'rack-9' }
    })
    expect(res.statusCode).toBe(404)

    const after = await app.inject({
      method: 'GET',
      url: `/tenant/${TENANT_ID}/device/${deviceId}`,
      headers: AUTH
    })
    expect(after.json().data.roomId).toBe('room-a')
    expect(after.json().data.rackId).toBeNull()
  })

  it('moves a floor to a new location', async () => {
    const floor = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/floor`,
      headers: AUTH,
      payload: { name: 'Floor 1', locationId: 'loc-a' }
    })
    const floorId = floor.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/floor/${floorId}/move`,
      headers: AUTH,
      payload: { locationId: 'loc-b' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.locationId).toBe('loc-b')
  })

  it('returns 404 when moving a nonexistent id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/does-not-exist/move`,
      headers: AUTH,
      payload: { roomId: 'room-b' }
    })
    expect(res.statusCode).toBe(404)
  })
})
