import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('vlan/wlan routes', () => {
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

  it('creates and lists a vlan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/vlan`,
      headers: AUTH,
      payload: { vlanId: 10, name: 'Default' }
    })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/vlan`, headers: AUTH })
    expect(list.json().data.docs[0].vlanId).toBe(10)
  })

  it('creates and lists a wlan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/wlan`,
      headers: AUTH,
      payload: { ssid: 'Amulet-Staff', security: 'wpa2' }
    })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/wlan`, headers: AUTH })
    expect(list.json().data.docs[0].ssid).toBe('Amulet-Staff')
  })

  it('does not list vlans belonging to another tenant', async () => {
    await app.inject({
      method: 'POST',
      url: '/tenant/tenant-2/vlan',
      headers: AUTH,
      payload: { vlanId: 99, name: 'Other tenant vlan' }
    })
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/vlan`, headers: AUTH })
    expect(res.json().data.totalDocs).toBe(0)
  })

  it('GET/PATCH/DELETE on a vlan reject a mismatched tenantId in the URL (404, no mutation)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/vlan`,
      headers: AUTH,
      payload: { vlanId: 10, name: 'Default' }
    })
    const vlanId = created.json().data._id

    for (const [method, payload] of [
      ['GET', undefined],
      ['PATCH', { name: 'Hijacked' }],
      ['DELETE', undefined]
    ] as const) {
      const res = await app.inject({
        method,
        url: `/tenant/tenant-2/vlan/${vlanId}`,
        headers: AUTH,
        ...(payload ? { payload } : {})
      })
      expect(res.statusCode, `${method} under the wrong tenant`).toBe(404)
    }

    // Neither modified nor deleted.
    const stillThere = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/vlan/${vlanId}`, headers: AUTH })
    expect(stillThere.statusCode).toBe(200)
    expect(stillThere.json().data.name).toBe('Default')
  })

  // wlan uses the same factory and the same scope config; one direct check
  // guards against the registration itself losing its scope.
  it('GET on a wlan rejects a mismatched tenantId in the URL (404)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/wlan`,
      headers: AUTH,
      payload: { ssid: 'Amulet-Staff' }
    })
    const wlanId = created.json().data._id

    const res = await app.inject({ method: 'GET', url: `/tenant/tenant-2/wlan/${wlanId}`, headers: AUTH })
    expect(res.statusCode).toBe(404)
  })

  it('GET on an unknown vlan id returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/vlan/no-such-id`, headers: AUTH })
    expect(res.statusCode).toBe(404)
  })
})
