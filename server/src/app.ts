import Fastify, { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { ApiError } from './lib/errors'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true })

  app.get('/health', async () => ({ status: 'ok' }))

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) {
      reply.status(err.status).send({ error: { message: err.message } })
      return
    }
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(', ')
      reply.status(400).send({ error: { message } })
      return
    }
    app.log.error(err)
    reply.status(500).send({ error: { message: 'Internal server error' } })
  })

  return app
}
