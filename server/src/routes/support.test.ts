import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('POST /support/request', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    // The mock-dev-access-token used by AUTH resolves to the first seeded user
    // (see auth/middleware.ts) — every protected-route test file seeds one.
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
    app = buildApp({ db, jwtSecret: 'test-secret' })
  })

  it('returns a reference and ticket number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/support/request',
      headers: AUTH,
      payload: { category: 'bug', message: 'Something broke' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.reference).toBeTypeOf('string')
    expect(res.json().data.ticketNumber).toBeTypeOf('string')
  })
})
