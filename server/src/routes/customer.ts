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
    customDeviceTypes: row.custom_device_types_json ? JSON.parse(row.custom_device_types_json) : [],
    standardDeviceTypePrefixes: row.standard_device_type_prefixes_json
      ? JSON.parse(row.standard_device_type_prefixes_json)
      : {}
  }
}

/**
 * Every field the library page saves through this route
 * (library.tsx:294/403/421). Anything outside the schema is rejected rather
 * than stripped — a silently-dropped `customDeviceTypes` looked like a
 * successful save and lost the user's work.
 */
const patchCustomerBody = z
  .object({
    name: z.string().min(1).optional(),
    customDeviceTypes: z.array(z.unknown()).optional(),
    standardDeviceTypePrefixes: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
    billing: z.record(z.unknown()).optional()
  })
  .strict()

const PATCHABLE_COLUMNS: Record<keyof z.infer<typeof patchCustomerBody>, { column: string; json: boolean }> = {
  name: { column: 'name', json: false },
  customDeviceTypes: { column: 'custom_device_types_json', json: true },
  standardDeviceTypePrefixes: { column: 'standard_device_type_prefixes_json', json: true },
  billing: { column: 'billing_json', json: true }
}

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
    const sets: string[] = []
    const values: unknown[] = []
    for (const [field, { column, json }] of Object.entries(PATCHABLE_COLUMNS)) {
      const value = (body as Record<string, unknown>)[field]
      if (value === undefined) continue
      sets.push(`${column} = ?`)
      values.push(json ? JSON.stringify(value) : value)
    }
    if (sets.length > 0) {
      const result = db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`).run(...values, id)
      if (result.changes === 0) throw notFound('customer')
    }
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
    if (!row) throw notFound('customer')
    return { data: rowToCustomerDoc(row) }
  })

  /**
   * Populates the activity-log resource-filter dropdown
   * (hooks/useActivityLogs.tsx:81-91, consumed at :481-514). The hook expects
   * `res.data.data` keyed by resource type — tenants/locations/floors/rooms/
   * devices/vlans/wlans — with each entry carrying `_id` plus the label field
   * for its type (`fullReference`/`reference`, `name` for vlan, `ssid` for
   * wlan). Deliberately minimal: a dropdown feed, not a resource browser.
   */
  app.get('/customer/:id/resources', async (req) => {
    const { id } = req.params as { id: string }
    const { tenantId } = req.query as { tenantId?: string }

    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(id)
    if (!customer) throw notFound('customer')

    // Only the customer's own tenants, narrowed to one when the hook asks.
    const tenantRows = (
      tenantId
        ? db.prepare('SELECT * FROM tenants WHERE customer_id = ? AND id = ?').all(id, tenantId)
        : db.prepare('SELECT * FROM tenants WHERE customer_id = ?').all(id)
    ) as any[]
    const tenantIds = tenantRows.map((t) => t.id)

    // No tenants in scope means no scoped resources — an empty IN () is not
    // valid SQLite, so short-circuit instead.
    const scoped = (table: string): any[] => {
      if (tenantIds.length === 0) return []
      const placeholders = tenantIds.map(() => '?').join(', ')
      return db.prepare(`SELECT * FROM ${table} WHERE tenant_id IN (${placeholders})`).all(...tenantIds) as any[]
    }

    const labelled = (rows: any[], label: (row: any) => unknown) =>
      rows.map((row) => ({ _id: row.id, id: row.id, reference: label(row), fullReference: label(row) }))

    return {
      data: {
        tenants: labelled(tenantRows, (t) => t.name),
        locations: labelled(scoped('locations'), (l) => l.reference ?? l.name),
        floors: labelled(scoped('floors'), (f) => f.reference ?? f.name),
        rooms: labelled(scoped('rooms'), (r) => r.reference ?? r.name),
        devices: labelled(scoped('devices'), (d) => d.reference ?? d.name),
        vlans: scoped('vlans').map((v) => ({ _id: v.id, id: v.id, name: v.name })),
        wlans: scoped('wlans').map((w) => ({ _id: w.id, id: w.id, ssid: w.ssid }))
      }
    }
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
