import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { paginate } from '../lib/pagination'

function rowToDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    resourceData: row.resource_data_json ? JSON.parse(row.resource_data_json) : {},
    userId: row.user_id,
    createdAt: row.created_at
  }
}

export function registerLogRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/log', async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 25

    let sql = 'SELECT * FROM logs WHERE 1 = 1'
    const params: unknown[] = []
    if (query.tenantId) {
      sql += ' AND tenant_id = ?'
      params.push(query.tenantId)
    }
    if (query.resourceId) {
      sql += ' AND resource_id = ?'
      params.push(query.resourceId)
    }
    if (query.resource) {
      if (query.resource.startsWith('$in:')) {
        const values = query.resource.slice('$in:'.length).split(',')
        sql += ` AND resource IN (${values.map(() => '?').join(', ')})`
        params.push(...values)
      } else {
        sql += ' AND resource = ?'
        params.push(query.resource)
      }
    }
    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params) as any[]
    const docs = rows.map(rowToDoc)
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })
}
