import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import type Database from 'better-sqlite3'
import { unauthorized } from '../lib/errors'

export interface AuthUser {
  id: string
  email: string
  name: string
  customerId: string | null
  role: string | null
  isCustomerAdmin: boolean
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}

export function createAuthHook(db: Database.Database, jwtSecret: string) {
  return async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ') || header.length <= 'Bearer '.length) {
      throw unauthorized()
    }
    const token = header.slice('Bearer '.length)

    let userId: string | undefined
    try {
      const payload = jwt.verify(token, jwtSecret) as { sub: string }
      userId = payload.sub
    } catch {
      // Not a JWT we issued (e.g. the Auth0 shim's static 'mock-dev-access-token') —
      // any non-empty bearer token falls back to the single seeded dev session.
      // ORDER BY rowid is required for determinism: without it SQLite may satisfy
      // this query from the TEXT primary key's index (UUID lexicographic order)
      // instead of insertion order, making the "first" user unpredictable.
      const row = db.prepare('SELECT id FROM users ORDER BY rowid LIMIT 1').get() as { id: string } | undefined
      userId = row?.id
    }

    if (!userId) throw unauthorized()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!row) throw unauthorized()

    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      customerId: row.customer_id,
      role: row.role,
      isCustomerAdmin: !!row.is_customer_admin
    }
  }
}
