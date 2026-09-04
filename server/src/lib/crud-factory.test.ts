import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { openDb } from '../db'
import { registerCrudRoutes } from './crud-factory'
import { ApiError } from './errors'

describe('registerCrudRoutes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof Fastify>

  beforeEach(() => {
    db = openDb(':memory:')
    app = Fastify()
    app.setErrorHandler((err: any, _req, reply) => reply.status(err.status ?? 500).send({ error: { message: err.message } }))
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
  })

  it('supports create, list, get, patch, delete', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/tenant',
      payload: { name: 'HOME', customerId: 'cust-1' }
    })
    expect(created.statusCode).toBe(200)
    const doc = created.json().data
    expect(doc._id).toBeTypeOf('string')
    expect(doc.id).toBe(doc._id)
    expect(doc.name).toBe('HOME')

    const listed = await app.inject({ method: 'GET', url: '/tenant' })
    expect(listed.json().data.docs).toHaveLength(1)
    expect(listed.json().data.totalDocs).toBe(1)

    const got = await app.inject({ method: 'GET', url: `/tenant/${doc._id}` })
    expect(got.json().data.name).toBe('HOME')

    const patched = await app.inject({
      method: 'PATCH',
      url: `/tenant/${doc._id}`,
      payload: { name: 'HOME UPDATED' }
    })
    expect(patched.json().data.name).toBe('HOME UPDATED')

    const deleted = await app.inject({ method: 'DELETE', url: `/tenant/${doc._id}` })
    expect(deleted.json()).toEqual({ success: true })

    const afterDelete = await app.inject({ method: 'GET', url: `/tenant/${doc._id}` })
    expect(afterDelete.statusCode).toBe(404)
  })

  // Unknown keys used to be dropped by docToRow, and a PATCH whose every key
  // was unknown skipped the UPDATE entirely — 200, zero effect, no error.
  describe('unknown body keys', () => {
    it('rejects them on POST, naming them', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/tenant',
        payload: { name: 'HOME', nmae: 'typo', alsoWrong: 1 }
      })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.message).toContain('nmae')
      expect(res.json().error.message).toContain('alsoWrong')
      expect(db.prepare('SELECT COUNT(*) AS n FROM tenants').get()).toEqual({ n: 0 })
    })

    it('rejects them on PATCH instead of returning an unchanged doc', async () => {
      const created = await app.inject({ method: 'POST', url: '/tenant', payload: { name: 'HOME' } })
      const id = created.json().data._id

      const res = await app.inject({ method: 'PATCH', url: `/tenant/${id}`, payload: { nmae: 'typo' } })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.message).toContain('nmae')
    })

    it('still tolerates the identity/timestamp keys the frontend round-trips', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/tenant',
        payload: { name: 'HOME', tenantId: 'ignored', createdAt: 'x', updatedAt: 'x', deletedAt: null, __v: 0 }
      })
      expect(res.statusCode).toBe(200)
    })
  })

  it('filters the list by a filterable column and ignores unknown query params', async () => {
    registerCrudRoutes(app, db, '/scoped-tenant', {
      table: 'tenants',
      columns: [
        { db: 'name', api: 'name' },
        { db: 'customer_id', api: 'customerId' }
      ],
      filterableColumns: ['customerId']
    })
    await app.inject({ method: 'POST', url: '/tenant', payload: { name: 'A', customerId: 'c1' } })
    await app.inject({ method: 'POST', url: '/tenant', payload: { name: 'B', customerId: 'c2' } })

    const res = await app.inject({ method: 'GET', url: '/scoped-tenant?customerId=c1&deletedAt=null&sort=-createdAt' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.docs.map((d: { name: string }) => d.name)).toEqual(['A'])
  })

  it('404s on an unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenant/does-not-exist' })
    expect(res.statusCode).toBe(404)
  })
})

describe('registerCrudRoutes (scoped)', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof Fastify>

  beforeEach(() => {
    db = openDb(':memory:')
    app = Fastify()
    app.setErrorHandler((err: any, _req, reply) => reply.status(err.status ?? 500).send({ error: { message: err.message } }))
    registerCrudRoutes(app, db, '/tenant/:tenantId/location', {
      table: 'locations',
      columns: [
        { db: 'name', api: 'name' },
        { db: 'address', api: 'address' },
        { db: 'city', api: 'city' },
        { db: 'country', api: 'country' }
      ],
      scope: { column: 'tenant_id', param: 'tenantId' },
      sortableColumns: ['name'],
      defaultSort: 'name'
    })
  })

  it('supports create, list, get, patch, delete within a scope, and hides docs from other scopes', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/tenant/tenant-a/location',
      payload: { name: 'HQ' }
    })
    expect(created.statusCode).toBe(200)
    const doc = created.json().data
    expect(doc.name).toBe('HQ')

    const listedA = await app.inject({ method: 'GET', url: '/tenant/tenant-a/location' })
    expect(listedA.json().data.docs).toHaveLength(1)

    const listedB = await app.inject({ method: 'GET', url: '/tenant/tenant-b/location' })
    expect(listedB.json().data.docs).toHaveLength(0)

    const gotA = await app.inject({ method: 'GET', url: `/tenant/tenant-a/location/${doc._id}` })
    expect(gotA.statusCode).toBe(200)
    expect(gotA.json().data.name).toBe('HQ')

    const gotB = await app.inject({ method: 'GET', url: `/tenant/tenant-b/location/${doc._id}` })
    expect(gotB.statusCode).toBe(404)

    const patchedA = await app.inject({
      method: 'PATCH',
      url: `/tenant/tenant-a/location/${doc._id}`,
      payload: { name: 'HQ UPDATED' }
    })
    expect(patchedA.statusCode).toBe(200)
    expect(patchedA.json().data.name).toBe('HQ UPDATED')

    const deletedB = await app.inject({ method: 'DELETE', url: `/tenant/tenant-b/location/${doc._id}` })
    expect(deletedB.statusCode).toBe(404)

    const deletedA = await app.inject({ method: 'DELETE', url: `/tenant/tenant-a/location/${doc._id}` })
    expect(deletedA.json()).toEqual({ success: true })
  })

  it('PATCH with a no-op body does not leak another scope\'s document (404, not 200)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/tenant/tenant-a/location',
      payload: { name: 'HQ' }
    })
    const doc = created.json().data

    // Empty body -> docToRow produces zero matching keys -> UPDATE (and its scope check) is skipped
    // entirely, falling through to the re-fetch SELECT. That SELECT must still be scoped.
    const patchedFromWrongScope = await app.inject({
      method: 'PATCH',
      url: `/tenant/tenant-b/location/${doc._id}`,
      payload: {}
    })
    expect(patchedFromWrongScope.statusCode).toBe(404)

    // Sanity: the document is untouched and still visible under its real scope.
    const stillThere = await app.inject({ method: 'GET', url: `/tenant/tenant-a/location/${doc._id}` })
    expect(stillThere.statusCode).toBe(200)
    expect(stillThere.json().data.name).toBe('HQ')
  })
})
