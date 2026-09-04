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
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('GET /customer/:id returns billing with an active subscription', async () => {
    const res = await app.inject({ method: 'GET', url: `/customer/${customerId}`, headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.billing.subscriptionStatus).toBe('active')
    expect(res.json().data.billing.plan).toBe('enterprise')
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
})
