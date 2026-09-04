import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { notFound } from '../lib/errors'

function rowToUserDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
    isCustomerAdmin: !!row.is_customer_admin,
    customerId: row.customer_id,
    language: row.language,
    permissions: row.permissions_json ? JSON.parse(row.permissions_json) : []
  }
}

const createUserBody = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1),
  role: z.string().optional(),
  customerId: z.string().optional(),
  isCustomerAdmin: z.boolean().optional()
})

const patchUserBody = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  language: z.string().optional(),
  isCustomerAdmin: z.boolean().optional()
})

export function registerUserRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/user/self', async (req) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any
    if (!row) throw notFound('user')
    const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(row.customer_id) as any
    return { data: { ...rowToUserDoc(row), customerId: customer?.id ?? row.customer_id } }
  })

  app.get('/user/:id', async (req) => {
    const { id } = req.params as { id: string }
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!row) throw notFound('user')
    return { data: rowToUserDoc(row) }
  })

  app.post('/user', async (req) => {
    const body = createUserBody.parse(req.body)
    const id = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, permissions_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.email,
      bcrypt.hashSync(body.password, 10),
      body.name,
      body.role ?? 'member',
      body.isCustomerAdmin ? 1 : 0,
      body.customerId ?? null,
      '[]'
    )
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    return { data: rowToUserDoc(row) }
  })

  app.patch('/user/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = patchUserBody.parse(req.body)
    const sets: string[] = []
    const values: unknown[] = []
    if (body.name !== undefined) { sets.push('name = ?'); values.push(body.name) }
    if (body.role !== undefined) { sets.push('role = ?'); values.push(body.role) }
    if (body.language !== undefined) { sets.push('language = ?'); values.push(body.language) }
    if (body.isCustomerAdmin !== undefined) { sets.push('is_customer_admin = ?'); values.push(body.isCustomerAdmin ? 1 : 0) }
    if (sets.length > 0) {
      const result = db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values, id)
      if (result.changes === 0) throw notFound('user')
    }
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!row) throw notFound('user')
    return { data: rowToUserDoc(row) }
  })

  app.delete('/user/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })

  app.post('/user/:id/avatar', async (req) => {
    const { id } = req.params as { id: string }
    // Local dev stub: accepts the multipart upload, doesn't persist the file.
    await req.file()
    const url = `https://avatar.vercel.sh/${id}`
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, id)
    return { data: { avatar: url } }
  })

  app.post('/user/:id/password', async (req) => {
    const { id } = req.params as { id: string }
    const { password } = z.object({ password: z.string().min(1) }).parse(req.body)
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })

  app.post('/user/:id/change-customer', async (req) => {
    const { id } = req.params as { id: string }
    const { customerId } = z.object({ customerId: z.string() }).parse(req.body)
    const result = db.prepare('UPDATE users SET customer_id = ? WHERE id = ?').run(customerId, id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })
}
