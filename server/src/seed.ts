import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { openDb } from './db'

export function seed(db: Database.Database): void {
  const existing = db.prepare('SELECT id FROM customers WHERE name = ?').get('Amulet') as { id: string } | undefined
  if (existing) return // already seeded

  const customerId = randomUUID()
  db.prepare('INSERT INTO customers (id, name, billing_json, custom_device_types_json) VALUES (?, ?, ?, ?)').run(
    customerId,
    'Amulet',
    JSON.stringify({
      status: 'active',
      subscriptionStatus: 'active',
      plan: 'enterprise',
      validUntil: '2027-12-31'
    }),
    '[]'
  )

  const adminId = randomUUID()
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, language, permissions_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    adminId,
    'admin@example.com',
    bcrypt.hashSync('admin', 10),
    'Amulet Admin',
    'admin',
    1,
    customerId,
    'en',
    JSON.stringify([
      { resourceType: 'customer', resourceId: customerId, role: 'admin' }
    ])
  )

  const tenantId = randomUUID()
  db.prepare('INSERT INTO tenants (id, name, slug, customer_id) VALUES (?, ?, ?, ?)').run(
    tenantId,
    'HOME',
    'home',
    customerId
  )

  // Backfill the admin's tenant permission now that the tenant id exists.
  db.prepare('UPDATE users SET permissions_json = ? WHERE id = ?').run(
    JSON.stringify([
      { resourceType: 'customer', resourceId: customerId, role: 'admin' },
      { resourceType: 'tenant', resourceId: tenantId, role: 'admin' }
    ]),
    adminId
  )

  const locationId = randomUUID()
  db.prepare('INSERT INTO locations (id, tenant_id, name, address, city, country) VALUES (?, ?, ?, ?, ?, ?)').run(
    locationId,
    tenantId,
    'HOME',
    '24 Lower Cannon Road',
    'Newton Abbot',
    'GB'
  )

  const buildingId = randomUUID()
  db.prepare('INSERT INTO buildings (id, tenant_id, location_id, name, reference) VALUES (?, ?, ?, ?, ?)').run(
    buildingId,
    tenantId,
    locationId,
    'Main Building',
    'A'
  )

  const floorId = randomUUID()
  db.prepare(
    'INSERT INTO floors (id, tenant_id, location_id, building_id, name, level, bounds_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(floorId, tenantId, locationId, buildingId, 'Ground Floor', 0, JSON.stringify({ width: 100, height: 80 }))

  const roomId = randomUUID()
  db.prepare(
    'INSERT INTO rooms (id, tenant_id, floor_id, name, polygon_json) VALUES (?, ?, ?, ?, ?)'
  ).run(roomId, tenantId, floorId, 'Server Room', JSON.stringify([[10, 10], [40, 10], [40, 40], [10, 40]]))

  const switchCatalogId = randomUUID()
  db.prepare(
    `INSERT INTO custom_rack_devices (id, name, brand, type, rack_units, ports_count, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(switchCatalogId, 'Catalyst 2960-X 24TS-L', 'Cisco', 'switch', 1, 28, '[]')

  const patchPanelCatalogId = randomUUID()
  db.prepare(
    `INSERT INTO custom_rack_devices (id, name, brand, type, rack_units, ports_count, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(patchPanelCatalogId, 'Patch Panel 24 Port STP', 'PATCHBOX', 'patch-panel', 1, 24, '[]')

  const rackId = randomUUID()
  db.prepare(
    `INSERT INTO devices (id, tenant_id, room_id, name, type, height_u, sub_devices_json, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(rackId, tenantId, roomId, 'Rack 1', 'rack', 42, '[]', '[]')

  db.prepare(
    `INSERT INTO devices (id, tenant_id, room_id, rack_id, name, type, unit, height_u, sub_devices_json, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), tenantId, roomId, rackId, 'Catalyst 2960-X 24TS-L', 'switch', 1, 1, '[]', '[]')

  db.prepare(
    `INSERT INTO devices (id, tenant_id, room_id, rack_id, name, type, unit, height_u, sub_devices_json, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), tenantId, roomId, rackId, 'Patch Panel 24 Port STP', 'patch-panel', 2, 1, '[]', '[]')

  db.prepare(
    'INSERT INTO vlans (id, tenant_id, vlan_id, name, description, ports_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), tenantId, 10, 'Default', 'Default VLAN', '[]')

  db.prepare(
    'INSERT INTO wlans (id, tenant_id, ssid, security, description, devices_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), tenantId, 'Amulet-Staff', 'wpa2', 'Staff wifi', '[]')
}

if (require.main === module) {
  const db = openDb()
  seed(db)
  console.log('Seed complete: admin@example.com / admin, org "Amulet", tenant "HOME".')
}
