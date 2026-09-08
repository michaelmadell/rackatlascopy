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

  // POST /device/bulk is a READ despite the verb. Two body shapes, both
  // confirmed against the app: { floorId, attachDevicePermissions } at
  // t.$tenantId.locations.$locationId.index.tsx:186-194 and { rackDeviceId }
  // at ...devices.$deviceId.tsx:102-104.
  describe('POST /tenant/:tenantId/device/bulk (list devices)', () => {
    async function makeDevice(tenantId: string, payload: Record<string, unknown>) {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${tenantId}/device`,
        headers: AUTH,
        payload
      })
      expect(res.statusCode).toBe(200)
      return res.json().data._id as string
    }

    it('lists devices on a floor, both floor-scoped and room-scoped ones', async () => {
      const room = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/room`,
        headers: AUTH,
        payload: { name: 'Server Room', floorId: 'flr-1' }
      })
      const roomId = room.json().data._id

      await makeDevice(TENANT_ID, { name: 'Direct', deviceType: 'rack', floorId: 'flr-1' })
      await makeDevice(TENANT_ID, { name: 'ViaRoom', deviceType: 'rack', roomId })
      await makeDevice(TENANT_ID, { name: 'OtherFloor', deviceType: 'rack', floorId: 'flr-2' })

      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1', attachDevicePermissions: true }
      })
      expect(res.statusCode).toBe(200)
      const names = res.json().data.map((d: { name: string }) => d.name).sort()
      expect(names).toEqual(['Direct', 'ViaRoom'])
      expect(res.json().permissions).toEqual({})
    })

    it('lists the sub-devices of one rack when given a rackDeviceId', async () => {
      const rackId = await makeDevice(TENANT_ID, { name: 'Rack 1', deviceType: 'rack' })
      await makeDevice(TENANT_ID, { name: 'Sub A', deviceType: 'switch', rackDeviceId: rackId })
      await makeDevice(TENANT_ID, { name: 'Sub B', deviceType: 'switch', rackDeviceId: rackId })
      await makeDevice(TENANT_ID, { name: 'Unracked', deviceType: 'switch' })

      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: { rackDeviceId: rackId }
      })
      expect(res.statusCode).toBe(200)
      const names = res.json().data.map((d: { name: string }) => d.name).sort()
      expect(names).toEqual(['Sub A', 'Sub B'])
    })

    it('echoes the field names the app reads: deviceType, elements, rackUnitsCount', async () => {
      const elements = [{ id: 'p1', deviceConnectionIds: ['c1'] }]
      await makeDevice(TENANT_ID, {
        name: 'Rack 1',
        deviceType: 'rack',
        rackUnitsCount: 42,
        floorId: 'flr-1',
        elements
      })
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1' }
      })
      const device = res.json().data[0]
      expect(device.deviceType).toBe('rack')
      expect(device.rackUnitsCount).toBe(42)
      expect(device.elements).toEqual(elements)
    })

    it('links a placed device back to its CustomRackDevice template, alongside elements', async () => {
      const elements = [{ id: 'p1', kind: 'port', side: 'front', col: 0, row: 0, portType: 'copper' }]
      await makeDevice(TENANT_ID, {
        name: 'Switch 1',
        deviceType: 'switch',
        floorId: 'flr-1',
        customRackDeviceId: 'crd-1',
        elements
      })
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1' }
      })
      const device = res.json().data[0]
      expect(device.customRackDeviceId).toBe('crd-1')
      expect(device.elements).toEqual(elements)
    })

    it('creates nothing — it is a read', async () => {
      await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1' }
      })
      const count = db.prepare('SELECT COUNT(*) AS n FROM devices').get() as { n: number }
      expect(count.n).toBe(0)
    })

    it('never crosses the tenant boundary, by floorId or by rackDeviceId', async () => {
      const rackId = await makeDevice('tenant-2', { name: 'Other rack', deviceType: 'rack', floorId: 'flr-1' })
      await makeDevice('tenant-2', { name: 'Other sub', deviceType: 'switch', rackDeviceId: rackId })

      const byFloor = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: { floorId: 'flr-1' }
      })
      expect(byFloor.json().data).toEqual([])

      const byRack = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: { rackDeviceId: rackId }
      })
      expect(byRack.json().data).toEqual([])
    })

    it('rejects a body with neither floorId nor rackDeviceId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device/bulk`,
        headers: AUTH,
        payload: {}
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // t.$tenantId.racks.tsx:306 asks for racks only; returning every device
  // silently corrupted the rack CSV export.
  it('GET /device?deviceType=rack returns only racks and ignores unsupported params', async () => {
    for (const [name, deviceType] of [
      ['Rack 1', 'rack'],
      ['Rack 2', 'rack'],
      ['Switch 1', 'switch']
    ]) {
      await app.inject({
        method: 'POST',
        url: `/tenant/${TENANT_ID}/device`,
        headers: AUTH,
        payload: { name, deviceType }
      })
    }

    const res = await app.inject({
      method: 'GET',
      url: `/tenant/${TENANT_ID}/device?deviceType=rack&deletedAt=null&limit=10000&sort=-createdAt`,
      headers: AUTH
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.totalDocs).toBe(2)
    expect(res.json().data.docs.every((d: { deviceType: string }) => d.deviceType === 'rack')).toBe(true)
  })

  it('POST /device rejects an unrecognized field instead of silently dropping it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch 1', deviceType: 'switch', notAColumn: 'x' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('notAColumn')
  })

  it('POST /device ignores a tenantId in the body and scopes by the URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'D1', deviceType: 'switch', tenantId: 'tenant-2' }
    })
    expect(res.statusCode).toBe(200)
    // Response reflects the real (URL) scope, not the spoofed body value.
    expect(res.json().data.tenantId).toBe(TENANT_ID)
    const row = db.prepare('SELECT tenant_id FROM devices WHERE id = ?').get(res.json().data._id) as {
      tenant_id: string
    }
    expect(row.tenant_id).toBe(TENANT_ID)

    const listedUnderTenant2 = await app.inject({ method: 'GET', url: '/tenant/tenant-2/device', headers: AUTH })
    expect(listedUnderTenant2.json().data.totalDocs).toBe(0)
  })

  // A device fetched via GET /device/:id (not /device/bulk) used to have no
  // tenantId at all — the rack editor derives the tenant scope for its own
  // create/delete calls from this field, so a missing one silently broke
  // every rack-mounted device placement.
  it('GET /device/:id includes tenantId', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'D1', deviceType: 'switch' }
    })
    const id = created.json().data._id

    const got = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device/${id}`, headers: AUTH })
    expect(got.json().data.tenantId).toBe(TENANT_ID)
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
