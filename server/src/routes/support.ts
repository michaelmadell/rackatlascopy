import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

export function registerSupportRoutes(app: FastifyInstance): void {
  app.post('/support/request', async () => {
    const reference = randomUUID()
    const ticketNumber = `LOCAL-${Date.now()}`
    return { data: { reference, ticketNumber } }
  })
}
