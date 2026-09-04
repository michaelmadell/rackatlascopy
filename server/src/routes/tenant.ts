import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'

export function registerTenantRoutes(app: FastifyInstance, db: Database.Database): void {
  registerCrudRoutes(app, db, '/tenant', {
    table: 'tenants',
    columns: [
      { db: 'name', api: 'name' },
      { db: 'slug', api: 'slug' },
      { db: 'customer_id', api: 'customerId' }
    ],
    sortableColumns: ['name'],
    defaultSort: 'name'
  })
}
