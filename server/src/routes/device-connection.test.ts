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

  // The app's create shape, taken verbatim from
  // t.$tenantId.locations.$locationId.devices.$deviceId.tsx:574-582.
  const CREATE_ITEM = {
    locationId: 'loc-1',
    device1Id: 'd1',
    device2Id: 'd2',
    port1Name: '01',
    port2Name: '02',
    direction: 'front-external',
    connectionType: 'fibre'
  }

  async function batch(tenantId: string, body: Record<string, unknown>) {
    return app.inject({
      method: 'POST',
      url: `/tenant/${tenantId}/device-connection/batch`,
      headers: AUTH,
      payload: body
    })
  }

  describe('POST .../batch (transactional create + delete)', () => {
    it('creates from `create` under the app\'s field names and echoes them back', async () => {
      const res = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
      expect(res.statusCode).toBe(200)

      const created = res.json().data.created
      expect(created).toHaveLength(1)
      expect(created[0]).toMatchObject({
        device1Id: 'd1',
        device2Id: 'd2',
        port1Name: '01',
        port2Name: '02',
        direction: 'front-external',
        connectionType: 'fibre',
        locationId: 'loc-1'
      })
      // Both vocabularies, since the codebase reads each in different places.
      expect(created[0].fromDeviceId).toBe('d1')
      expect(created[0].toPort).toBe('02')
      expect(created[0]._id).toBe(created[0].id)

      const row = db.prepare('SELECT * FROM device_connections WHERE id = ?').get(created[0]._id) as any
      expect(row.from_device_id).toBe('d1')
      expect(row.direction).toBe('front-external')
      expect(row.type).toBe('fibre')
      expect(row.tenant_id).toBe(TENANT_ID)
    })

    it('deletes the ids in `delete` and reports them', async () => {
      const created = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
      const connectionId = created.json().data.created[0]._id

      const res = await batch(TENANT_ID, { create: [], delete: [connectionId] })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.deleted).toEqual([connectionId])
      expect(db.prepare('SELECT COUNT(*) AS n FROM device_connections').get()).toEqual({ n: 0 })
    })

    it('writes the connection id onto both ports\' deviceConnectionIds — this is the only way the app discovers a connection exists', async () => {
      const mkDevice = async (name: string, portNumber: string) => {
        const res = await app.inject({
          method: 'POST',
          url: `/tenant/${TENANT_ID}/device`,
          headers: AUTH,
          payload: { name, deviceType: 'switch', elements: [{ id: 'el-1', kind: 'port', side: 'front', col: 0, row: 0, number: portNumber }] }
        })
        return res.json().data._id as string
      }
      const d1 = await mkDevice('D1', '01')
      const d2 = await mkDevice('D2', '02')

      const res = await batch(TENANT_ID, {
        create: [{ ...CREATE_ITEM, device1Id: d1, device2Id: d2, port1Name: '01', port2Name: '02' }],
        delete: []
      })
      const connectionId = res.json().data.created[0]._id

      const get = (id: string) => app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device/${id}`, headers: AUTH })
      const d1Elements = (await get(d1)).json().data.elements
      const d2Elements = (await get(d2)).json().data.elements
      expect(d1Elements[0].deviceConnectionIds).toEqual([connectionId])
      expect(d2Elements[0].deviceConnectionIds).toEqual([connectionId])

      // Deleting pulls the id back off both ports.
      await batch(TENANT_ID, { create: [], delete: [connectionId] })
      const d1After = (await get(d1)).json().data.elements
      const d2After = (await get(d2)).json().data.elements
      expect(d1After[0].deviceConnectionIds).toEqual([])
      expect(d2After[0].deviceConnectionIds).toEqual([])
    })

    it('leaves elements alone when the connection points at a device or port that does not exist', async () => {
      // insertConnection must not throw just because the endpoint device (or
      // its matching port) isn't real — a plain device_connections row is
      // still a valid outcome for callers that never look at elements.
      const res = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
      expect(res.statusCode).toBe(200)
    })

    it('applies create and delete in one call', async () => {
      const first = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
      const oldId = first.json().data.created[0]._id

      const res = await batch(TENANT_ID, {
        create: [{ ...CREATE_ITEM, device1Id: 'd3' }],
        delete: [oldId]
      })
      expect(res.json().data.created[0].device1Id).toBe('d3')
      expect(res.json().data.deleted).toEqual([oldId])

      const remaining = db.prepare('SELECT from_device_id FROM device_connections').all() as any[]
      expect(remaining).toEqual([{ from_device_id: 'd3' }])
    })

    it('rolls the whole batch back when a create fails', async () => {
      const first = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
      const oldId = first.json().data.created[0]._id

      // A non-scalar for a scalar column makes better-sqlite3 throw mid-batch.
      const res = await batch(TENANT_ID, {
        create: [{ ...CREATE_ITEM, device1Id: 'd3' }, { ...CREATE_ITEM, device1Id: { nope: true } }],
        delete: [oldId]
      })
      expect(res.statusCode).toBe(500)

      // Neither the delete nor the first insert may survive a failed batch.
      const rows = db.prepare('SELECT id FROM device_connections').all() as { id: string }[]
      expect(rows.map((r) => r.id)).toEqual([oldId])
    })

    it('answers the app\'s hasCassetteChanges() probe', async () => {
      const res = await batch(TENANT_ID, { create: [], delete: [] })
      expect(res.json().hasChanges).toBe(false)
    })

    it('builds the response from the persisted row, not the raw request body', async () => {
      const res = await batch(TENANT_ID, {
        create: [{ ...CREATE_ITEM, tenantId: 'tenant-2', bogus: 'x' }],
        delete: []
      })
      expect(res.statusCode).toBe(200)
      const created = res.json().data.created[0]
      expect(created.bogus).toBeUndefined()
      expect(created.tenantId).toBe(TENANT_ID)

      const row = db.prepare('SELECT tenant_id FROM device_connections WHERE id = ?').get(created.id) as {
        tenant_id: string
      }
      expect(row.tenant_id).toBe(TENANT_ID)
    })

    it('cannot delete another tenant\'s connection', async () => {
      const created = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
      const connectionId = created.json().data.created[0]._id

      const res = await batch('tenant-2', { create: [], delete: [connectionId] })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.deleted).toEqual([])
      expect(db.prepare('SELECT COUNT(*) AS n FROM device_connections').get()).toEqual({ n: 1 })
    })
  })

  describe('POST .../bulk (fetch connections by id)', () => {
    it('returns exactly the requested ids', async () => {
      const created = await batch(TENANT_ID, {
        create: [CREATE_ITEM, { ...CREATE_ITEM, device1Id: 'd3' }, { ...CREATE_ITEM, device1Id: 'd4' }],
        delete: []
      })
      const [a, b] = created.json().data.created.map((c: { _id: string }) => c._id)

      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device-connection/bulk`,
        headers: AUTH,
        payload: { ids: [a, b] }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.map((c: { _id: string }) => c._id).sort()).toEqual([a, b].sort())
      // index.tsx:224 filters on `direction`, so it has to come back.
      expect(res.json().data[0].direction).toBe('front-external')
    })

    it('creates nothing — it is a read', async () => {
      await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device-connection/bulk`,
        headers: AUTH,
        payload: { ids: ['no-such-id'] }
      })
      expect(db.prepare('SELECT COUNT(*) AS n FROM device_connections').get()).toEqual({ n: 0 })
    })

    it('returns an empty list for an empty id list', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device-connection/bulk`,
        headers: AUTH,
        payload: { ids: [] }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toEqual([])
    })

    it('rejects a body with no ids array', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device-connection/bulk`,
        headers: AUTH,
        payload: {}
      })
      expect(res.statusCode).toBe(400)
    })

    it('will not read another tenant\'s connections, even by exact id', async () => {
      const created = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
      const connectionId = created.json().data.created[0]._id

      const res = await app.inject({
        method: 'POST',
        url: '/tenant/tenant-2/device-connection/bulk',
        headers: AUTH,
        payload: { ids: [connectionId] }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toEqual([])
    })
  })

  // index.tsx:228-232 calls this inside the same Promise.all as device/bulk,
  // so a 404 here took the whole floor view down with it.
  describe('POST .../building-pairs', () => {
    it('returns the rack pairs that share a connection', async () => {
      await batch(TENANT_ID, {
        create: [{ ...CREATE_ITEM, device1Id: 'rack-a', device2Id: 'rack-b' }],
        delete: []
      })
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device-connection/building-pairs`,
        headers: AUTH,
        payload: { rackIds: ['rack-a', 'rack-b', 'rack-c'] }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toEqual([{ rack1Id: 'rack-a', rack2Id: 'rack-b' }])
    })

    it('does not pair racks across a tenant boundary', async () => {
      await batch(TENANT_ID, {
        create: [{ ...CREATE_ITEM, device1Id: 'rack-a', device2Id: 'rack-b' }],
        delete: []
      })
      const res = await app.inject({
        method: 'POST',
        url: '/tenant/tenant-2/device-connection/building-pairs',
        headers: AUTH,
        payload: { rackIds: ['rack-a', 'rack-b'] }
      })
      expect(res.json().data).toEqual([])
    })

    it('returns an empty list for fewer than two racks', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device-connection/building-pairs`,
        headers: AUTH,
        payload: { rackIds: ['rack-a'] }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data).toEqual([])
    })
  })

  it('PATCH updates a connection and DELETE removes it', async () => {
    const created = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
    const connectionId = created.json().data.created[0]._id

    const patched = await app.inject({
      method: 'PATCH',
      url: `/tenant/${TENANT_ID}/device-connection/${connectionId}`,
      headers: AUTH,
      payload: { cableColor: 'red' }
    })
    expect(patched.json().data.cableColor).toBe('red')

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/tenant/${TENANT_ID}/device-connection/${connectionId}`,
      headers: AUTH
    })
    expect(deleted.json()).toEqual({ success: true })
  })

  it('the standalone DELETE route also unlinks the connection from both ports\' elements', async () => {
    const mkDevice = async (name: string, portNumber: string) => {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device`,
        headers: AUTH,
        payload: { name, deviceType: 'switch', elements: [{ id: 'el-1', kind: 'port', side: 'front', col: 0, row: 0, number: portNumber }] }
      })
      return res.json().data._id as string
    }
    const d1 = await mkDevice('D1', '01')
    const d2 = await mkDevice('D2', '02')

    const created = await batch(TENANT_ID, {
      create: [{ ...CREATE_ITEM, device1Id: d1, device2Id: d2, port1Name: '01', port2Name: '02' }],
      delete: []
    })
    const connectionId = created.json().data.created[0]._id

    await app.inject({ method: 'DELETE', url: `/tenant/${TENANT_ID}/device-connection/${connectionId}`, headers: AUTH })

    const get = (id: string) => app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device/${id}`, headers: AUTH })
    expect((await get(d1)).json().data.elements[0].deviceConnectionIds).toEqual([])
    expect((await get(d2)).json().data.elements[0].deviceConnectionIds).toEqual([])
  })

  it('a connection created under one tenant is invisible/unpatchable/undeletable via another tenant URL', async () => {
    const res = await batch(TENANT_ID, { create: [CREATE_ITEM], delete: [] })
    const connectionId = res.json().data.created[0]._id

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
