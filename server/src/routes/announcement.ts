import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { paginate } from '../lib/pagination'

function rowToDoc(row: any): Record<string, unknown> {
  return { _id: row.id, id: row.id, title: row.title, body: row.body, active: !!row.active }
}

export function registerAnnouncementRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/announcement', async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 25
    const rows = db.prepare('SELECT * FROM announcements ORDER BY rowid DESC').all() as any[]
    const docs = rows.map(rowToDoc)
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })

  app.get('/announcement/active', async (req) => {
    const userId = req.user!.id
    const rows = db.prepare('SELECT * FROM announcements WHERE active = 1').all() as any[]
    const stillActive = rows.filter((row) => {
      const dismissedBy: string[] = row.dismissed_by_json ? JSON.parse(row.dismissed_by_json) : []
      return !dismissedBy.includes(userId)
    })
    return { data: stillActive.map(rowToDoc) }
  })

  app.post('/announcement/:id/dismiss', async (req) => {
    const { id } = req.params as { id: string }
    const userId = req.user!.id
    const row = db.prepare('SELECT dismissed_by_json FROM announcements WHERE id = ?').get(id) as any
    if (!row) return { success: true } // already gone - dismissing is idempotent
    const dismissedBy: string[] = row.dismissed_by_json ? JSON.parse(row.dismissed_by_json) : []
    if (!dismissedBy.includes(userId)) dismissedBy.push(userId)
    db.prepare('UPDATE announcements SET dismissed_by_json = ? WHERE id = ?').run(JSON.stringify(dismissedBy), id)
    return { success: true }
  })

  app.post('/announcement/dismiss-all', async (req) => {
    const userId = req.user!.id
    const rows = db.prepare('SELECT id, dismissed_by_json FROM announcements WHERE active = 1').all() as any[]
    const update = db.prepare('UPDATE announcements SET dismissed_by_json = ? WHERE id = ?')
    for (const row of rows) {
      const dismissedBy: string[] = row.dismissed_by_json ? JSON.parse(row.dismissed_by_json) : []
      if (!dismissedBy.includes(userId)) dismissedBy.push(userId)
      update.run(JSON.stringify(dismissedBy), row.id)
    }
    return { success: true }
  })
}
