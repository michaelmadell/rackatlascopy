import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('announcement routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>
  let announcementId: string

  beforeEach(() => {
    db = openDb(':memory:')
    // The mock-dev-access-token used by AUTH resolves to the first seeded user
    // (see auth/middleware.ts) — every protected-route test file seeds one.
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
    announcementId = randomUUID()
    db.prepare(
      `INSERT INTO announcements (id, title, body, active, dismissed_by_json) VALUES (?, ?, ?, 1, '[]')`
    ).run(announcementId, 'Welcome', 'Welcome to the DCIM tool')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('GET /announcement/active returns active, non-dismissed announcements', async () => {
    const res = await app.inject({ method: 'GET', url: '/announcement/active', headers: AUTH })
    expect(res.json().data).toHaveLength(1)
  })

  it('POST /announcement/:id/dismiss removes it from /active for that user', async () => {
    const dismiss = await app.inject({
      method: 'POST',
      url: `/announcement/${announcementId}/dismiss`,
      headers: AUTH
    })
    expect(dismiss.statusCode).toBe(200)

    const active = await app.inject({ method: 'GET', url: '/announcement/active', headers: AUTH })
    expect(active.json().data).toHaveLength(0)
  })

  it('GET /announcement lists everything regardless of dismissal', async () => {
    await app.inject({ method: 'POST', url: `/announcement/${announcementId}/dismiss`, headers: AUTH })
    const res = await app.inject({ method: 'GET', url: '/announcement', headers: AUTH })
    expect(res.json().data.docs).toHaveLength(1)
  })

  it('dismiss is idempotent and does not duplicate the user id in dismissed_by_json', async () => {
    await app.inject({ method: 'POST', url: `/announcement/${announcementId}/dismiss`, headers: AUTH })
    const res = await app.inject({ method: 'POST', url: `/announcement/${announcementId}/dismiss`, headers: AUTH })
    expect(res.statusCode).toBe(200)

    const row = db.prepare('SELECT dismissed_by_json FROM announcements WHERE id = ?').get(announcementId) as {
      dismissed_by_json: string
    }
    expect(JSON.parse(row.dismissed_by_json)).toHaveLength(1)
  })

  it('dismissing for one user does not mark it dismissed for another user', async () => {
    const otherUserId = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(otherUserId, 'other@example.com', bcrypt.hashSync('other', 10), 'Other', 'user', 0, 'cust-1')

    await app.inject({ method: 'POST', url: `/announcement/${announcementId}/dismiss`, headers: AUTH })

    // mock-dev-access-token always resolves to the FIRST seeded user, so directly
    // inspect the row-level effect for a second user rather than trying to
    // authenticate as them through the mock token.
    const row = db.prepare('SELECT dismissed_by_json FROM announcements WHERE id = ?').get(announcementId) as {
      dismissed_by_json: string
    }
    const dismissedBy = JSON.parse(row.dismissed_by_json)
    expect(dismissedBy).not.toContain(otherUserId)
  })

  it('POST /announcement/dismiss-all only affects active announcements', async () => {
    const inactiveId = randomUUID()
    db.prepare(
      `INSERT INTO announcements (id, title, body, active, dismissed_by_json) VALUES (?, ?, ?, 0, '[]')`
    ).run(inactiveId, 'Old news', 'No longer active')

    const res = await app.inject({ method: 'POST', url: '/announcement/dismiss-all', headers: AUTH })
    expect(res.statusCode).toBe(200)

    const activeRow = db.prepare('SELECT dismissed_by_json FROM announcements WHERE id = ?').get(announcementId) as {
      dismissed_by_json: string
    }
    expect(JSON.parse(activeRow.dismissed_by_json)).toHaveLength(1)

    const inactiveRow = db.prepare('SELECT dismissed_by_json FROM announcements WHERE id = ?').get(inactiveId) as {
      dismissed_by_json: string
    }
    expect(JSON.parse(inactiveRow.dismissed_by_json)).toHaveLength(0)

    const active = await app.inject({ method: 'GET', url: '/announcement/active', headers: AUTH })
    expect(active.json().data).toHaveLength(0)
  })
})
