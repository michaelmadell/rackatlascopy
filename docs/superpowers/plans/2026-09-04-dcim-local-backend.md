# DCIM Local Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a real local backend (`server/`) for the `reactsource` DCIM frontend, seeded with org admin `admin@example.com`/`admin`, organisation "Amulet" on a full/active subscription, and sample DCIM data — replacing the frontend's hardcoded in-file mock adapter.

**Architecture:** Fastify + TypeScript service backed by a single SQLite file (`better-sqlite3`). A generic CRUD-route factory (`lib/crud-factory.ts`) generates list/get/create/patch/delete handlers per resource table from a small config object; resources with bespoke behaviour (self, login, avatar, move, bulk, dismiss, export) get hand-written routes alongside. Auth middleware accepts either the frontend's hardcoded Auth0-shim bearer token (resolves to the seeded admin) or a real JWT from `POST /auth/login`.

**Tech Stack:** Node, TypeScript, Fastify, `@fastify/cors`, `@fastify/multipart`, `better-sqlite3`, `zod`, `bcrypt`, `jsonwebtoken`, `tsx` (dev run), `vitest` (tests, via Fastify's `inject()`).

**Spec:** `docs/superpowers/specs/2026-09-04-dcim-local-backend-design.md`

## Global Constraints

- No real Auth0/OAuth — the frontend's `@auth0/auth0-react` import is globally aliased to `src/shims/auth0.tsx`, always sending `Bearer mock-dev-access-token`.
- No per-request permission enforcement beyond the seeded `permissions` array on `/user/self`.
- No `?select=` field projection — full documents always returned.
- No real file storage for avatar/icon uploads — those endpoints accept the request and return success without persisting binary data.
- Response envelopes: list = `{ data: { docs, totalDocs, totalPages } }`, single = `{ data: {...} }`, delete = `{ success: true }`, error = `{ error: { message } }` (matches `error.response.data?.error?.message || error.response.data?.message` in `reactsource/src/hooks/useAuthenticatedApi.ts`).
- Every document echoes its id as both `_id` and `id`, per `reactsource/src/types/index.ts`.
- Schema deviation from the spec's table sketch: `floors` and `rooms` gain a denormalized `tenant_id` column (not listed in spec §5) so the generic CRUD factory can scope `/tenant/:tenantId/floor` and `/tenant/:tenantId/room` the same way it already scopes `devices` (which the spec does give a `tenant_id` column). Noted here since it's an addition beyond the approved spec text, not a contradiction of its intent.

---

### Task 1: Project scaffold + health check

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/.gitignore`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Test: `server/src/app.test.ts`

**Interfaces:**
- Produces: `buildApp(): FastifyInstance` from `src/app.ts` — no DB/auth wiring yet, later tasks extend it. `GET /health` → `{ status: 'ok' }`.

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "dcim-server",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "seed": "tsx src/seed.ts",
    "db:reset": "node -e \"require('fs').rmSync('data/dcim.sqlite', { force: true })\" && npm run seed",
    "test": "vitest run"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "@fastify/multipart": "^9.0.1",
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.5.0",
    "dotenv": "^16.4.5",
    "fastify": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/better-sqlite3": "^7.6.11",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.9.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node'
  }
})
```

- [ ] **Step 4: Create `server/.gitignore`**

```
node_modules/
data/
.env
dist/
```

- [ ] **Step 5: Install dependencies**

Run: `cd server && npm install`
Expected: `node_modules/` populated, no errors (native build of `better-sqlite3` succeeds).

- [ ] **Step 6: Write the failing test**

`server/src/app.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildApp } from './app'

describe('app', () => {
  it('GET /health returns ok', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd server && npx vitest run src/app.test.ts`
Expected: FAIL — `./app` has no exported member `buildApp` (file doesn't exist yet).

- [ ] **Step 8: Create `server/src/app.ts`**

```ts
import Fastify, { FastifyInstance } from 'fastify'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

- [ ] **Step 9: Create `server/src/index.ts`**

```ts
import 'dotenv/config'
import { buildApp } from './app'

const port = Number(process.env.PORT) || 4000

buildApp()
  .listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`dcim-server listening on :${port}`))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd server && npx vitest run src/app.test.ts`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add server/package.json server/tsconfig.json server/vitest.config.ts server/.gitignore server/src/app.ts server/src/index.ts server/src/app.test.ts
git commit -m "feat(server): scaffold Fastify app with health check"
```

---

### Task 2: SQLite schema

**Files:**
- Create: `server/src/db.ts`
- Test: `server/src/db.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `openDb(dbPath?: string): Database.Database` from `src/db.ts` — creates all tables if missing (idempotent `CREATE TABLE IF NOT EXISTS`). Every later task that touches SQLite imports this.

- [ ] **Step 1: Write the failing test**

`server/src/db.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/db.test.ts`
Expected: FAIL — `./db` doesn't exist.

- [ ] **Step 3: Create `server/src/db.ts`**

```ts
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_DB_PATH = path.resolve(__dirname, '../data/dcim.sqlite')

export function openDb(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  migrate(db)
  return db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      role TEXT,
      is_customer_admin INTEGER DEFAULT 0,
      customer_id TEXT,
      language TEXT DEFAULT 'en',
      permissions_json TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      billing_json TEXT,
      custom_device_types_json TEXT
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      customer_id TEXT
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      country TEXT
    );

    CREATE TABLE IF NOT EXISTS floors (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      floor_plan_image TEXT,
      bounds_json TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      floor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT,
      color TEXT,
      polygon_json TEXT
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      location_id TEXT,
      room_id TEXT,
      rack_id TEXT,
      name TEXT NOT NULL,
      label TEXT,
      type TEXT,
      unit INTEGER,
      height_u INTEGER,
      side TEXT,
      sub_devices_json TEXT,
      ports_json TEXT,
      floor_plan_position_json TEXT
    );

    CREATE TABLE IF NOT EXISTS device_connections (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      from_device_id TEXT NOT NULL,
      from_port TEXT,
      to_device_id TEXT NOT NULL,
      to_port TEXT,
      cable_color TEXT,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS vlans (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      vlan_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      ports_json TEXT
    );

    CREATE TABLE IF NOT EXISTS wlans (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      ssid TEXT NOT NULL,
      security TEXT,
      description TEXT,
      devices_json TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_rack_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      type TEXT,
      rack_units INTEGER,
      ports_count INTEGER,
      ports_json TEXT
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      active INTEGER DEFAULT 1,
      dismissed_by_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      resource_data_json TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL
    );
  `)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/db.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/db.ts server/src/db.test.ts
git commit -m "feat(server): SQLite schema for all DCIM resources"
```

---

### Task 3: Shared error handling + pagination helpers

**Files:**
- Create: `server/src/lib/errors.ts`
- Create: `server/src/lib/pagination.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/lib/pagination.test.ts`
- Test: `server/src/app.test.ts` (append error-handling case)

**Interfaces:**
- Produces: `ApiError` class, `notFound(resource: string): ApiError` from `src/lib/errors.ts`; `paginate<T>(all: T[], page: number, limit: number): { docs: T[]; totalDocs: number; totalPages: number }` from `src/lib/pagination.ts`. Every route task from here on throws `ApiError`/`notFound` for error cases and uses `paginate` for list endpoints.

- [ ] **Step 1: Write the failing pagination test**

`server/src/lib/pagination.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { paginate } from './pagination'

describe('paginate', () => {
  it('slices docs and computes totals', () => {
    const all = Array.from({ length: 25 }, (_, i) => i)
    const result = paginate(all, 2, 10)
    expect(result.docs).toEqual(Array.from({ length: 10 }, (_, i) => i + 10))
    expect(result.totalDocs).toBe(25)
    expect(result.totalPages).toBe(3)
  })

  it('returns totalPages of at least 1 for an empty list', () => {
    expect(paginate([], 1, 10).totalPages).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/lib/pagination.test.ts`
Expected: FAIL — `./pagination` doesn't exist.

- [ ] **Step 3: Create `server/src/lib/pagination.ts`**

```ts
export interface DocsEnvelope<T> {
  docs: T[]
  totalDocs: number
  totalPages: number
}

export function paginate<T>(all: T[], page: number, limit: number): DocsEnvelope<T> {
  const totalDocs = all.length
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit))
  const start = (page - 1) * limit
  return { docs: all.slice(start, start + limit), totalDocs, totalPages }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/lib/pagination.test.ts`
Expected: PASS

- [ ] **Step 5: Create `server/src/lib/errors.ts`**

```ts
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFound(resource: string): ApiError {
  return new ApiError(404, `${resource} not found`)
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError(401, message)
}
```

- [ ] **Step 6: Write the failing error-handler test**

Append to `server/src/app.test.ts`:

```ts
import { ApiError } from './lib/errors'
import { ZodError, z } from 'zod'

describe('error handling', () => {
  it('maps ApiError to { error: { message } } with its status', async () => {
    const app = buildApp()
    app.get('/__throws-api-error', async () => {
      throw new ApiError(404, 'widget not found')
    })
    const res = await app.inject({ method: 'GET', url: '/__throws-api-error' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: { message: 'widget not found' } })
  })

  it('maps ZodError to 400 with a joined message', async () => {
    const app = buildApp()
    app.get('/__throws-zod-error', async () => {
      z.object({ name: z.string() }).parse({})
    })
    const res = await app.inject({ method: 'GET', url: '/__throws-zod-error' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('name')
  })

  it('maps unknown errors to 500 with a generic message', async () => {
    const app = buildApp()
    app.get('/__throws-unknown', async () => {
      throw new Error('boom')
    })
    const res = await app.inject({ method: 'GET', url: '/__throws-unknown' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: { message: 'Internal server error' } })
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd server && npx vitest run src/app.test.ts`
Expected: FAIL — all three error-handling assertions fail (Fastify's default error handler shape doesn't match).

- [ ] **Step 8: Modify `server/src/app.ts`** to register a custom error handler

```ts
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
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd server && npx vitest run src/app.test.ts`
Expected: PASS (all cases, including the original health check)

- [ ] **Step 10: Commit**

```bash
git add server/src/lib/errors.ts server/src/lib/pagination.ts server/src/app.ts server/src/app.test.ts server/src/lib/pagination.test.ts
git commit -m "feat(server): shared ApiError/pagination helpers + error handler"
```

---

### Task 4: Auth middleware + `POST /auth/login`

**Files:**
- Create: `server/src/auth/middleware.ts`
- Create: `server/src/auth/routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/auth/middleware.test.ts`
- Test: `server/src/auth/routes.test.ts`

**Interfaces:**
- Consumes: `openDb` (Task 2), `ApiError`/`unauthorized` (Task 3).
- Produces: `AuthUser` interface and `createAuthHook(db, jwtSecret): preHandler` from `src/auth/middleware.ts` — sets `req.user`. Every protected route task from here on registers this hook (directly or via `crud-factory.ts` in Task 5) and reads `req.user`. `registerAuthRoutes(app, db, jwtSecret)` from `src/auth/routes.ts` mounts `POST /auth/login`.

- [ ] **Step 1: Write the failing middleware test**

`server/src/auth/middleware.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { openDb } from '../db'
import { createAuthHook } from './middleware'

const SECRET = 'test-secret'

function seedUser(db: ReturnType<typeof openDb>) {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
  return id
}

describe('createAuthHook', () => {
  let db: ReturnType<typeof openDb>

  beforeEach(() => {
    db = openDb(':memory:')
  })

  it('rejects requests with no Authorization header', async () => {
    seedUser(db)
    const app = Fastify()
    app.addHook('preHandler', createAuthHook(db, SECRET))
    app.get('/protected', async (req) => ({ user: req.user }))
    const res = await app.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(401)
  })

  it('resolves the dev mock token to the seeded user', async () => {
    seedUser(db)
    const app = Fastify()
    app.setErrorHandler((err: any, _req, reply) => reply.status(err.status ?? 500).send({ error: { message: err.message } }))
    app.addHook('preHandler', createAuthHook(db, SECRET))
    app.get('/protected', async (req) => ({ user: req.user }))
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer mock-dev-access-token' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.email).toBe('admin@example.com')
  })

  it('resolves a valid JWT to its subject user', async () => {
    const id = seedUser(db)
    const token = jwt.sign({ sub: id }, SECRET)
    const app = Fastify()
    app.addHook('preHandler', createAuthHook(db, SECRET))
    app.get('/protected', async (req) => ({ user: req.user }))
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().user.id).toBe(id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/auth/middleware.test.ts`
Expected: FAIL — `./middleware` doesn't exist.

- [ ] **Step 3: Create `server/src/auth/middleware.ts`**

```ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import type Database from 'better-sqlite3'
import { unauthorized } from '../lib/errors'

export interface AuthUser {
  id: string
  email: string
  name: string
  customerId: string | null
  role: string | null
  isCustomerAdmin: boolean
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}

export function createAuthHook(db: Database.Database, jwtSecret: string) {
  return async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ') || header.length <= 'Bearer '.length) {
      throw unauthorized()
    }
    const token = header.slice('Bearer '.length)

    let userId: string | undefined
    try {
      const payload = jwt.verify(token, jwtSecret) as { sub: string }
      userId = payload.sub
    } catch {
      // Not a JWT we issued (e.g. the Auth0 shim's static 'mock-dev-access-token') —
      // any non-empty bearer token falls back to the single seeded dev session.
      const row = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined
      userId = row?.id
    }

    if (!userId) throw unauthorized()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!row) throw unauthorized()

    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      customerId: row.customer_id,
      role: row.role,
      isCustomerAdmin: !!row.is_customer_admin
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/auth/middleware.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing login-route test**

`server/src/auth/routes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { openDb } from '../db'
import { registerAuthRoutes } from './routes'
import { ApiError } from '../lib/errors'

const SECRET = 'test-secret'

describe('POST /auth/login', () => {
  let db: ReturnType<typeof openDb>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-1')
  })

  function buildTestApp() {
    const app = Fastify()
    app.setErrorHandler((err: any, _req, reply) => reply.status(err.status ?? 500).send({ error: { message: err.message } }))
    registerAuthRoutes(app, db, SECRET)
    return app
  }

  it('returns a token + user for correct credentials', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@example.com', password: 'admin' }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.token).toBeTypeOf('string')
    expect(body.data.user.email).toBe('admin@example.com')
  })

  it('rejects the wrong password with 401', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@example.com', password: 'wrong' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects an unknown email with 401', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'admin' }
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd server && npx vitest run src/auth/routes.test.ts`
Expected: FAIL — `./routes` doesn't exist.

- [ ] **Step 7: Create `server/src/auth/routes.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import { unauthorized } from '../lib/errors'

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export function registerAuthRoutes(app: FastifyInstance, db: Database.Database, jwtSecret: string): void {
  app.post('/auth/login', async (req) => {
    const { email, password } = loginBody.parse(req.body)
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any
    if (!row) throw unauthorized('Invalid email or password')

    const ok = await bcrypt.compare(password, row.password_hash)
    if (!ok) throw unauthorized('Invalid email or password')

    const token = jwt.sign({ sub: row.id }, jwtSecret, { expiresIn: '7d' })
    return {
      data: {
        token,
        user: {
          _id: row.id,
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          isCustomerAdmin: !!row.is_customer_admin
        }
      }
    }
  })
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd server && npx vitest run src/auth/routes.test.ts`
Expected: PASS

- [ ] **Step 9: Modify `server/src/app.ts`** to accept a db + jwtSecret and wire cors, multipart, and the login route (auth hook is applied per-protected-route starting Task 5, not globally, since `/health` and `/auth/login` must stay public)

```ts
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { ZodError } from 'zod'
import type Database from 'better-sqlite3'
import { ApiError } from './lib/errors'
import { registerAuthRoutes } from './auth/routes'

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
```

This changes `buildApp`'s signature from Task 1/3 (no args) to `buildApp(opts)`. Update `server/src/app.test.ts`'s three call sites (`buildApp()` → `buildApp({ db: openDb(':memory:'), jwtSecret: 'test-secret' })`) and its `import { openDb } from './db'`.

- [ ] **Step 10: Update `server/src/index.ts`** to pass the new options

```ts
import 'dotenv/config'
import { buildApp } from './app'
import { openDb } from './db'

const port = Number(process.env.PORT) || 4000
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'

const db = openDb()

buildApp({ db, jwtSecret })
  .listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`dcim-server listening on :${port}`))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
```

- [ ] **Step 11: Run the full test suite to verify nothing broke**

Run: `cd server && npx vitest run`
Expected: PASS — all tests from Tasks 1-4 green.

- [ ] **Step 12: Commit**

```bash
git add server/src/auth server/src/app.ts server/src/app.test.ts server/src/index.ts
git commit -m "feat(server): auth middleware + POST /auth/login"
```

---

### Task 5: Generic CRUD factory + `/tenant` (first protected resource)

**Files:**
- Create: `server/src/lib/crud-factory.ts`
- Create: `server/src/routes/tenant.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/lib/crud-factory.test.ts`

**Interfaces:**
- Consumes: `openDb` (Task 2), `notFound`/`paginate` (Task 3), `createAuthHook` (Task 4).
- Produces: `ColumnDef`, `ScopeDef`, `CrudResourceConfig`, `registerCrudRoutes(app, db, basePath, config)` from `src/lib/crud-factory.ts`. Every remaining resource task (6-14) calls this.

- [ ] **Step 1: Write the failing factory test** (against a throwaway unscoped resource — reuses the real `tenants` table since it's the simplest unscoped shape already in the schema)

`server/src/lib/crud-factory.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/lib/crud-factory.test.ts`
Expected: FAIL — `./crud-factory` doesn't exist.

- [ ] **Step 3: Create `server/src/lib/crud-factory.ts`**

```ts
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { notFound } from './errors'
import { paginate } from './pagination'

export interface ColumnDef {
  db: string
  api: string
  json?: boolean
}

export interface ScopeDef {
  column: string
  param: string
}

export interface CrudResourceConfig {
  table: string
  columns: ColumnDef[]
  scope?: ScopeDef
  sortableColumns?: string[]
  defaultSort?: string
  readOnly?: boolean
}

function rowToDoc(row: Record<string, unknown>, columns: ColumnDef[]): Record<string, unknown> {
  const doc: Record<string, unknown> = { _id: row.id, id: row.id }
  for (const col of columns) {
    const raw = row[col.db]
    doc[col.api] = col.json ? (raw ? JSON.parse(raw as string) : undefined) : raw
  }
  return doc
}

function docToRow(body: Record<string, unknown>, columns: ColumnDef[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const col of columns) {
    if (!(col.api in body)) continue
    const value = body[col.api]
    row[col.db] = col.json ? JSON.stringify(value ?? null) : value
  }
  return row
}

export function registerCrudRoutes(
  app: FastifyInstance,
  db: Database.Database,
  basePath: string,
  config: CrudResourceConfig
): void {
  const { table, columns, scope, sortableColumns = [], defaultSort, readOnly } = config
  const allCols = ['id', ...(scope ? [scope.column] : []), ...columns.map((c) => c.db)]

  function scopeValue(req: FastifyRequest): string | undefined {
    return scope ? (req.params as Record<string, string>)[scope.param] : undefined
  }

  app.get(basePath, async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 100
    const sortParam = query.sort || defaultSort

    let sql = `SELECT ${allCols.join(', ')} FROM ${table}`
    const params: unknown[] = []
    if (scope) {
      sql += ` WHERE ${scope.column} = ?`
      params.push(scopeValue(req))
    }
    if (sortParam) {
      const desc = sortParam.startsWith('-')
      const apiField = desc ? sortParam.slice(1) : sortParam
      const col = columns.find((c) => c.api === apiField)
      if (col && sortableColumns.includes(apiField)) {
        sql += ` ORDER BY ${col.db} ${desc ? 'DESC' : 'ASC'}`
      }
    }
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    const docs = rows.map((r) => rowToDoc(r, columns))
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })

  app.get(`${basePath}/:id`, async (req) => {
    const { id } = req.params as { id: string }
    let sql = `SELECT ${allCols.join(', ')} FROM ${table} WHERE id = ?`
    const params: unknown[] = [id]
    if (scope) {
      sql += ` AND ${scope.column} = ?`
      params.push(scopeValue(req))
    }
    const row = db.prepare(sql).get(...params) as Record<string, unknown> | undefined
    if (!row) throw notFound(table)
    return { data: rowToDoc(row, columns) }
  })

  if (!readOnly) {
    app.post(basePath, async (req) => {
      const body = (req.body ?? {}) as Record<string, unknown>
      const id = (body._id as string) || (body.id as string) || randomUUID()
      const rowValues = docToRow(body, columns)
      const cols = ['id', ...(scope ? [scope.column] : []), ...Object.keys(rowValues)]
      const values = [id, ...(scope ? [scopeValue(req)] : []), ...Object.values(rowValues)]
      const placeholders = cols.map(() => '?').join(', ')
      db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values)
      const created = db.prepare(`SELECT ${allCols.join(', ')} FROM ${table} WHERE id = ?`).get(id) as Record<string, unknown>
      return { data: rowToDoc(created, columns) }
    })

    app.patch(`${basePath}/:id`, async (req) => {
      const { id } = req.params as { id: string }
      const body = (req.body ?? {}) as Record<string, unknown>
      const rowValues = docToRow(body, columns)
      const keys = Object.keys(rowValues)
      if (keys.length > 0) {
        let sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`
        const params: unknown[] = [...keys.map((k) => rowValues[k]), id]
        if (scope) {
          sql += ` AND ${scope.column} = ?`
          params.push(scopeValue(req))
        }
        const result = db.prepare(sql).run(...params)
        if (result.changes === 0) throw notFound(table)
      }
      const updated = db.prepare(`SELECT ${allCols.join(', ')} FROM ${table} WHERE id = ?`).get(id) as
        | Record<string, unknown>
        | undefined
      if (!updated) throw notFound(table)
      return { data: rowToDoc(updated, columns) }
    })

    app.delete(`${basePath}/:id`, async (req) => {
      const { id } = req.params as { id: string }
      let sql = `DELETE FROM ${table} WHERE id = ?`
      const params: unknown[] = [id]
      if (scope) {
        sql += ` AND ${scope.column} = ?`
        params.push(scopeValue(req))
      }
      const result = db.prepare(sql).run(...params)
      if (result.changes === 0) throw notFound(table)
      return { success: true }
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/lib/crud-factory.test.ts`
Expected: PASS

- [ ] **Step 5: Create `server/src/routes/tenant.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'

export function registerTenantRoutes(app: FastifyInstance, db: Database.Database): void {
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
}
```

- [ ] **Step 6: Modify `server/src/app.ts`** — add an authenticated route group and mount `/tenant` inside it

```ts
import { createAuthHook } from './auth/middleware'
import { registerTenantRoutes } from './routes/tenant'
```

Inside `buildApp`, after `registerAuthRoutes(app, opts.db, opts.jwtSecret)`:

```ts
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', createAuthHook(opts.db, opts.jwtSecret))
    registerTenantRoutes(protectedRoutes, opts.db)
  })
```

(Fastify's plugin encapsulation means the `preHandler` hook added inside this registered scope applies only to routes registered within it — `/health` and `/auth/login`, registered directly on `app`, stay public.)

- [ ] **Step 7: Run the full test suite**

Run: `cd server && npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add server/src/lib/crud-factory.ts server/src/lib/crud-factory.test.ts server/src/routes/tenant.ts server/src/app.ts
git commit -m "feat(server): generic CRUD factory + /tenant routes"
```

---

### Task 6: User routes

**Files:**
- Create: `server/src/routes/user.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/user.test.ts`

**Interfaces:**
- Consumes: `createAuthHook` (Task 4), `notFound`/`ApiError` (Task 3).
- Produces: `registerUserRoutes(app, db)` mounting `GET /user/self`, `GET /user/:id`, `POST /user`, `PATCH /user/:id`, `DELETE /user/:id`, `POST /user/:id/avatar`, `POST /user/:id/password`, `POST /user/:id/change-customer`.

- [ ] **Step 1: Write the failing test**

`server/src/routes/user.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('user routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>
  let userId: string

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare(
      `INSERT INTO customers (id, name, billing_json) VALUES (?, ?, ?)`
    ).run('cust-amulet', 'Amulet', JSON.stringify({ subscriptionStatus: 'active', plan: 'enterprise' }))
    userId = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, permissions_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, 'cust-amulet', '[]')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('GET /user/self returns the authenticated user', async () => {
    const res = await app.inject({ method: 'GET', url: '/user/self', headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.email).toBe('admin@example.com')
    expect(res.json().data.customerId).toBe('cust-amulet')
  })

  it('POST /user creates a user with a hashed password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/user',
      headers: AUTH,
      payload: { email: 'new@example.com', name: 'New User', password: 'hunter2', customerId: 'cust-amulet' }
    })
    expect(res.statusCode).toBe(200)
    const created = res.json().data
    expect(created.email).toBe('new@example.com')
    expect(created.password).toBeUndefined()

    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(created._id) as any
    expect(await bcrypt.compare('hunter2', row.password_hash)).toBe(true)
  })

  it('PATCH /user/:id updates name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/user/${userId}`,
      headers: AUTH,
      payload: { name: 'Renamed' }
    })
    expect(res.json().data.name).toBe('Renamed')
  })

  it('POST /user/:id/password rehashes the password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/user/${userId}/password`,
      headers: AUTH,
      payload: { password: 'newpass123' }
    })
    expect(res.statusCode).toBe(200)
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any
    expect(await bcrypt.compare('newpass123', row.password_hash)).toBe(true)
  })

  it('DELETE /user/:id removes the user', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/user/${userId}`, headers: AUTH })
    expect(res.json()).toEqual({ success: true })
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(userId)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/user.test.ts`
Expected: FAIL — `registerUserRoutes` / `/user/self` route don't exist yet.

- [ ] **Step 3: Create `server/src/routes/user.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { notFound } from '../lib/errors'

function rowToUserDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
    isCustomerAdmin: !!row.is_customer_admin,
    customerId: row.customer_id,
    language: row.language,
    permissions: row.permissions_json ? JSON.parse(row.permissions_json) : []
  }
}

const createUserBody = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1),
  role: z.string().optional(),
  customerId: z.string().optional(),
  isCustomerAdmin: z.boolean().optional()
})

const patchUserBody = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  language: z.string().optional(),
  isCustomerAdmin: z.boolean().optional()
})

export function registerUserRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/user/self', async (req) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any
    if (!row) throw notFound('user')
    const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(row.customer_id) as any
    return { data: { ...rowToUserDoc(row), customerId: customer?.id ?? row.customer_id } }
  })

  app.get('/user/:id', async (req) => {
    const { id } = req.params as { id: string }
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!row) throw notFound('user')
    return { data: rowToUserDoc(row) }
  })

  app.post('/user', async (req) => {
    const body = createUserBody.parse(req.body)
    const id = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, permissions_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.email,
      bcrypt.hashSync(body.password, 10),
      body.name,
      body.role ?? 'member',
      body.isCustomerAdmin ? 1 : 0,
      body.customerId ?? null,
      '[]'
    )
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    return { data: rowToUserDoc(row) }
  })

  app.patch('/user/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = patchUserBody.parse(req.body)
    const sets: string[] = []
    const values: unknown[] = []
    if (body.name !== undefined) { sets.push('name = ?'); values.push(body.name) }
    if (body.role !== undefined) { sets.push('role = ?'); values.push(body.role) }
    if (body.language !== undefined) { sets.push('language = ?'); values.push(body.language) }
    if (body.isCustomerAdmin !== undefined) { sets.push('is_customer_admin = ?'); values.push(body.isCustomerAdmin ? 1 : 0) }
    if (sets.length > 0) {
      const result = db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values, id)
      if (result.changes === 0) throw notFound('user')
    }
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!row) throw notFound('user')
    return { data: rowToUserDoc(row) }
  })

  app.delete('/user/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })

  app.post('/user/:id/avatar', async (req) => {
    const { id } = req.params as { id: string }
    // Local dev stub: accepts the multipart upload, doesn't persist the file.
    await req.file()
    const url = `https://avatar.vercel.sh/${id}`
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, id)
    return { data: { avatar: url } }
  })

  app.post('/user/:id/password', async (req) => {
    const { id } = req.params as { id: string }
    const { password } = z.object({ password: z.string().min(1) }).parse(req.body)
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })

  app.post('/user/:id/change-customer', async (req) => {
    const { id } = req.params as { id: string }
    const { customerId } = z.object({ customerId: z.string() }).parse(req.body)
    const result = db.prepare('UPDATE users SET customer_id = ? WHERE id = ?').run(customerId, id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerUserRoutes(protectedRoutes, opts.db)` inside the protected plugin block from Task 5.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/user.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/user.ts server/src/routes/user.test.ts server/src/app.ts
git commit -m "feat(server): user routes"
```

---

### Task 7: Customer routes

**Files:**
- Create: `server/src/routes/customer.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/customer.test.ts`

**Interfaces:**
- Produces: `registerCustomerRoutes(app, db)` mounting `GET /customer`, `GET /customer/:id`, `PATCH /customer/:id`, `PATCH /customer/:id/owner`, `DELETE /customer/:id`, `GET /icon/customer`.

- [ ] **Step 1: Write the failing test**

`server/src/routes/customer.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('customer routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>
  let customerId: string
  let otherUserId: string

  beforeEach(() => {
    db = openDb(':memory:')
    customerId = 'cust-amulet'
    db.prepare('INSERT INTO customers (id, name, billing_json) VALUES (?, ?, ?)').run(
      customerId,
      'Amulet',
      JSON.stringify({ subscriptionStatus: 'active', plan: 'enterprise', validUntil: '2027-12-31' })
    )
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), 'admin@example.com', bcrypt.hashSync('admin', 10), 'Admin', 'admin', 1, customerId)
    otherUserId = randomUUID()
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(otherUserId, 'member@example.com', bcrypt.hashSync('x', 10), 'Member', 'member', 0, customerId)
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('GET /customer/:id returns billing with an active subscription', async () => {
    const res = await app.inject({ method: 'GET', url: `/customer/${customerId}`, headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.billing.subscriptionStatus).toBe('active')
    expect(res.json().data.billing.plan).toBe('enterprise')
  })

  it('PATCH /customer/:id updates name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}`,
      headers: AUTH,
      payload: { name: 'Amulet Hot Key' }
    })
    expect(res.json().data.name).toBe('Amulet Hot Key')
  })

  it('PATCH /customer/:id/owner flips isCustomerAdmin on the target user', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/customer/${customerId}/owner`,
      headers: AUTH,
      payload: { userId: otherUserId }
    })
    expect(res.statusCode).toBe(200)
    const row = db.prepare('SELECT is_customer_admin FROM users WHERE id = ?').get(otherUserId) as any
    expect(row.is_customer_admin).toBe(1)
  })

  it('GET /icon/customer returns a success stub', async () => {
    const res = await app.inject({ method: 'GET', url: '/icon/customer', headers: AUTH })
    expect(res.json()).toEqual({ success: true, data: {} })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/customer.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/customer.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { z } from 'zod'
import { notFound } from '../lib/errors'
import { paginate } from '../lib/pagination'

function rowToCustomerDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    billing: row.billing_json ? JSON.parse(row.billing_json) : {},
    customDeviceTypes: row.custom_device_types_json ? JSON.parse(row.custom_device_types_json) : []
  }
}

const patchCustomerBody = z.object({ name: z.string().min(1).optional() })

export function registerCustomerRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/customer', async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 100
    const rows = db.prepare('SELECT * FROM customers').all() as any[]
    const docs = rows.map(rowToCustomerDoc)
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })

  app.get('/customer/:id', async (req) => {
    const { id } = req.params as { id: string }
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
    if (!row) throw notFound('customer')
    return { data: rowToCustomerDoc(row) }
  })

  app.patch('/customer/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = patchCustomerBody.parse(req.body)
    if (body.name !== undefined) {
      const result = db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(body.name, id)
      if (result.changes === 0) throw notFound('customer')
    }
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
    if (!row) throw notFound('customer')
    return { data: rowToCustomerDoc(row) }
  })

  app.patch('/customer/:id/owner', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = z.object({ userId: z.string() }).parse(req.body)
    const result = db
      .prepare('UPDATE users SET is_customer_admin = 1 WHERE id = ? AND customer_id = ?')
      .run(userId, id)
    if (result.changes === 0) throw notFound('user')
    return { success: true }
  })

  app.delete('/customer/:id', async (req) => {
    const { id } = req.params as { id: string }
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    if (result.changes === 0) throw notFound('customer')
    return { success: true }
  })

  app.get('/icon/customer', async () => ({ success: true, data: {} }))
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerCustomerRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/customer.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/customer.ts server/src/routes/customer.test.ts server/src/app.ts
git commit -m "feat(server): customer (org) routes"
```

---

### Task 8: Location, Floor, Room routes

**Files:**
- Create: `server/src/routes/location.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/location.test.ts`

**Interfaces:**
- Consumes: `registerCrudRoutes` (Task 5).
- Produces: `registerLocationRoutes(app, db)` mounting tenant-scoped `/tenant/:tenantId/location`, `/tenant/:tenantId/floor` (+ `GET .../floor-plan`), `/tenant/:tenantId/room` (+ `POST .../room/bulk`).

- [ ] **Step 1: Write the failing test**

`server/src/routes/location.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('location/floor/room routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(TENANT_ID, 'HOME', 'cust-1')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('creates a location, floor, and room, scoped by tenantId', async () => {
    const location = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/location`,
      headers: AUTH,
      payload: { name: 'HQ', city: 'Newton Abbot', country: 'GB' }
    })
    expect(location.statusCode).toBe(200)
    const locationId = location.json().data._id

    const floor = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/floor`,
      headers: AUTH,
      payload: { name: 'Ground Floor', level: 0, locationId }
    })
    expect(floor.statusCode).toBe(200)
    const floorId = floor.json().data._id

    const room = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/room`,
      headers: AUTH,
      payload: { name: 'Server Room', floorId }
    })
    expect(room.statusCode).toBe(200)

    const listedLocations = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/location` })
    expect(listedLocations.json().data.totalDocs).toBe(1)

    const listedFloors = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/floor` })
    expect(listedFloors.json().data.docs[0].locationId).toBe(locationId)
  })

  it('does not return resources scoped to a different tenant', async () => {
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run('tenant-2', 'OTHER', 'cust-1')
    await app.inject({
      method: 'POST',
      url: '/tenant/tenant-2/location',
      headers: AUTH,
      payload: { name: 'Other HQ' }
    })
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/location` })
    expect(res.json().data.totalDocs).toBe(0)
  })

  it('POST /tenant/:tenantId/room/bulk creates multiple rooms', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/room/bulk`,
      headers: AUTH,
      payload: { rooms: [{ name: 'Room A', floorId: 'flr-1' }, { name: 'Room B', floorId: 'flr-1' }] }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(2)
  })

  it('GET /tenant/:tenantId/floor/:id/floor-plan returns bounds + rooms', async () => {
    const floor = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/floor`,
      headers: AUTH,
      payload: { name: 'Ground Floor', level: 0, locationId: 'loc-1', bounds: { width: 100, height: 80 } }
    })
    const floorId = floor.json().data._id
    const res = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/floor/${floorId}/floor-plan` })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.bounds).toEqual({ width: 100, height: 80 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/location.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/location.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { registerCrudRoutes } from '../lib/crud-factory'
import { notFound } from '../lib/errors'

export function registerLocationRoutes(app: FastifyInstance, db: Database.Database): void {
  const scope = { column: 'tenant_id', param: 'tenantId' }

  registerCrudRoutes(app, db, '/tenant/:tenantId/location', {
    table: 'locations',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'address', api: 'address' },
      { db: 'city', api: 'city' },
      { db: 'country', api: 'country' }
    ],
    sortableColumns: ['name'],
    defaultSort: 'name'
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/floor', {
    table: 'floors',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'level', api: 'level' },
      { db: 'location_id', api: 'locationId' },
      { db: 'floor_plan_image', api: 'floorPlanImage' },
      { db: 'bounds_json', api: 'bounds', json: true }
    ],
    sortableColumns: ['name', 'level']
  })

  app.get('/tenant/:tenantId/floor/:id/floor-plan', async (req) => {
    const { tenantId, id } = req.params as { tenantId: string; id: string }
    const floor = db.prepare('SELECT * FROM floors WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any
    if (!floor) throw notFound('floor')
    const rooms = db.prepare('SELECT * FROM rooms WHERE floor_id = ? AND tenant_id = ?').all(id, tenantId) as any[]
    return {
      data: {
        _id: floor.id,
        id: floor.id,
        floorPlanImage: floor.floor_plan_image,
        bounds: floor.bounds_json ? JSON.parse(floor.bounds_json) : undefined,
        rooms: rooms.map((r) => ({
          _id: r.id,
          id: r.id,
          name: r.name,
          label: r.label,
          color: r.color,
          polygon: r.polygon_json ? JSON.parse(r.polygon_json) : []
        }))
      }
    }
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/room', {
    table: 'rooms',
    scope,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'label', api: 'label' },
      { db: 'color', api: 'color' },
      { db: 'floor_id', api: 'floorId' },
      { db: 'polygon_json', api: 'polygon', json: true }
    ],
    sortableColumns: ['name']
  })

  app.post('/tenant/:tenantId/room/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { rooms } = req.body as { rooms: Array<Record<string, unknown>> }
    const insert = db.prepare(
      `INSERT INTO rooms (id, tenant_id, floor_id, name, label, color, polygon_json) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const created = rooms.map((room) => {
      const id = randomUUID()
      insert.run(
        id,
        tenantId,
        room.floorId ?? null,
        room.name ?? '',
        room.label ?? null,
        room.color ?? null,
        JSON.stringify(room.polygon ?? [])
      )
      return { _id: id, id, ...room }
    })
    return { data: created }
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerLocationRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/location.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/location.ts server/src/routes/location.test.ts server/src/app.ts
git commit -m "feat(server): location/floor/room routes"
```

---

### Task 9: Device routes

**Files:**
- Create: `server/src/routes/device.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/device.test.ts`

**Interfaces:**
- Produces: `registerDeviceRoutes(app, db)` mounting `/tenant/:tenantId/device` CRUD + `POST .../device/bulk` + `POST .../device/:rackId/deactivate`.

- [ ] **Step 1: Write the failing test**

`server/src/routes/device.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('device routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(TENANT_ID, 'HOME', 'cust-1')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('creates and reads back a device with JSON port data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch 1', type: 'switch', rackUnits: 1, ports: [{ number: '1', type: 'rj45' }] }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.ports).toEqual([{ number: '1', type: 'rj45' }])
  })

  it('POST /device/bulk creates several devices', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/bulk`,
      headers: AUTH,
      payload: { devices: [{ name: 'D1', type: 'switch' }, { name: 'D2', type: 'patch-panel' }] }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(2)
  })

  it('POST /device/:rackId/deactivate clears rackId on child devices', async () => {
    const rack = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Rack 1', type: 'rack' }
    })
    const rackId = rack.json().data._id
    const child = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch in rack', type: 'switch', rackId }
    })
    const childId = child.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/${rackId}/deactivate`,
      headers: AUTH
    })
    expect(res.statusCode).toBe(200)

    const after = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/device/${childId}` })
    expect(after.json().data.rackId).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/device.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/device.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { registerCrudRoutes } from '../lib/crud-factory'

const deviceColumns = [
  { db: 'name', api: 'name' },
  { db: 'label', api: 'label' },
  { db: 'type', api: 'type' },
  { db: 'unit', api: 'unit' },
  { db: 'height_u', api: 'heightU' },
  { db: 'side', api: 'side' },
  { db: 'location_id', api: 'locationId' },
  { db: 'room_id', api: 'roomId' },
  { db: 'rack_id', api: 'rackId' },
  { db: 'sub_devices_json', api: 'subDevices', json: true },
  { db: 'ports_json', api: 'ports', json: true },
  { db: 'floor_plan_position_json', api: 'floorPlanPosition', json: true }
]

export function registerDeviceRoutes(app: FastifyInstance, db: Database.Database): void {
  registerCrudRoutes(app, db, '/tenant/:tenantId/device', {
    table: 'devices',
    scope: { column: 'tenant_id', param: 'tenantId' },
    columns: deviceColumns,
    sortableColumns: ['name']
  })

  app.post('/tenant/:tenantId/device/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { devices } = req.body as { devices: Array<Record<string, unknown>> }
    const insert = db.prepare(
      `INSERT INTO devices (id, tenant_id, name, label, type, unit, height_u, side, location_id, room_id, rack_id, sub_devices_json, ports_json, floor_plan_position_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const created = devices.map((device) => {
      const id = randomUUID()
      insert.run(
        id,
        tenantId,
        device.name ?? '',
        device.label ?? null,
        device.type ?? null,
        device.unit ?? null,
        device.heightU ?? null,
        device.side ?? null,
        device.locationId ?? null,
        device.roomId ?? null,
        device.rackId ?? null,
        JSON.stringify(device.subDevices ?? []),
        JSON.stringify(device.ports ?? []),
        JSON.stringify(device.floorPlanPosition ?? null)
      )
      return { _id: id, id, ...device }
    })
    return { data: created }
  })

  app.post('/tenant/:tenantId/device/:rackId/deactivate', async (req) => {
    const { tenantId, rackId } = req.params as { tenantId: string; rackId: string }
    db.prepare('UPDATE devices SET rack_id = NULL WHERE rack_id = ? AND tenant_id = ?').run(rackId, tenantId)
    return { success: true }
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerDeviceRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/device.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/device.ts server/src/routes/device.test.ts server/src/app.ts
git commit -m "feat(server): device routes"
```

---

### Task 10: DeviceConnection routes

**Files:**
- Create: `server/src/routes/device-connection.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/device-connection.test.ts`

**Interfaces:**
- Produces: `registerDeviceConnectionRoutes(app, db)` mounting `/tenant/:tenantId/device-connection` (patch/delete via factory, `readOnly` list/get suppressed since the frontend never lists connections directly — only via `device.connections`) + `POST .../batch` + `POST .../bulk`.

- [ ] **Step 1: Write the failing test**

`server/src/routes/device-connection.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('device-connection routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(TENANT_ID, 'HOME', 'cust-1')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('POST .../batch creates multiple connections and PATCH updates one', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device-connection/batch`,
      headers: AUTH,
      payload: {
        connections: [
          { fromDeviceId: 'd1', fromPort: '1', toDeviceId: 'd2', toPort: '1', cableColor: 'blue' }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const connectionId = res.json().data[0]._id

    const patched = await app.inject({
      method: 'PATCH',
      url: `/tenant/${TENANT_ID}/device-connection/${connectionId}`,
      headers: AUTH,
      payload: { cableColor: 'red' }
    })
    expect(patched.json().data.cableColor).toBe('red')
  })

  it('POST .../bulk creates connections and DELETE removes one', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device-connection/bulk`,
      headers: AUTH,
      payload: {
        connections: [{ fromDeviceId: 'd3', fromPort: '2', toDeviceId: 'd4', toPort: '2' }]
      }
    })
    const connectionId = res.json().data[0]._id

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/tenant/${TENANT_ID}/device-connection/${connectionId}`,
      headers: AUTH
    })
    expect(deleted.json()).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/device-connection.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/device-connection.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { notFound } from '../lib/errors'

const insertSql = `
  INSERT INTO device_connections (id, tenant_id, from_device_id, from_port, to_device_id, to_port, cable_color, type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`

function rowToDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    id: row.id,
    fromDeviceId: row.from_device_id,
    fromPort: row.from_port,
    toDeviceId: row.to_device_id,
    toPort: row.to_port,
    cableColor: row.cable_color,
    type: row.type
  }
}

function insertConnection(db: Database.Database, tenantId: string, c: Record<string, unknown>) {
  const id = randomUUID()
  db.prepare(insertSql).run(
    id,
    tenantId,
    c.fromDeviceId ?? null,
    c.fromPort ?? null,
    c.toDeviceId ?? null,
    c.toPort ?? null,
    c.cableColor ?? null,
    c.type ?? null
  )
  return { _id: id, id, ...c }
}

export function registerDeviceConnectionRoutes(app: FastifyInstance, db: Database.Database): void {
  app.post('/tenant/:tenantId/device-connection/batch', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { connections } = req.body as { connections: Array<Record<string, unknown>> }
    return { data: connections.map((c) => insertConnection(db, tenantId, c)) }
  })

  app.post('/tenant/:tenantId/device-connection/bulk', async (req) => {
    const { tenantId } = req.params as { tenantId: string }
    const { connections } = req.body as { connections: Array<Record<string, unknown>> }
    return { data: connections.map((c) => insertConnection(db, tenantId, c)) }
  })

  app.patch('/tenant/:tenantId/device-connection/:id', async (req) => {
    const { tenantId, id } = req.params as { tenantId: string; id: string }
    const body = req.body as Record<string, unknown>
    const sets: string[] = []
    const values: unknown[] = []
    const map: Record<string, string> = {
      fromDeviceId: 'from_device_id',
      fromPort: 'from_port',
      toDeviceId: 'to_device_id',
      toPort: 'to_port',
      cableColor: 'cable_color',
      type: 'type'
    }
    for (const [apiKey, dbKey] of Object.entries(map)) {
      if (apiKey in body) {
        sets.push(`${dbKey} = ?`)
        values.push(body[apiKey])
      }
    }
    if (sets.length > 0) {
      const result = db
        .prepare(`UPDATE device_connections SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`)
        .run(...values, id, tenantId)
      if (result.changes === 0) throw notFound('device-connection')
    }
    const row = db.prepare('SELECT * FROM device_connections WHERE id = ? AND tenant_id = ?').get(id, tenantId) as any
    if (!row) throw notFound('device-connection')
    return { data: rowToDoc(row) }
  })

  app.delete('/tenant/:tenantId/device-connection/:id', async (req) => {
    const { tenantId, id } = req.params as { tenantId: string; id: string }
    const result = db.prepare('DELETE FROM device_connections WHERE id = ? AND tenant_id = ?').run(id, tenantId)
    if (result.changes === 0) throw notFound('device-connection')
    return { success: true }
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerDeviceConnectionRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/device-connection.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/device-connection.ts server/src/routes/device-connection.test.ts server/src/app.ts
git commit -m "feat(server): device-connection routes"
```

---

### Task 11: Vlan + Wlan routes

**Files:**
- Create: `server/src/routes/network.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/network.test.ts`

**Interfaces:**
- Produces: `registerNetworkRoutes(app, db)` mounting `/tenant/:tenantId/vlan` and `/tenant/:tenantId/wlan` CRUD via the factory.

- [ ] **Step 1: Write the failing test**

`server/src/routes/network.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('vlan/wlan routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(TENANT_ID, 'HOME', 'cust-1')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('creates and lists a vlan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/vlan`,
      headers: AUTH,
      payload: { vlanId: 10, name: 'Default' }
    })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/vlan` })
    expect(list.json().data.docs[0].vlanId).toBe(10)
  })

  it('creates and lists a wlan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/wlan`,
      headers: AUTH,
      payload: { ssid: 'Amulet-Staff', security: 'wpa2' }
    })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: `/tenant/${TENANT_ID}/wlan` })
    expect(list.json().data.docs[0].ssid).toBe('Amulet-Staff')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/network.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/network.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'

export function registerNetworkRoutes(app: FastifyInstance, db: Database.Database): void {
  const scope = { column: 'tenant_id', param: 'tenantId' }

  registerCrudRoutes(app, db, '/tenant/:tenantId/vlan', {
    table: 'vlans',
    scope,
    columns: [
      { db: 'vlan_id', api: 'vlanId' },
      { db: 'name', api: 'name' },
      { db: 'description', api: 'description' },
      { db: 'ports_json', api: 'ports', json: true }
    ],
    sortableColumns: ['name', 'vlanId']
  })

  registerCrudRoutes(app, db, '/tenant/:tenantId/wlan', {
    table: 'wlans',
    scope,
    columns: [
      { db: 'ssid', api: 'ssid' },
      { db: 'security', api: 'security' },
      { db: 'description', api: 'description' },
      { db: 'devices_json', api: 'devices', json: true }
    ],
    sortableColumns: ['ssid']
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerNetworkRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/network.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/network.ts server/src/routes/network.test.ts server/src/app.ts
git commit -m "feat(server): vlan/wlan routes"
```

---

### Task 12: Move endpoint

**Files:**
- Create: `server/src/routes/move.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/move.test.ts`

**Interfaces:**
- Produces: `registerMoveRoutes(app, db)` mounting `POST /tenant/:tenantId/:type/:id/move` for `type` in `location | floor | room | device`.

- [ ] **Step 1: Write the failing test**

`server/src/routes/move.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }
const TENANT_ID = 'tenant-1'

describe('move route', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    db.prepare('INSERT INTO tenants (id, name, customer_id) VALUES (?, ?, ?)').run(TENANT_ID, 'HOME', 'cust-1')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('moves a device to a new room/rack', async () => {
    const device = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device`,
      headers: AUTH,
      payload: { name: 'Switch 1', type: 'switch', roomId: 'room-a' }
    })
    const deviceId = device.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/device/${deviceId}/move`,
      headers: AUTH,
      payload: { roomId: 'room-b', rackId: 'rack-9' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.roomId).toBe('room-b')
    expect(res.json().data.rackId).toBe('rack-9')
  })

  it('returns 400 for an unsupported type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenant/${TENANT_ID}/widget/some-id/move`,
      headers: AUTH,
      payload: {}
    })
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/move.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/move.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { ApiError, notFound } from '../lib/errors'

interface MovableConfig {
  table: string
  columns: Record<string, string> // api field -> db column, for fields the move body may set
}

const MOVABLE: Record<string, MovableConfig> = {
  location: { table: 'locations', columns: {} },
  floor: { table: 'floors', columns: { locationId: 'location_id' } },
  room: { table: 'rooms', columns: { floorId: 'floor_id' } },
  device: {
    table: 'devices',
    columns: { locationId: 'location_id', roomId: 'room_id', rackId: 'rack_id', unit: 'unit' }
  }
}

export function registerMoveRoutes(app: FastifyInstance, db: Database.Database): void {
  app.post('/tenant/:tenantId/:type/:id/move', async (req) => {
    const { tenantId, type, id } = req.params as { tenantId: string; type: string; id: string }
    const config = MOVABLE[type]
    if (!config) throw new ApiError(400, `Unsupported move type: ${type}`)

    const body = { ...(req.body as Record<string, unknown>) }
    delete body.vlanStrategy // strategy hint only, not a column on any movable table

    const sets: string[] = []
    const values: unknown[] = []
    for (const [apiKey, dbKey] of Object.entries(config.columns)) {
      if (apiKey in body) {
        sets.push(`${dbKey} = ?`)
        values.push(body[apiKey])
      }
    }
    if (sets.length > 0) {
      const result = db
        .prepare(`UPDATE ${config.table} SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`)
        .run(...values, id, tenantId)
      if (result.changes === 0) throw notFound(type)
    }
    const row = db.prepare(`SELECT * FROM ${config.table} WHERE id = ? AND tenant_id = ?`).get(id, tenantId) as any
    if (!row) throw notFound(type)

    const doc: Record<string, unknown> = { _id: row.id, id: row.id }
    for (const [apiKey, dbKey] of Object.entries(config.columns)) {
      doc[apiKey] = row[dbKey]
    }
    return { data: doc }
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerMoveRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/move.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/move.ts server/src/routes/move.test.ts server/src/app.ts
git commit -m "feat(server): resource move endpoint"
```

---

### Task 13: Custom rack device catalog (read-only)

**Files:**
- Create: `server/src/routes/custom-rack-device.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/custom-rack-device.test.ts`

**Interfaces:**
- Consumes: `registerCrudRoutes` with `readOnly: true` (the `readOnly` flag was already built into the factory in Task 5, so this task adds no factory changes — it's the first consumer of that flag).
- Produces: `registerCustomRackDeviceRoutes(app, db)` mounting `GET /custom-rack-device`, `GET /custom-rack-device/:id`.

- [ ] **Step 1: Write the failing test**

`server/src/routes/custom-rack-device.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('custom-rack-device routes', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>
  let deviceId: string

  beforeEach(() => {
    db = openDb(':memory:')
    deviceId = randomUUID()
    db.prepare(
      `INSERT INTO custom_rack_devices (id, name, brand, type, rack_units, ports_count, ports_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(deviceId, 'Catalyst 2960-X 24TS-L', 'Cisco', 'switch', 1, 28, '[]')
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('lists the catalog', async () => {
    const res = await app.inject({ method: 'GET', url: '/custom-rack-device', headers: AUTH })
    expect(res.json().data.docs).toHaveLength(1)
  })

  it('gets one catalog entry', async () => {
    const res = await app.inject({ method: 'GET', url: `/custom-rack-device/${deviceId}`, headers: AUTH })
    expect(res.json().data.brand).toBe('Cisco')
  })

  it('rejects writes (read-only catalog)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/custom-rack-device',
      headers: AUTH,
      payload: { name: 'New' }
    })
    expect(res.statusCode).toBe(404) // no route registered for POST
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/custom-rack-device.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/custom-rack-device.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { registerCrudRoutes } from '../lib/crud-factory'

export function registerCustomRackDeviceRoutes(app: FastifyInstance, db: Database.Database): void {
  registerCrudRoutes(app, db, '/custom-rack-device', {
    table: 'custom_rack_devices',
    readOnly: true,
    columns: [
      { db: 'name', api: 'name' },
      { db: 'brand', api: 'brand' },
      { db: 'type', api: 'type' },
      { db: 'rack_units', api: 'rackUnits' },
      { db: 'ports_count', api: 'portsCount' },
      { db: 'ports_json', api: 'ports', json: true }
    ],
    sortableColumns: ['name']
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerCustomRackDeviceRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/custom-rack-device.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/custom-rack-device.ts server/src/routes/custom-rack-device.test.ts server/src/app.ts
git commit -m "feat(server): custom-rack-device catalog (read-only)"
```

---

### Task 14: Announcement routes

**Files:**
- Create: `server/src/routes/announcement.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/announcement.test.ts`

**Interfaces:**
- Produces: `registerAnnouncementRoutes(app, db)` mounting `GET /announcement`, `GET /announcement/active`, `POST /announcement/:id/dismiss`, `POST /announcement/dismiss-all`.

- [ ] **Step 1: Write the failing test**

`server/src/routes/announcement.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/announcement.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/announcement.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { paginate } from '../lib/pagination'

function rowToDoc(row: any): Record<string, unknown> {
  return { _id: row.id, id: row.id, title: row.title, body: row.body, active: !!row.active }
}

export function registerAnnouncementRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/announcement', async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 25
    const rows = db.prepare('SELECT * FROM announcements ORDER BY rowid DESC').all() as any[]
    const docs = rows.map(rowToDoc)
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })

  app.get('/announcement/active', async (req) => {
    const userId = req.user!.id
    const rows = db.prepare('SELECT * FROM announcements WHERE active = 1').all() as any[]
    const stillActive = rows.filter((row) => {
      const dismissedBy: string[] = row.dismissed_by_json ? JSON.parse(row.dismissed_by_json) : []
      return !dismissedBy.includes(userId)
    })
    return { data: stillActive.map(rowToDoc) }
  })

  app.post('/announcement/:id/dismiss', async (req) => {
    const { id } = req.params as { id: string }
    const userId = req.user!.id
    const row = db.prepare('SELECT dismissed_by_json FROM announcements WHERE id = ?').get(id) as any
    if (!row) return { success: true } // already gone - dismissing is idempotent
    const dismissedBy: string[] = row.dismissed_by_json ? JSON.parse(row.dismissed_by_json) : []
    if (!dismissedBy.includes(userId)) dismissedBy.push(userId)
    db.prepare('UPDATE announcements SET dismissed_by_json = ? WHERE id = ?').run(JSON.stringify(dismissedBy), id)
    return { success: true }
  })

  app.post('/announcement/dismiss-all', async (req) => {
    const userId = req.user!.id
    const rows = db.prepare('SELECT id, dismissed_by_json FROM announcements WHERE active = 1').all() as any[]
    const update = db.prepare('UPDATE announcements SET dismissed_by_json = ? WHERE id = ?')
    for (const row of rows) {
      const dismissedBy: string[] = row.dismissed_by_json ? JSON.parse(row.dismissed_by_json) : []
      if (!dismissedBy.includes(userId)) dismissedBy.push(userId)
      update.run(JSON.stringify(dismissedBy), row.id)
    }
    return { success: true }
  })
}
```

- [ ] **Step 4: Modify `server/src/app.ts`** — register `registerAnnouncementRoutes(protectedRoutes, opts.db)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/announcement.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/announcement.ts server/src/routes/announcement.test.ts server/src/app.ts
git commit -m "feat(server): announcement routes"
```

---

### Task 15: Log, Export, Support routes

**Files:**
- Create: `server/src/routes/log.ts`
- Create: `server/src/routes/export.ts`
- Create: `server/src/routes/support.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/routes/log.test.ts`
- Test: `server/src/routes/export.test.ts`
- Test: `server/src/routes/support.test.ts`

**Interfaces:**
- Produces: `registerLogRoutes(app, db)` (`GET /log`), `registerExportRoutes(app)` (`GET /export`), `registerSupportRoutes(app)` (`POST /support/request`).

- [ ] **Step 1: Write the failing log test**

`server/src/routes/log.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { openDb } from '../db'
import { buildApp } from '../app'

const SECRET = 'test-secret'
const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('GET /log', () => {
  let db: ReturnType<typeof openDb>
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    db = openDb(':memory:')
    const insert = db.prepare(
      `INSERT INTO logs (id, tenant_id, action, resource, resource_id, resource_data_json, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    insert.run(randomUUID(), 'tenant-1', 'create', 'device', 'dev-1', '{}', 'usr-1', new Date().toISOString())
    insert.run(randomUUID(), 'tenant-1', 'delete', 'vlan', 'vlan-1', '{}', 'usr-1', new Date().toISOString())
    insert.run(randomUUID(), 'tenant-2', 'create', 'device', 'dev-9', '{}', 'usr-9', new Date().toISOString())
    app = buildApp({ db, jwtSecret: SECRET })
  })

  it('filters by tenantId', async () => {
    const res = await app.inject({ method: 'GET', url: '/log?tenantId=tenant-1&page=1&limit=10&sort=-createdAt', headers: AUTH })
    expect(res.json().data.docs).toHaveLength(2)
  })

  it('filters by resource, including $in: lists', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/log?tenantId=tenant-1&resource=$in:device,vlan&page=1&limit=10&sort=-createdAt',
      headers: AUTH
    })
    expect(res.json().data.docs).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/log.test.ts`
Expected: FAIL

- [ ] **Step 3: Create `server/src/routes/log.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { paginate } from '../lib/pagination'

function rowToDoc(row: any): Record<string, unknown> {
  return {
    _id: row.id,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    resourceData: row.resource_data_json ? JSON.parse(row.resource_data_json) : {},
    userId: row.user_id,
    createdAt: row.created_at
  }
}

export function registerLogRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/log', async (req) => {
    const query = req.query as Record<string, string>
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 25

    let sql = 'SELECT * FROM logs WHERE 1 = 1'
    const params: unknown[] = []
    if (query.tenantId) {
      sql += ' AND tenant_id = ?'
      params.push(query.tenantId)
    }
    if (query.resourceId) {
      sql += ' AND resource_id = ?'
      params.push(query.resourceId)
    }
    if (query.resource) {
      if (query.resource.startsWith('$in:')) {
        const values = query.resource.slice('$in:'.length).split(',')
        sql += ` AND resource IN (${values.map(() => '?').join(', ')})`
        params.push(...values)
      } else {
        sql += ' AND resource = ?'
        params.push(query.resource)
      }
    }
    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params) as any[]
    const docs = rows.map(rowToDoc)
    const { docs: pageDocs, totalDocs, totalPages } = paginate(docs, page, limit)
    return { data: { docs: pageDocs, totalDocs, totalPages } }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/log.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing export test**

`server/src/routes/export.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { openDb } from '../db'
import { buildApp } from '../app'

const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('GET /export', () => {
  it('returns a PDF blob with a content-disposition filename', async () => {
    const db = openDb(':memory:')
    const app = buildApp({ db, jwtSecret: 'test-secret' })
    const res = await app.inject({
      method: 'GET',
      url: '/export?resourceType=location&resourceId=loc-1',
      headers: AUTH
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['content-disposition']).toContain('patchdocs_export_location_loc-1')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/export.test.ts`
Expected: FAIL

- [ ] **Step 7: Create `server/src/routes/export.ts`**

A local-dev stub: real PDF rendering is out of scope, but the frontend
(`reactsource/src/contexts/ExportContext.tsx`) expects a binary
`application/pdf` blob with a `content-disposition` filename, so the stub
returns a minimal valid single-page PDF rather than a JSON body the blob
handling would mangle.

```ts
import type { FastifyInstance } from 'fastify'

// Smallest valid single-page PDF (empty page) - good enough for local dev
// to exercise the frontend's blob-download path without real rendering.
const STUB_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f \n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF',
  'utf-8'
)

export function registerExportRoutes(app: FastifyInstance): void {
  app.get('/export', async (req, reply) => {
    const { resourceType = 'resource', resourceId = 'unknown' } = req.query as {
      resourceType?: string
      resourceId?: string
    }
    const date = new Date().toISOString().split('T')[0]
    const filename = `patchdocs_export_${resourceType}_${resourceId}_${date}.pdf`
    reply
      .header('content-type', 'application/pdf')
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(STUB_PDF)
  })
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/export.test.ts`
Expected: PASS

- [ ] **Step 9: Write the failing support test**

`server/src/routes/support.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { openDb } from '../db'
import { buildApp } from '../app'

const AUTH = { authorization: 'Bearer mock-dev-access-token' }

describe('POST /support/request', () => {
  it('returns a reference and ticket number', async () => {
    const db = openDb(':memory:')
    const app = buildApp({ db, jwtSecret: 'test-secret' })
    const res = await app.inject({
      method: 'POST',
      url: '/support/request',
      headers: AUTH,
      payload: { category: 'bug', message: 'Something broke' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.reference).toBeTypeOf('string')
    expect(res.json().data.ticketNumber).toBeTypeOf('string')
  })
})
```

- [ ] **Step 10: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/support.test.ts`
Expected: FAIL

- [ ] **Step 11: Create `server/src/routes/support.ts`**

```ts
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

export function registerSupportRoutes(app: FastifyInstance): void {
  app.post('/support/request', async () => {
    const reference = randomUUID()
    const ticketNumber = `LOCAL-${Date.now()}`
    return { data: { reference, ticketNumber } }
  })
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/support.test.ts`
Expected: PASS

- [ ] **Step 13: Modify `server/src/app.ts`** — register `registerLogRoutes(protectedRoutes, opts.db)`, `registerExportRoutes(protectedRoutes)`, `registerSupportRoutes(protectedRoutes)`.

- [ ] **Step 14: Commit**

```bash
git add server/src/routes/log.ts server/src/routes/export.ts server/src/routes/support.ts server/src/routes/log.test.ts server/src/routes/export.test.ts server/src/routes/support.test.ts server/src/app.ts
git commit -m "feat(server): log, export, support routes"
```

---

### Task 16: Seed script

**Files:**
- Create: `server/src/seed.ts`
- Test: `server/src/seed.test.ts`

**Interfaces:**
- Consumes: `openDb` (Task 2).
- Produces: `seed(db: Database.Database): void` — idempotent (checks for an existing `Amulet` customer by name before inserting anything).

- [ ] **Step 1: Write the failing test**

`server/src/seed.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/seed.test.ts`
Expected: FAIL — `./seed` doesn't exist.

- [ ] **Step 3: Create `server/src/seed.ts`**

```ts
import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { openDb } from './db'

export function seed(db: Database.Database): void {
  const existing = db.prepare('SELECT id FROM customers WHERE name = ?').get('Amulet') as { id: string } | undefined
  if (existing) return // already seeded

  const customerId = randomUUID()
  db.prepare('INSERT INTO customers (id, name, billing_json, custom_device_types_json) VALUES (?, ?, ?, ?)').run(
    customerId,
    'Amulet',
    JSON.stringify({
      status: 'active',
      subscriptionStatus: 'active',
      plan: 'enterprise',
      validUntil: '2027-12-31'
    }),
    '[]'
  )

  const adminId = randomUUID()
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, is_customer_admin, customer_id, language, permissions_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    adminId,
    'admin@example.com',
    bcrypt.hashSync('admin', 10),
    'Amulet Admin',
    'admin',
    1,
    customerId,
    'en',
    JSON.stringify([
      { resourceType: 'customer', resourceId: customerId, role: 'admin' }
    ])
  )

  const tenantId = randomUUID()
  db.prepare('INSERT INTO tenants (id, name, slug, customer_id) VALUES (?, ?, ?, ?)').run(
    tenantId,
    'HOME',
    'home',
    customerId
  )

  // Backfill the admin's tenant permission now that the tenant id exists.
  db.prepare('UPDATE users SET permissions_json = ? WHERE id = ?').run(
    JSON.stringify([
      { resourceType: 'customer', resourceId: customerId, role: 'admin' },
      { resourceType: 'tenant', resourceId: tenantId, role: 'admin' }
    ]),
    adminId
  )

  const locationId = randomUUID()
  db.prepare('INSERT INTO locations (id, tenant_id, name, address, city, country) VALUES (?, ?, ?, ?, ?, ?)').run(
    locationId,
    tenantId,
    'HOME',
    '24 Lower Cannon Road',
    'Newton Abbot',
    'GB'
  )

  const floorId = randomUUID()
  db.prepare(
    'INSERT INTO floors (id, tenant_id, location_id, name, level, bounds_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(floorId, tenantId, locationId, 'Ground Floor', 0, JSON.stringify({ width: 100, height: 80 }))

  const roomId = randomUUID()
  db.prepare(
    'INSERT INTO rooms (id, tenant_id, floor_id, name, polygon_json) VALUES (?, ?, ?, ?, ?)'
  ).run(roomId, tenantId, floorId, 'Server Room', JSON.stringify([[10, 10], [40, 10], [40, 40], [10, 40]]))

  const switchCatalogId = randomUUID()
  db.prepare(
    `INSERT INTO custom_rack_devices (id, name, brand, type, rack_units, ports_count, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(switchCatalogId, 'Catalyst 2960-X 24TS-L', 'Cisco', 'switch', 1, 28, '[]')

  const patchPanelCatalogId = randomUUID()
  db.prepare(
    `INSERT INTO custom_rack_devices (id, name, brand, type, rack_units, ports_count, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(patchPanelCatalogId, 'Patch Panel 24 Port STP', 'PATCHBOX', 'patch-panel', 1, 24, '[]')

  const rackId = randomUUID()
  db.prepare(
    `INSERT INTO devices (id, tenant_id, room_id, name, type, height_u, sub_devices_json, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(rackId, tenantId, roomId, 'Rack 1', 'rack', 42, '[]', '[]')

  db.prepare(
    `INSERT INTO devices (id, tenant_id, room_id, rack_id, name, type, unit, height_u, sub_devices_json, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), tenantId, roomId, rackId, 'Catalyst 2960-X 24TS-L', 'switch', 1, 1, '[]', '[]')

  db.prepare(
    `INSERT INTO devices (id, tenant_id, room_id, rack_id, name, type, unit, height_u, sub_devices_json, ports_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), tenantId, roomId, rackId, 'Patch Panel 24 Port STP', 'patch-panel', 2, 1, '[]', '[]')

  db.prepare(
    'INSERT INTO vlans (id, tenant_id, vlan_id, name, description, ports_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), tenantId, 10, 'Default', 'Default VLAN', '[]')

  db.prepare(
    'INSERT INTO wlans (id, tenant_id, ssid, security, description, devices_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), tenantId, 'Amulet-Staff', 'wpa2', 'Staff wifi', '[]')
}

if (require.main === module) {
  const db = openDb()
  seed(db)
  console.log('Seed complete: admin@example.com / admin, org "Amulet", tenant "HOME".')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/seed.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/seed.ts server/src/seed.test.ts
git commit -m "feat(server): idempotent seed script (Amulet org, admin user, sample DCIM data)"
```

---

### Task 17: Full wiring + integration smoke test

**Files:**
- Modify: `server/src/app.ts` (confirm every route module from Tasks 4-15 is registered — this is the checkpoint task)
- Test: `server/src/integration.test.ts`
- Create: `server/README.md`

**Interfaces:**
- Consumes: every `register*Routes` function from Tasks 4-15.
- Produces: nothing new — this is the checkpoint proving the whole app boots and the pieces cooperate end to end, per spec §10.

- [ ] **Step 1: Review `server/src/app.ts`** and confirm the protected-routes block registers all of: `registerTenantRoutes`, `registerUserRoutes`, `registerCustomerRoutes`, `registerLocationRoutes`, `registerDeviceRoutes`, `registerDeviceConnectionRoutes`, `registerNetworkRoutes`, `registerMoveRoutes`, `registerCustomRackDeviceRoutes`, `registerAnnouncementRoutes`, `registerLogRoutes`, `registerExportRoutes`, `registerSupportRoutes`. Add any missing import/call — each was supposed to be wired in its own task, so this step should find nothing missing; treat a gap as a bug in an earlier task, not new design.

- [ ] **Step 2: Write the failing integration test**

`server/src/integration.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && npx vitest run src/integration.test.ts`
Expected: FAIL if Step 1 found and fixed a real registration gap; PASS immediately otherwise (acceptable here — this is the wiring checkpoint, not new behaviour).

- [ ] **Step 4: Fix any wiring gap in `server/src/app.ts`**, if Step 3 failed.

- [ ] **Step 5: Run the full test suite**

Run: `cd server && npx vitest run`
Expected: PASS — every test file from Tasks 1-17 green.

- [ ] **Step 6: Create `server/README.md`**

```markdown
# DCIM local server

Local backend for the `reactsource` DCIM frontend.

## Setup

npm install
cp .env.example .env   # or create .env manually, see below
npm run seed
npm run dev

## .env

PORT=4000
JWT_SECRET=<any random string>

## Login

- Org admin: `admin@example.com` / `admin`
- Organisation: `Amulet`, full/active subscription (`plan: enterprise`)

The frontend's Auth0 integration is stubbed at build time
(`reactsource/src/shims/auth0.tsx`), so the SPA itself never calls
`/auth/login` - it always authenticates as the seeded admin automatically.
`/auth/login` exists for testing the API directly, e.g.:

    curl -X POST http://localhost:4000/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@example.com","password":"admin"}'

## Resetting data

npm run db:reset
```

- [ ] **Step 7: Commit**

```bash
git add server/src/app.ts server/src/integration.test.ts server/README.md
git commit -m "test(server): full-stack integration smoke test + README"
```

---

### Task 18: Frontend wiring

**Files:**
- Create: `reactsource/.env.local`
- Modify: `reactsource/src/shims/auth0.tsx`

**Interfaces:**
- Consumes: nothing new — this is the frontend-side switch that makes `reactsource/src/hooks/useAuthenticatedApi.ts` call the real backend instead of its built-in fake adapter (that file itself is unmodified: the switch is entirely the presence of `VITE_API_BASE_URL`).

- [ ] **Step 1: Create `reactsource/.env.local`**

```
VITE_API_BASE_URL=http://localhost:4000
```

- [ ] **Step 2: Modify `reactsource/src/shims/auth0.tsx`** — update the mock identity to match the seeded backend admin (cosmetic: nothing reads this object for API data, only for e.g. Sentry/PostHog attribution, but keeping them in sync avoids a confusing mismatch)

```ts
export const mockUser = {
  sub: 'auth0|mock-user-1',
  name: 'Amulet Admin',
  nickname: 'admin',
  email: 'admin@example.com',
  email_verified: true,
  picture: 'https://avatar.vercel.sh/admin',
};
```

- [ ] **Step 3: Verify the backend is seeded and running**

Run: `cd server && npm run seed`
Expected: `Seed complete: admin@example.com / admin, org "Amulet", tenant "HOME".`

Run (separate terminal, left running): `cd server && npm run dev`
Expected: `dcim-server listening on :4000`

- [ ] **Step 4: Verify the frontend talks to it**

Run (separate terminal, left running): `cd reactsource && npm run dev`
Expected: Vite dev server starts on port 5178. Open `http://localhost:5178` — the app should load the seeded "HOME" tenant under "Amulet" without the old hardcoded "Monkeys 3D Prints" fixture data, and Settings/Account should show org "Amulet" with an active/enterprise subscription.

- [ ] **Step 5: Commit**

```bash
git add reactsource/.env.local reactsource/src/shims/auth0.tsx
git commit -m "chore(reactsource): point dev build at the local backend"
```

(`reactsource/.env.local` is conventionally gitignored by Vite's default `.gitignore` — if this repo's `reactsource/.gitignore` already excludes `.env.local`, `git add` will report "no such path" for that file, which is correct and expected; the file still exists on disk and Vite still reads it. Only the shim change would be committed in that case.)

---

## Self-Review Notes

- **Spec coverage:** every endpoint listed in spec §7 has a task (Tasks 4-15); every seed item in spec §6 is in Task 16; auth design (§4) is Task 4; error convention (§8) is Task 3; config/running (§9) is Tasks 1 and 17; testing scope (§10) is Task 17.
- **Type/signature consistency checked:** `registerCrudRoutes(app, db, basePath, config)` signature (Task 5) is used identically in Tasks 8, 11, 13; `AuthUser`/`req.user` (Task 4) is read the same way in Tasks 6, 14, 15, 17; `ApiError`/`notFound` (Task 3) used consistently through every route task.
- **One deviation from the spec's literal table sketch**, called out in Global Constraints: `floors`/`rooms` gain `tenant_id` for URL-scoping, matching how `devices` was already specified with one.
