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
