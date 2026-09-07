import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('custom-rack-device routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>
  let deviceId: string

  beforeEach(() => {
    db = openDb(':memory:')
    // The mock-dev-access-token used by AUTH resolves to the first seeded user
    // (see auth/middleware.ts) — every protected-route test file seeds one.
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
    deviceId = randomUUID()
    db.prepare(
      `INSERT INTO custom_rack_devices (id, name, brand, type, rack_units, ports_count, ports_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(deviceId, 'Catalyst 2960-X 24TS-L', 'Cisco', 'switch', 1, 28, '[]')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('lists the catalog', async () => {
    const res = await app.inject({ method: 'GET', url: '/custom-rack-device', headers: AUTH })
    expect(res.json().data.docs).toHaveLength(1)
  })

  it('gets one catalog entry', async () => {
    const res = await app.inject({ method: 'GET', url: `/custom-rack-device/${deviceId}`, headers: AUTH })
    expect(res.json().data.brand).toBe('Cisco')
  })

  // library.tsx's table reads manufacturer/deviceType/height, not
  // brand/type/rackUnits — same underlying columns, aliased.
  it('also exposes manufacturer/deviceType/height, the names the Device Library page reads', async () => {
    const res = await app.inject({ method: 'GET', url: `/custom-rack-device/${deviceId}`, headers: AUTH })
    const doc = res.json().data
    expect(doc.manufacturer).toBe('Cisco')
    expect(doc.deviceType).toBe('switch')
    expect(doc.height).toBe(1)
  })

  it('creates a catalog entry via the manufacturer/deviceType/height/ports aliases', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/custom-rack-device',
      headers: AUTH,
      payload: {
        name: 'New Switch',
        manufacturer: 'Cisco',
        deviceType: 'switch',
        height: 2,
        portsCount: 2,
        ports: [
          { number: '01', type: 'copper', row: 0, col: 0 },
          { number: '02', type: 'copper', row: 0, col: 1 }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const doc = res.json().data
    expect(doc.manufacturer).toBe('Cisco')
    expect(doc.deviceType).toBe('switch')
    expect(doc.height).toBe(2)
    expect(doc.ports).toHaveLength(2)

    const list = await app.inject({ method: 'GET', url: '/custom-rack-device', headers: AUTH })
    expect(list.json().data.docs).toHaveLength(2)
  })

  it('updates a catalog entry', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/custom-rack-device/${deviceId}`,
      headers: AUTH,
      payload: { name: 'Renamed' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('Renamed')
  })

  it('deletes a catalog entry', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/custom-rack-device/${deviceId}`, headers: AUTH })
    expect(res.statusCode).toBe(200)

    const list = await app.inject({ method: 'GET', url: '/custom-rack-device', headers: AUTH })
    expect(list.json().data.docs).toHaveLength(0)
  })
})
