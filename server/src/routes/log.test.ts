import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('GET /log', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    // The mock-dev-access-token used by AUTH resolves to the first seeded user
    // (see auth/middleware.ts) — every protected-route test file seeds one.
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
    const insert = db.prepare(
      `INSERT INTO logs (id, tenant_id, action, resource, resource_id, resource_data_json, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    insert.run(randomUUID(), 'tenant-1', 'create', 'device', 'dev-1', '{}', 'usr-1', new Date().toISOString())
    insert.run(randomUUID(), 'tenant-1', 'delete', 'vlan', 'vlan-1', '{}', 'usr-1', new Date().toISOString())
    insert.run(randomUUID(), 'tenant-2', 'create', 'device', 'dev-9', '{}', 'usr-9', new Date().toISOString())
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('filters by tenantId', async () => {
    const res = await app.inject({ method: 'GET', url: '/log?tenantId=tenant-1&page=1&limit=10&sort=-createdAt', headers: AUTH })
    expect(res.json().data.docs).toHaveLength(2)
  })

  // Plan-wide constraint: every document echoes both _id and id.
  it('echoes both _id and id on every log document', async () => {
    const res = await app.inject({ method: 'GET', url: '/log?tenantId=tenant-1', headers: AUTH })
    const docs = res.json().data.docs as Array<{ _id: string; id: string }>
    expect(docs.length).toBeGreaterThan(0)
    for (const doc of docs) {
      expect(doc.id).toBeDefined()
      expect(doc.id).toBe(doc._id)
    }
  })

  it('filters by resource, including $in: lists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/log?tenantId=tenant-1&resource=$in:device,vlan&page=1&limit=10&sort=-createdAt',
      headers: AUTH
    })
    expect(res.json().data.docs).toHaveLength(2)
  })
})
