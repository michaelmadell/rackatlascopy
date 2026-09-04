import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { ZodError } from 'zod'
import type Database from 'better-sqlite3'
import { ApiError } from './lib/errors'
import { registerAuthRoutes } from './auth/routes'
import { createAuthHook } from './auth/middleware'
import { registerTenantRoutes } from './routes/tenant'
import { registerUserRoutes } from './routes/user'
import { registerCustomerRoutes } from './routes/customer'
import { registerLocationRoutes } from './routes/location'
import { registerDeviceRoutes } from './routes/device'
import { registerDeviceConnectionRoutes } from './routes/device-connection'
import { registerNetworkRoutes } from './routes/network'
import { registerMoveRoutes } from './routes/move'
import { registerCustomRackDeviceRoutes } from './routes/custom-rack-device'
import { registerAnnouncementRoutes } from './routes/announcement'
import { registerLogRoutes } from './routes/log'
import { registerExportRoutes } from './routes/export'
import { registerSupportRoutes } from './routes/support'

export interface BuildAppOptions {
  db: Database.Database
  jwtSecret: string
  corsOrigin?: string
}

export function buildApp(opts: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: opts.corsOrigin ?? 'http://localhost:5178' })
  app.register(multipart)

  app.get('/health', async () => ({ status: 'ok' }))
  registerAuthRoutes(app, opts.db, opts.jwtSecret)

  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', createAuthHook(opts.db, opts.jwtSecret))
    registerTenantRoutes(protectedRoutes, opts.db)
    registerUserRoutes(protectedRoutes, opts.db)
    registerCustomerRoutes(protectedRoutes, opts.db)
    registerLocationRoutes(protectedRoutes, opts.db)
    registerDeviceRoutes(protectedRoutes, opts.db)
    registerDeviceConnectionRoutes(protectedRoutes, opts.db)
    registerNetworkRoutes(protectedRoutes, opts.db)
    registerMoveRoutes(protectedRoutes, opts.db)
    registerCustomRackDeviceRoutes(protectedRoutes, opts.db)
    registerAnnouncementRoutes(protectedRoutes, opts.db)
    registerLogRoutes(protectedRoutes, opts.db)
    registerExportRoutes(protectedRoutes)
    registerSupportRoutes(protectedRoutes)
  })

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
