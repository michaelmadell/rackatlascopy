import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { openDb } from '../db'
import { createAuthHook } from './middleware'

const SECRET = 'test-secret'

function seedUser(db: ReturnType<typeof openDb>) {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
  return id
}

describe('createAuthHook', () => {
  let db: ReturnType<typeof openDb>

  beforeEach(() => {
    db = openDb(':memory:')
  })

  it('rejects requests with no Authorization header', async () => {
    seedUser(db)
    const app = Fastify()
    app.addHook('preHandler', createAuthHook(db, SECRET))
    app.get('/protected', async (req) => ({ user: req.user }))
    const res = await app.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(401)
  })

  it('resolves the dev mock token to the seeded user', async () => {
    seedUser(db)
    const app = Fastify()
    app.setErrorHandler((err: any, _req, reply) => reply.status(err.status ?? 500).send({ error: { message: err.message } }))
    app.addHook('preHandler', createAuthHook(db, SECRET))
    app.get('/protected', async (req) => ({ user: req.user }))
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer mock-dev-access-token' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.email).toBe('admin@example.com')
  })

  it('resolves a valid JWT to its subject user', async () => {
    const id = seedUser(db)
    const token = jwt.sign({ sub: id }, SECRET)
    const app = Fastify()
    app.addHook('preHandler', createAuthHook(db, SECRET))
    app.get('/protected', async (req) => ({ user: req.user }))
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.id).toBe(id)
  })
})
