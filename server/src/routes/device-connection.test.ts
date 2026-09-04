import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('device-connection routes', () => {
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

  it('POST .../batch creates multiple connections and PATCH updates one', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device-connection/batch`,
      headers: AUTH,
      payload: {
        connections: [
          { fromDeviceId: 'd1', fromPort: '1', toDeviceId: 'd2', toPort: '1', cableColor: 'blue' }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const connectionId = res.json().data[0]._id

    const patched = await app.inject({
      method: 'PATCH',
      url: `/tenant/${TENANT_ID}/device-connection/${connectionId}`,
      headers: AUTH,
      payload: { cableColor: 'red' }
    })
    expect(patched.json().data.cableColor).toBe('red')
  })

  it('POST .../bulk creates connections and DELETE removes one', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device-connection/bulk`,
      headers: AUTH,
      payload: {
        connections: [{ fromDeviceId: 'd3', fromPort: '2', toDeviceId: 'd4', toPort: '2' }]
      }
    })
    const connectionId = res.json().data[0]._id

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/tenant/${TENANT_ID}/device-connection/${connectionId}`,
      headers: AUTH
    })
    expect(deleted.json()).toEqual({ success: true })
  })

  it('POST .../batch builds the response from the persisted row, not the raw request body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device-connection/batch`,
      headers: AUTH,
      payload: {
        connections: [
          { fromDeviceId: 'd1', fromPort: '1', toDeviceId: 'd2', toPort: '1', tenantId: 'tenant-2', bogus: 'x' }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const created = res.json().data[0]
    expect(created.bogus).toBeUndefined()

    const row = db.prepare('SELECT tenant_id FROM device_connections WHERE id = ?').get(created.id) as {
      tenant_id: string
    }
    expect(row.tenant_id).toBe(TENANT_ID)
  })

  it('a connection created under one tenant is invisible/unpatchable/undeletable via another tenant URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device-connection/batch`,
      headers: AUTH,
      payload: {
        connections: [{ fromDeviceId: 'd1', fromPort: '1', toDeviceId: 'd2', toPort: '1' }]
      }
    })
    const connectionId = res.json().data[0]._id

    const patchWrongTenant = await app.inject({
      method: 'PATCH',
      url: `/tenant/tenant-2/device-connection/${connectionId}`,
      headers: AUTH,
      payload: { cableColor: 'hijacked' }
    })
    expect(patchWrongTenant.statusCode).toBe(404)

    const deleteWrongTenant = await app.inject({
      method: 'DELETE',
      url: `/tenant/tenant-2/device-connection/${connectionId}`,
      headers: AUTH
    })
    expect(deleteWrongTenant.statusCode).toBe(404)

    const row = db.prepare('SELECT cable_color FROM device_connections WHERE id = ?').get(connectionId) as {
      cable_color: string | null
    }
    expect(row.cable_color).toBeNull()
  })
})
