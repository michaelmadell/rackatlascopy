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
})
