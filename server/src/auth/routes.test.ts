import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { openDb } from '../db'
import { registerAuthRoutes } from './routes'
import { ApiError } from '../lib/errors'

const SECRET = 'test-secret'

describe('POST /auth/login', () => {
  let db: ReturnType<typeof openDb>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
  })

  function buildTestApp() {
    const app = Fastify()
    app.setErrorHandler((err: any, _req, reply) => reply.status(err.status ?? 500).send({ error: { message: err.message } }))
    registerAuthRoutes(app, db, SECRET)
    return app
  }

  it('returns a token + user for correct credentials', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@example.com', password: 'admin' }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.token).toBeTypeOf('string')
    expect(body.data.user.email).toBe('admin@example.com')
  })

  it('rejects the wrong password with 401', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@example.com', password: 'wrong' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects an unknown email with 401', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'admin' }
    })
    expect(res.statusCode).toBe(401)
  })
})
