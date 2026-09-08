import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_DB_PATH = path.resolve(__dirname, '../data/dcim.sqlite')

export function openDb(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  migrate(db)
  return db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      role TEXT,
      is_customer_admin INTEGER DEFAULT 0,
      customer_id TEXT,
      language TEXT DEFAULT 'en',
      permissions_json TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      billing_json TEXT,
      custom_device_types_json TEXT
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      customer_id TEXT
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      country TEXT
    );

    CREATE TABLE IF NOT EXISTS floors (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      floor_plan_image TEXT,
      bounds_json TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      floor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT,
      color TEXT,
      polygon_json TEXT
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      location_id TEXT,
      room_id TEXT,
      rack_id TEXT,
      name TEXT NOT NULL,
      label TEXT,
      type TEXT,
      unit INTEGER,
      height_u INTEGER,
      side TEXT,
      sub_devices_json TEXT,
      ports_json TEXT,
      floor_plan_position_json TEXT
    );

    CREATE TABLE IF NOT EXISTS device_connections (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      from_device_id TEXT NOT NULL,
      from_port TEXT,
      to_device_id TEXT NOT NULL,
      to_port TEXT,
      cable_color TEXT,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS vlans (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      vlan_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      ports_json TEXT
    );

    CREATE TABLE IF NOT EXISTS wlans (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      ssid TEXT NOT NULL,
      security TEXT,
      description TEXT,
      devices_json TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_rack_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      type TEXT,
      rack_units INTEGER,
      ports_count INTEGER,
      ports_json TEXT
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      active INTEGER DEFAULT 1,
      dismissed_by_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      resource_data_json TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL
    );
  `)

  // Columns added after the initial schema. The real frontend sends a wider
  // field set than the original spec's `types/index.ts` declared (see the
  // final review of the dcim-local-backend branch), and the CRUD factory now
  // rejects unknown body keys rather than silently dropping them — so every
  // field the app actually writes needs a home here.
  addColumns(db, 'customers', { standard_device_type_prefixes_json: 'TEXT' })
  addColumns(db, 'locations', {
    reference: 'TEXT',
    responsible_user_id: 'TEXT',
    latitude: 'REAL',
    longitude: 'REAL'
  })
  addColumns(db, 'floors', { reference: 'TEXT', responsible_user_id: 'TEXT' })
  addColumns(db, 'rooms', {
    reference: 'TEXT',
    responsible_user_id: 'TEXT',
    location_id: 'TEXT',
    floor_plan_shape_type: 'TEXT'
  })
  addColumns(db, 'devices', {
    reference: 'TEXT',
    responsible_user_id: 'TEXT',
    floor_id: 'TEXT',
    category: 'TEXT',
    custom_device_type_id: 'TEXT',
    elements_json: 'TEXT',
    // Links a placed device back to the CustomRackDevice template it was
    // dropped from (distinct from custom_device_type_id, which points at
    // the coarser "Device Types" category registry, not a port layout).
    // A frozen snapshot: elements_json is copied from the template at
    // placement/link time and never re-synced automatically.
    custom_rack_device_id: 'TEXT'
  })
  addColumns(db, 'device_connections', {
    direction: 'TEXT',
    cassette_color: 'TEXT',
    location_id: 'TEXT',
    floor_id: 'TEXT',
    room_id: 'TEXT'
  })
}

/** Idempotent ALTER TABLE ADD COLUMN — SQLite has no `ADD COLUMN IF NOT EXISTS`. */
function addColumns(db: Database.Database, table: string, columns: Record<string, string>): void {
  const existing = new Set(
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
  )
  for (const [name, type] of Object.entries(columns)) {
    if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`)
  }
}
