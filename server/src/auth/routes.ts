import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import { unauthorized } from '../lib/errors'

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export function registerAuthRoutes(app: FastifyInstance, db: Database.Database, jwtSecret: string): void {
  app.post('/auth/login', async (req) => {
    const { email, password } = loginBody.parse(req.body)
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
    if (!row) throw unauthorized('Invalid email or password')

    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) throw unauthorized('Invalid email or password')

    const token = jwt.sign({ sub: row.id }, jwtSecret, { expiresIn: '7d' })
    return {
      data: {
        token,
        user: {
          _id: row.id,
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          isCustomerAdmin: !!row.is_customer_admin
        }
      }
    }
  })
}
