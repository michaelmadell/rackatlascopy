import { describe, it, expect, beforeAll } from 'vitest'
import { openDb } from './db'
import { seed } from './seed'
import { buildApp } from './app'

describe('full stack smoke test', () => {
  let app: ReturnType<typeof buildApp>
  let token: string

  beforeAll(async () => {
    const db = openDb(':memory:')
    seed(db)
    app = buildApp({ db, jwtSecret: 'test-secret' })

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@example.com', password: 'admin' }
    })
    expect(login.statusCode).toBe(200)
    token = login.json().data.token
  })

  it('logs in and fetches /user/self with an active-subscription customer', async () => {
    const self = await app.inject({
      method: 'GET',
      url: '/user/self',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(self.statusCode).toBe(200)
    expect(self.json().data.email).toBe('admin@example.com')
    const customerId = self.json().data.customerId

    const customer = await app.inject({
      method: 'GET',
      url: `/customer/${customerId}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(customer.json().data.name).toBe('Amulet')
    expect(customer.json().data.billing.subscriptionStatus).toBe('active')
  })

  it('round-trips a tenant -> location create/patch/delete', async () => {
    const headers = { authorization: `Bearer ${token}` }

    const tenants = await app.inject({ method: 'GET', url: '/tenant', headers })
    const tenantId = tenants.json().data.docs[0]._id

    const created = await app.inject({
      method: 'POST',
      url: `/tenant/${tenantId}/location`,
      headers,
      payload: { name: 'Annex' }
    })
    expect(created.statusCode).toBe(200)
    const locationId = created.json().data._id

    const patched = await app.inject({
      method: 'PATCH',
      url: `/tenant/${tenantId}/location/${locationId}`,
      headers,
      payload: { city: 'Exeter' }
    })
    expect(patched.json().data.city).toBe('Exeter')

    const deleted = await app.inject({ method: 'DELETE', url: `/tenant/${tenantId}/location/${locationId}`, headers })
    expect(deleted.json()).toEqual({ success: true })

    const after = await app.inject({ method: 'GET', url: `/tenant/${tenantId}/location/${locationId}`, headers })
    expect(after.statusCode).toBe(404)
  })

  it('also accepts the frontend Auth0-shim dev token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/user/self',
      headers: { authorization: 'Bearer mock-dev-access-token' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.email).toBe('admin@example.com')
  })
})
