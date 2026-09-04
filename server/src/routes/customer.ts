import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { z } from 'zod'
import { notFound } from '../lib/errors'
import { paginate } from '../lib/pagination'

function rowToCustomerDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    billing: row.billing_json ? JSON.parse(row.billing_json) : {},
    customDeviceTypes: row.custom_device_types_json ? JSON.parse(row.custom_device_types_json) : []
  }
}

const patchCustomerBody = z.object({ name: z.string().min(1).optional() })

export function registerCustomerRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/customer', async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 100
    const rows = db.prepare('SELECT * FROM customers').all() as any[]
    const docs = rows.map(rowToCustomerDoc)
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })

  app.get('/customer/:id', async (req) => {
    const { id } = req.params as { id: string }
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
    if (!row) throw notFound('customer')
    return { data: rowToCustomerDoc(row) }
  })

  app.patch('/customer/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = patchCustomerBody.parse(req.body)
    if (body.name !== undefined) {
      const result = db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(body.name, id)
      if (result.changes === 0) throw notFound('customer')
    }
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
    if (!row) throw notFound('customer')
    return { data: rowToCustomerDoc(row) }
  })

  app.patch('/customer/:id/owner', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = z.object({ userId: z.string() }).parse(req.body)
    const result = db
      .prepare('UPDATE users SET is_customer_admin = 1 WHERE id = ? AND customer_id = ?')
      .run(userId, id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })

  app.delete('/customer/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    if (result.changes === 0) throw notFound('customer')
    return { success: true }
  })

  app.get('/icon/customer', async () => ({ success: true, data: {} }))
}
