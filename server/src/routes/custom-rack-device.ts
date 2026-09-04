import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'

export function registerCustomRackDeviceRoutes(app: FastifyInstance, db: Database.Database): void {
  registerCrudRoutes(app, db, '/custom-rack-device', {
    table: 'custom_rack_devices',
    readOnly: true,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'brand', api: 'brand' },
      { db: 'type', api: 'type' },
      { db: 'rack_units', api: 'rackUnits' },
      { db: 'ports_count', api: 'portsCount' },
      { db: 'ports_json', api: 'ports', json: true }
    ],
    sortableColumns: ['name']
  })
}
