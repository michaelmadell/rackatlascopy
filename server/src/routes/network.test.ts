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
})
