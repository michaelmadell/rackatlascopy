import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('user routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>
  let userId: string

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare(
      `INSERT INTO customers (id, name, billing_json) VALUES (?, ?, ?)`
    ).run('cust-amulet', 'Amulet', JSON.stringify({ subscriptionStatus: 'active', plan: 'enterprise' }))
    userId = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, permissions_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-amulet', '[]')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('GET /user lists users scoped to the caller\'s own customer', async () => {
    const otherCustomerId = 'cust-other'
    db.prepare(`INSERT INTO customers (id, name, billing_json) VALUES (?, ?, ?)`).run(
      otherCustomerId,
      'Other Org',
      '{}'
    )
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, permissions_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'stranger@example.com', bcrypt.hashSync('x', 10), 'Stranger', 'admin', 1, otherCustomerId, '[]')

    const res = await app.inject({ method: 'GET', url: '/user', headers: AUTH })
    expect(res.statusCode).toBe(200)
    const emails = res.json().data.docs.map((d: any) => d.email)
    expect(emails).toContain('admin@example.com')
    expect(emails).not.toContain('stranger@example.com')
    expect(res.json().data.totalDocs).toBe(1)
  })

  it('GET /user?tenantId=... narrows to admins and users with a permission on that tenant', async () => {
    const memberWithAccess = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, permissions_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      memberWithAccess,
      'member-with-access@example.com',
      bcrypt.hashSync('x', 10),
      'Member',
      'member',
      0,
      'cust-amulet',
      JSON.stringify([{ resourceType: 'tenant', resourceId: 'tenant-1', role: 'member' }])
    )
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, permissions_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'no-access@example.com', bcrypt.hashSync('x', 10), 'NoAccess', 'member', 0, 'cust-amulet', '[]')

    const res = await app.inject({ method: 'GET', url: '/user?tenantId=tenant-1', headers: AUTH })
    expect(res.statusCode).toBe(200)
    const emails = res.json().data.docs.map((d: any) => d.email)
    expect(emails).toContain('admin@example.com') // customer admin sees every tenant
    expect(emails).toContain('member-with-access@example.com')
    expect(emails).not.toContain('no-access@example.com')
  })

  it('GET /user/self returns the authenticated user', async () => {
    const res = await app.inject({ method: 'GET', url: '/user/self', headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.email).toBe('admin@example.com')
    expect(res.json().data.customerId).toBe('cust-amulet')
  })

  it('POST /user creates a user with a hashed password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/user',
      headers: AUTH,
      payload: { email: 'new@example.com', name: 'New User', password: 'hunter2', customerId: 'cust-amulet' }
    })
    expect(res.statusCode).toBe(200)
    const created = res.json().data
    expect(created.email).toBe('new@example.com')
    expect(created.password).toBeUndefined()

    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(created._id) as any
    expect(await bcrypt.compare('hunter2', row.password_hash)).toBe(true)
  })

  it('PATCH /user/:id updates name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/user/${userId}`,
      headers: AUTH,
      payload: { name: 'Renamed' }
    })
    expect(res.json().data.name).toBe('Renamed')
  })

  it('POST /user/:id/password rehashes the password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/user/${userId}/password`,
      headers: AUTH,
      payload: { password: 'newpass123' }
    })
    expect(res.statusCode).toBe(200)
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any
    expect(await bcrypt.compare('newpass123', row.password_hash)).toBe(true)
  })

  it('DELETE /user/:id removes the user', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/user/${userId}`, headers: AUTH })
    expect(res.json()).toEqual({ success: true })
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(userId)).toBeUndefined()
  })

  it('POST /user/:id/avatar returns 404 for unknown user', async () => {
    const unknownId = randomUUID()
    const res = await app.inject({
      method: 'POST',
      url: `/user/${unknownId}/avatar`,
      headers: AUTH
    })
    expect(res.statusCode).toBe(404)
  })

  it('POST /user/:id/avatar includes _id and id in response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/user/${userId}/avatar`,
      headers: AUTH
    })
    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data._id).toBe(userId)
    expect(data.id).toBe(userId)
    expect(data.avatar).toBe(`https://avatar.vercel.sh/${userId}`)
  })
})
