import { describe, it, expect } from 'vitest'
import { openDb } from './db'

describe('openDb', () => {
  it('creates all expected tables', () => {
    const db = openDb(':memory:')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((r: any) => r.name)

    expect(tables).toEqual([
      'announcements',
      'custom_rack_devices',
      'customers',
      'device_connections',
      'devices',
      'floors',
      'locations',
      'logs',
      'rooms',
      'tenants',
      'users',
      'vlans',
      'wlans'
    ])
  })

  it('is safe to call twice against the same file', () => {
    expect(() => {
      openDb(':memory:')
      openDb(':memory:')
    }).not.toThrow()
  })
})
