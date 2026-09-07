import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('customer routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>
  let customerId: string
  let otherUserId: string
  let otherCustomerId: string
  let otherCustomerUserId: string

  beforeEach(() => {
    db = openDb(':memory:')
    customerId = 'cust-amulet'
    db.prepare('INSERT INTO customers (id, name, billing_json) VALUES (?, ?, ?)').run(
      customerId,
      'Amulet',
      JSON.stringify({ subscriptionStatus: 'active', plan: 'enterprise', validUntil: '2027-12-31' })
    )
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, customerId)
    otherUserId = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(otherUserId, 'member@example.com', bcrypt.hashSync('x', 10), 'Member', 'member', 0, customerId)

    // Setup second customer with a user for cross-customer tests
    otherCustomerId = 'cust-other'
    db.prepare('INSERT INTO customers (id, name, billing_json) VALUES (?, ?, ?)').run(
      otherCustomerId,
      'Other Corp',
      JSON.stringify({ subscriptionStatus: 'active', plan: 'pro' })
    )
    otherCustomerUserId = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(otherCustomerUserId, 'other@example.com', bcrypt.hashSync('x', 10), 'Other Member', 'member', 0, otherCustomerId)

    app = buildApp({ db, jwtSecret: SECRET })
  })

  // hooks/useActivityLogs.tsx:81-91 feeds the activity-log resource-filter
  // dropdown from this route; it 404'd before.
  describe('GET /customer/:id/resources', () => {
    beforeEach(() => {
      db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run('tenant-1', 'HOME', customerId)
      db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run('tenant-2', 'AWAY', customerId)
      db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(
        'tenant-x',
        'FOREIGN',
        otherCustomerId
      )
      db.prepare('INSERT INTO locations (id, tenant_id, name, reference) VALUES (?, ?, ?, ?)').run(
        'loc-1',
        'tenant-1',
        'HQ',
        'HQ-01'
      )
      db.prepare('INSERT INTO locations (id, tenant_id, name) VALUES (?, ?, ?)').run('loc-2', 'tenant-2', 'Depot')
      db.prepare('INSERT INTO locations (id, tenant_id, name) VALUES (?, ?, ?)').run('loc-x', 'tenant-x', 'Foreign')
      db.prepare('INSERT INTO vlans (id, tenant_id, name) VALUES (?, ?, ?)').run('vlan-1', 'tenant-1', 'Default')
      db.prepare('INSERT INTO wlans (id, tenant_id, ssid) VALUES (?, ?, ?)').run('wlan-1', 'tenant-1', 'Staff')
    })

    it('returns resources keyed by type, narrowed to the requested tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/customer/${customerId}/resources?tenantId=tenant-1`,
        headers: AUTH
      })
      expect(res.statusCode).toBe(200)
      const data = res.json().data

      // The hook iterates these exact keys (RESOURCE_TYPE_KEYS, :13-21).
      expect(Object.keys(data).sort()).toEqual(
        ['devices', 'floors', 'locations', 'rooms', 'tenants', 'vlans', 'wlans'].sort()
      )
      expect(data.locations).toEqual([{ _id: 'loc-1', id: 'loc-1', reference: 'HQ-01', fullReference: 'HQ-01' }])
      expect(data.tenants.map((t: { _id: string }) => t._id)).toEqual(['tenant-1'])
      // vlan is labelled by `name`, wlan by `ssid` (:493-494).
      expect(data.vlans).toEqual([{ _id: 'vlan-1', id: 'vlan-1', name: 'Default' }])
      expect(data.wlans).toEqual([{ _id: 'wlan-1', id: 'wlan-1', ssid: 'Staff' }])
    })

    it('never leaks another customer\'s resources', async () => {
      const all = await app.inject({ method: 'GET', url: `/customer/${customerId}/resources`, headers: AUTH })
      const ids = all.json().data.locations.map((l: { _id: string }) => l._id).sort()
      expect(ids).toEqual(['loc-1', 'loc-2'])

      // Asking for a tenant outside the customer yields nothing, not the
      // tenant's data.
      const foreign = await app.inject({
        method: 'GET',
        url: `/customer/${customerId}/resources?tenantId=tenant-x`,
        headers: AUTH
      })
      expect(foreign.json().data.tenants).toEqual([])
      expect(foreign.json().data.locations).toEqual([])
    })

    it('returns 404 for an unknown customer', async () => {
      const res = await app.inject({ method: 'GET', url: '/customer/unknown-id/resources', headers: AUTH })
      expect(res.statusCode).toBe(404)
    })
  })

  it('GET /customer/:id returns billing with an active subscription', async () => {
    const res = await app.inject({ method: 'GET', url: `/customer/${customerId}`, headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.billing.subscriptionStatus).toBe('active')
    expect(res.json().data.billing.plan).toBe('enterprise')
  })

  // library.tsx:403/421 saves the whole custom-device-type list through this
  // route; the schema used to accept only `name`, so zod stripped the list,
  // the handler found nothing to update, and the user got a 200 for a
  // silently discarded save.
  it('PATCH /customer/:id persists customDeviceTypes', async () => {
    const customDeviceTypes = [
      { id: 'cdt-1', name: 'Blade Server', prefix: 'BS' },
      { id: 'cdt-2', name: 'Media Converter', prefix: 'MC' }
    ]
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}`,
      headers: AUTH,
      payload: { customDeviceTypes }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.customDeviceTypes).toEqual(customDeviceTypes)

    // Persisted, not merely echoed.
    const reread = await app.inject({ method: 'GET', url: `/customer/${customerId}`, headers: AUTH })
    expect(reread.json().data.customDeviceTypes).toEqual(customDeviceTypes)
  })

  // library.tsx:258/278/292/294 — an array of { deviceType, prefix }, not a
  // map: the page calls .find/.filter on it directly.
  it('PATCH /customer/:id persists standardDeviceTypePrefixes', async () => {
    const standardDeviceTypePrefixes = [
      { deviceType: 'rack', prefix: 'RK' },
      { deviceType: 'switch', prefix: 'SW' }
    ]
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}`,
      headers: AUTH,
      payload: { standardDeviceTypePrefixes }
    })
    expect(res.statusCode).toBe(200)

    const reread = await app.inject({ method: 'GET', url: `/customer/${customerId}`, headers: AUTH })
    expect(reread.json().data.standardDeviceTypePrefixes).toEqual(standardDeviceTypePrefixes)
  })

  // The crash this test guards: before this field defaulted to `[]`, a
  // freshly-seeded customer with no prefixes ever saved returned `{}`, and
  // the Device Library page's `.find()` call on it threw on first render.
  it('GET /customer/:id defaults standardDeviceTypePrefixes to an empty array, not {}', async () => {
    const res = await app.inject({ method: 'GET', url: `/customer/${customerId}`, headers: AUTH })
    expect(res.json().data.standardDeviceTypePrefixes).toEqual([])
  })

  it('PATCH /customer/:id rejects an unrecognized field rather than dropping it', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}`,
      headers: AUTH,
      payload: { notAField: 'x' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('PATCH /customer/:id updates name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}`,
      headers: AUTH,
      payload: { name: 'Amulet Hot Key' }
    })
    expect(res.json().data.name).toBe('Amulet Hot Key')
  })

  it('PATCH /customer/:id/owner flips isCustomerAdmin on the target user', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}/owner`,
      headers: AUTH,
      payload: { userId: otherUserId }
    })
    expect(res.statusCode).toBe(200)
    const row = db.prepare('SELECT is_customer_admin FROM users WHERE id = ?').get(otherUserId) as any
    expect(row.is_customer_admin).toBe(1)
  })

  it('GET /icon/customer returns a success stub', async () => {
    const res = await app.inject({ method: 'GET', url: '/icon/customer', headers: AUTH })
    expect(res.json()).toEqual({ success: true, data: {} })
  })

  // Coverage Gap 1: Cross-customer owner-scoping negative test
  it('PATCH /customer/:id/owner rejects cross-customer user (404)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}/owner`,
      headers: AUTH,
      payload: { userId: otherCustomerUserId }
    })
    expect(res.statusCode).toBe(404)
    // Verify the other-customer user's flag is unchanged
    const row = db.prepare('SELECT is_customer_admin FROM users WHERE id = ?').get(otherCustomerUserId) as any
    expect(row.is_customer_admin).toBe(0)
  })

  // Coverage Gap 2: 404 tests for unknown resources
  it('GET /customer/:unknownId returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/customer/unknown-id', headers: AUTH })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.message).toContain('customer not found')
  })

  it('PATCH /customer/:unknownId returns 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/customer/unknown-id',
      headers: AUTH,
      payload: { name: 'Updated' }
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.message).toContain('customer not found')
  })

  it('PATCH /customer/:id/owner with unknown userId returns 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}/owner`,
      headers: AUTH,
      payload: { userId: 'unknown-user-id' }
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.message).toContain('user not found')
  })

  it('DELETE /customer/:unknownId returns 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/customer/unknown-id',
      headers: AUTH
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.message).toContain('customer not found')
  })

  // Coverage Gap 3: GET /customer list and DELETE success path
  it('GET /customer returns list with pagination', async () => {
    const res = await app.inject({ method: 'GET', url: '/customer', headers: AUTH })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.docs).toHaveLength(2)
    expect(body.data.totalDocs).toBe(2)
    expect(body.data.totalPages).toBe(1)
    // Verify first customer is in the list
    const firstDoc = body.data.docs.find((doc: any) => doc.id === customerId)
    expect(firstDoc).toBeDefined()
    expect(firstDoc.name).toBe('Amulet')
    expect(firstDoc._id).toBe(customerId)
  })

  it('DELETE /customer/:id removes customer and returns success', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/customer/${customerId}`,
      headers: AUTH
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ success: true })
    // Verify customer is deleted
    const getRes = await app.inject({
      method: 'GET',
      url: `/customer/${customerId}`,
      headers: AUTH
    })
    expect(getRes.statusCode).toBe(404)
  })
})
