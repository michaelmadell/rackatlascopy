import { describe, it, expect } from 'vitest'
import { buildApp } from './app'
import { openDb } from './db'
import { ApiError } from './lib/errors'
import { ZodError, z } from 'zod'

describe('app', () => {
  it('GET /health returns ok', async () => {
    const app = buildApp({ db: openDb(':memory:'), jwtSecret: 'test-secret' })
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})

describe('error handling', () => {
  it('maps ApiError to { error: { message } } with its status', async () => {
    const app = buildApp({ db: openDb(':memory:'), jwtSecret: 'test-secret' })
    app.get('/__throws-api-error', async () => {
      throw new ApiError(404, 'widget not found')
    })
    const res = await app.inject({ method: 'GET', url: '/__throws-api-error' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: { message: 'widget not found' } })
  })

  it('maps ZodError to 400 with a joined message', async () => {
    const app = buildApp({ db: openDb(':memory:'), jwtSecret: 'test-secret' })
    app.get('/__throws-zod-error', async () => {
      z.object({ name: z.string() }).parse({})
    })
    const res = await app.inject({ method: 'GET', url: '/__throws-zod-error' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('name')
  })

  it('maps unknown errors to 500 with a generic message', async () => {
    const app = buildApp({ db: openDb(':memory:'), jwtSecret: 'test-secret' })
    app.get('/__throws-unknown', async () => {
      throw new Error('boom')
    })
    const res = await app.inject({ method: 'GET', url: '/__throws-unknown' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: { message: 'Internal server error' } })
  })
})
