import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('device routes', () => {
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

  it('creates and reads back a device with JSON port data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch 1', type: 'switch', heightU: 1, ports: [{ number: '1', type: 'rj45' }] }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.ports).toEqual([{ number: '1', type: 'rj45' }])
  })

  it('POST /device/bulk creates several devices', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/bulk`,
      headers: AUTH,
      payload: { devices: [{ name: 'D1', type: 'switch' }, { name: 'D2', type: 'patch-panel' }] }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(2)
  })

  it('POST /device/bulk ignores a spoofed tenantId in the request body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/bulk`,
      headers: AUTH,
      payload: { devices: [{ name: 'D1', type: 'switch', tenantId: 'tenant-2' }] }
    })
    expect(res.statusCode).toBe(200)
    const created = res.json().data[0]
    expect(created.tenantId).toBe(TENANT_ID)

    const row = db.prepare('SELECT tenant_id FROM devices WHERE id = ?').get(created.id) as { tenant_id: string }
    expect(row.tenant_id).toBe(TENANT_ID)

    const listedUnderTenant1 = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device`, headers: AUTH })
    expect(listedUnderTenant1.json().data.totalDocs).toBe(1)

    const listedUnderTenant2 = await app.inject({ method: 'GET', url: '/tenant/tenant-2/device', headers: AUTH })
    expect(listedUnderTenant2.json().data.totalDocs).toBe(0)
  })

  it('POST /device/:rackId/deactivate clears rackId on child devices', async () => {
    const rack = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Rack 1', type: 'rack' }
    })
    const rackId = rack.json().data._id
    const child = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch in rack', type: 'switch', rackId }
    })
    const childId = child.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/${rackId}/deactivate`,
      headers: AUTH
    })
    expect(res.statusCode).toBe(200)

    const after = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device/${childId}`, headers: AUTH })
    expect(after.json().data.rackId).toBeNull()
  })

  it('POST /device/:rackId/deactivate is scoped to the URL tenantId and does not affect another tenant', async () => {
    const rack = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Rack 1', type: 'rack' }
    })
    const rackId = rack.json().data._id
    const child = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch in rack', type: 'switch', rackId }
    })
    const childId = child.json().data._id

    // Attempting to deactivate the rack under a different tenant must not
    // clear rackId on tenant-1's device.
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/tenant-2/device/${rackId}/deactivate`,
      headers: AUTH
    })
    expect(res.statusCode).toBe(200)

    const after = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device/${childId}`, headers: AUTH })
    expect(after.json().data.rackId).toBe(rackId)
  })

  it('does not return devices scoped to a different tenant', async () => {
    await app.inject({
      method: 'POST',
      url: '/tenant/tenant-2/device',
      headers: AUTH,
      payload: { name: 'Other Device', type: 'switch' }
    })
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device`, headers: AUTH })
    expect(res.json().data.totalDocs).toBe(0)
  })

  it('GET/PATCH/DELETE on a device reject a mismatched tenantId in the URL (404, no mutation)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch 1', type: 'switch' }
    })
    const deviceId = created.json().data._id

    const getWrongTenant = await app.inject({
      method: 'GET',
      url: `/tenant/tenant-2/device/${deviceId}`,
      headers: AUTH
    })
    expect(getWrongTenant.statusCode).toBe(404)

    const patchWrongTenant = await app.inject({
      method: 'PATCH',
      url: `/tenant/tenant-2/device/${deviceId}`,
      headers: AUTH,
      payload: { name: 'Hijacked' }
    })
    expect(patchWrongTenant.statusCode).toBe(404)

    const deleteWrongTenant = await app.inject({
      method: 'DELETE',
      url: `/tenant/tenant-2/device/${deviceId}`,
      headers: AUTH
    })
    expect(deleteWrongTenant.statusCode).toBe(404)

    const stillThere = await app.inject({
      method: 'GET',
      url: `/tenant/${TENANT_ID}/device/${deviceId}`,
      headers: AUTH
    })
    expect(stillThere.statusCode).toBe(200)
    expect(stillThere.json().data.name).toBe('Switch 1')
  })
})
