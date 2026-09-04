import type { FastifyInstance, FastifyRequest } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { notFound } from './errors'
import { paginate } from './pagination'

export interface ColumnDef {
  db: string
  api: string
  json?: boolean
}

export interface ScopeDef {
  column: string
  param: string
}

export interface CrudResourceConfig {
  table: string
  columns: ColumnDef[]
  scope?: ScopeDef
  sortableColumns?: string[]
  defaultSort?: string
  readOnly?: boolean
}

function rowToDoc(row: Record<string, unknown>, columns: ColumnDef[]): Record<string, unknown> {
  const doc: Record<string, unknown> = { _id: row.id, id: row.id }
  for (const col of columns) {
    const raw = row[col.db]
    doc[col.api] = col.json ? (raw != null ? JSON.parse(raw as string) : undefined) : raw
  }
  return doc
}

function docToRow(body: Record<string, unknown>, columns: ColumnDef[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const col of columns) {
    if (!(col.api in body)) continue
    const value = body[col.api]
    row[col.db] = col.json ? JSON.stringify(value ?? null) : value
  }
  return row
}

export function registerCrudRoutes(
  app: FastifyInstance,
  db: Database.Database,
  basePath: string,
  config: CrudResourceConfig
): void {
  const { table, columns, scope, sortableColumns = [], defaultSort, readOnly } = config
  const allCols = ['id', ...(scope ? [scope.column] : []), ...columns.map((c) => c.db)]

  function scopeValue(req: FastifyRequest): string | undefined {
    return scope ? (req.params as Record<string, string>)[scope.param] : undefined
  }

  app.get(basePath, async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 100
    const sortParam = query.sort || defaultSort

    let sql = `SELECT ${allCols.join(', ')} FROM ${table}`
    const params: unknown[] = []
    if (scope) {
      sql += ` WHERE ${scope.column} = ?`
      params.push(scopeValue(req))
    }
    if (sortParam) {
      const desc = sortParam.startsWith('-')
      const apiField = desc ? sortParam.slice(1) : sortParam
      const col = columns.find((c) => c.api === apiField)
      if (col && sortableColumns.includes(apiField)) {
        sql += ` ORDER BY ${col.db} ${desc ? 'DESC' : 'ASC'}`
      }
    }
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    const docs = rows.map((r) => rowToDoc(r, columns))
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })

  app.get(`${basePath}/:id`, async (req) => {
    const { id } = req.params as { id: string }
    let sql = `SELECT ${allCols.join(', ')} FROM ${table} WHERE id = ?`
    const params: unknown[] = [id]
    if (scope) {
      sql += ` AND ${scope.column} = ?`
      params.push(scopeValue(req))
    }
    const row = db.prepare(sql).get(...params) as Record<string, unknown> | undefined
    if (!row) throw notFound(table)
    return { data: rowToDoc(row, columns) }
  })

  if (!readOnly) {
    app.post(basePath, async (req) => {
      const body = (req.body ?? {}) as Record<string, unknown>
      const id = (body._id as string) || (body.id as string) || randomUUID()
      const rowValues = docToRow(body, columns)
      const cols = ['id', ...(scope ? [scope.column] : []), ...Object.keys(rowValues)]
      const values = [id, ...(scope ? [scopeValue(req)] : []), ...Object.values(rowValues)]
      const placeholders = cols.map(() => '?').join(', ')
      db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values)
      const created = db.prepare(`SELECT ${allCols.join(', ')} FROM ${table} WHERE id = ?`).get(id) as Record<string, unknown>
      return { data: rowToDoc(created, columns) }
    })

    app.patch(`${basePath}/:id`, async (req) => {
      const { id } = req.params as { id: string }
      const body = (req.body ?? {}) as Record<string, unknown>
      const rowValues = docToRow(body, columns)
      const keys = Object.keys(rowValues)
      if (keys.length > 0) {
        let sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`
        const params: unknown[] = [...keys.map((k) => rowValues[k]), id]
        if (scope) {
          sql += ` AND ${scope.column} = ?`
          params.push(scopeValue(req))
        }
        const result = db.prepare(sql).run(...params)
        if (result.changes === 0) throw notFound(table)
      }
      let selectSql = `SELECT ${allCols.join(', ')} FROM ${table} WHERE id = ?`
      const selectParams: unknown[] = [id]
      if (scope) {
        selectSql += ` AND ${scope.column} = ?`
        selectParams.push(scopeValue(req))
      }
      const updated = db.prepare(selectSql).get(...selectParams) as Record<string, unknown> | undefined
      if (!updated) throw notFound(table)
      return { data: rowToDoc(updated, columns) }
    })

    app.delete(`${basePath}/:id`, async (req) => {
      const { id } = req.params as { id: string }
      let sql = `DELETE FROM ${table} WHERE id = ?`
      const params: unknown[] = [id]
      if (scope) {
        sql += ` AND ${scope.column} = ?`
        params.push(scopeValue(req))
      }
      const result = db.prepare(sql).run(...params)
      if (result.changes === 0) throw notFound(table)
      return { success: true }
    })
  }
}
