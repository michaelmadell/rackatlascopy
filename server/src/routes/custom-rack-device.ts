import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'

export function registerCustomRackDeviceRoutes(app: FastifyInstance, db: Database.Database): void {
  registerCrudRoutes(app, db, '/custom-rack-device', {
    table: 'custom_rack_devices',
    columns: [
      { db: 'name', api: 'name' },
      { db: 'brand', api: 'brand' },
      // The Device Library table (library.tsx:191/198/203) reads
      // manufacturer/deviceType/height, not brand/type/rackUnits — same
      // db columns, the names the real page actually uses.
      { db: 'brand', api: 'manufacturer' },
      { db: 'type', api: 'type' },
      { db: 'type', api: 'deviceType' },
      { db: 'rack_units', api: 'rackUnits' },
      { db: 'rack_units', api: 'height' },
      { db: 'ports_count', api: 'portsCount' },
      { db: 'ports_json', api: 'ports', json: true }
    ],
    sortableColumns: ['name']
  })
}
