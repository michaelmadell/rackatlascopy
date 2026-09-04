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

  it('404s on an unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenant/does-not-exist' })
    expect(res.statusCode).toBe(404)
  })
})
