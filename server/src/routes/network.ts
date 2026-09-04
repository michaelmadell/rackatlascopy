import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'

export function registerNetworkRoutes(app: FastifyInstance, db: Database.Database): void {
  const scope = { column: 'tenant_id', param: 'tenantId' }

  registerCrudRoutes(app, db, '/tenant/:tenantId/vlan', {
    table: 'vlans',
    scope,
    columns: [
      { db: 'vlan_id', api: 'vlanId' },
      { db: 'name', api: 'name' },
      { db: 'description', api: 'description' },
      { db: 'ports_json', api: 'ports', json: true }
    ],
    sortableColumns: ['name', 'vlanId']
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/wlan', {
    table: 'wlans',
    scope,
    columns: [
      { db: 'ssid', api: 'ssid' },
      { db: 'security', api: 'security' },
      { db: 'description', api: 'description' },
      { db: 'devices_json', api: 'devices', json: true }
    ],
    sortableColumns: ['ssid']
  })
}
