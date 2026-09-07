import { describe, it, expect } from 'vitest'
import bcrypt from 'bcrypt'
import { openDb } from './db'
import { seed } from './seed'

describe('seed', () => {
  it('creates Amulet with a full active subscription and the admin user', () => {
    const db = openDb(':memory:')
    seed(db)

    const customer = db.prepare('SELECT * FROM customers WHERE name = ?').get('Amulet') as any
    expect(customer).toBeDefined()
    const billing = JSON.parse(customer.billing_json)
    expect(billing.subscriptionStatus).toBe('active')
    expect(billing.plan).toBe('enterprise')
    expect(billing.blockedAt).toBeUndefined()
    expect(billing.trialEndsAt).toBeUndefined()

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@example.com') as any
    expect(user).toBeDefined()
    expect(user.is_customer_admin).toBe(1)
    expect(user.customer_id).toBe(customer.id)
    expect(bcrypt.compareSync('admin', user.password_hash)).toBe(true)
  })

  it('seeds one tenant, one location with a floor and room, catalog devices, a vlan and a wlan', () => {
    const db = openDb(':memory:')
    seed(db)

    expect((db.prepare('SELECT COUNT(*) AS n FROM tenants').get() as any).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS n FROM locations').get() as any).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS n FROM buildings').get() as any).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS n FROM floors').get() as any).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as any).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS n FROM custom_rack_devices').get() as any).n).toBe(2)
    expect((db.prepare('SELECT COUNT(*) AS n FROM devices').get() as any).n).toBeGreaterThan(0)
    expect((db.prepare('SELECT COUNT(*) AS n FROM vlans').get() as any).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS n FROM wlans').get() as any).n).toBe(1)
  })

  it('is idempotent - running twice does not duplicate data', () => {
    const db = openDb(':memory:')
    seed(db)
    seed(db)
    expect((db.prepare('SELECT COUNT(*) AS n FROM customers').get() as any).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) AS n FROM users').get() as any).n).toBe(1)
  })
})
