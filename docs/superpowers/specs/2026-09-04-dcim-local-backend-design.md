# DCIM Local Backend — Design Spec

Date: 2026-09-04
Status: Approved for implementation

## 1. Goal

`reactsource/` (the DCIM frontend) currently has no real backend — when
`VITE_API_BASE_URL` is unset, `useAuthenticatedApi.ts` fakes every response
with an in-file axios adapter, and Auth0 itself is globally aliased
(`vite.config.ts`) to a static mock (`src/shims/auth0.tsx`) that always
reports an authenticated user with a hardcoded token.

This spec defines a real local backend so the app can be developed against
persistent, mutable data instead of the hardcoded fake adapter, seeded with:

- Org admin user: `admin@example.com` / `admin`
- Organisation ("customer" in the data model): `Amulet`
- A full/active subscription on that organisation (not free, not trialing,
  not blocked)

## 2. Non-goals

- No real Auth0/OAuth integration. The frontend's Auth0 import is already
  globally shimmed at the build level (`vite.config.ts` alias) and always
  sends `Bearer mock-dev-access-token`. Replicating real Auth0 locally would
  require infrastructure this task doesn't need — the backend instead trusts
  that token in dev mode.
- No per-request permission enforcement beyond returning the seeded
  `permissions` array on `/user/self`. This is a local dev tool, not a
  production authorization boundary.
- No field-projection (`?select=...`) support. List/detail endpoints always
  return the full document; the `select` query param frontend sends is
  accepted but ignored.
- No file storage for avatar/icon uploads — those endpoints are stubs that
  accept the request and return success without persisting binary data.

## 3. Architecture

New standalone service at `server/` (sibling to `reactsource/`, not part of
the Vite build):

```
server/
  package.json
  tsconfig.json
  src/
    index.ts              # Fastify app bootstrap, plugin registration
    db.ts                 # better-sqlite3 connection + schema migration
    seed.ts               # idempotent seed script (Amulet org, admin user, sample DCIM data)
    auth/
      middleware.ts        # dev-token / JWT resolution -> req.user
      routes.ts            # POST /auth/login
    lib/
      crud-factory.ts       # generic CRUD route builder over a SQLite table
      errors.ts             # ApiError -> { error: { message } } mapping
      pagination.ts          # docs/totalDocs/totalPages envelope helper
    routes/
      user.ts
      customer.ts
      tenant.ts
      location.ts
      floor.ts
      room.ts
      device.ts
      device-connection.ts
      vlan.ts
      wlan.ts
      custom-rack-device.ts
      announcement.ts
      log.ts
      export.ts
      support.ts
  data/
    dcim.sqlite            # created on first run, gitignored
```

Fastify chosen (per decision) over Express for built-in schema validation
hooks and lower request overhead; TypeScript throughout, `tsx` for the dev
run loop (no separate build step needed for local dev).

`reactsource/.env.local` (gitignored, created by this work) gets:

```
VITE_API_BASE_URL=http://localhost:4000
```

Setting this flips `useAuthenticatedApi.ts` off its embedded fake adapter
(`if (!import.meta.env.VITE_API_BASE_URL) { ...fake adapter... }`) onto real
`axios` calls against the new backend. No frontend code changes required
beyond this env var — the interceptor already attaches
`Authorization: Bearer <token from getAccessTokenSilently()>`, which under
the shim is always `mock-dev-access-token`.

As a minor consistency fix, `src/shims/auth0.tsx`'s `mockUser.email` is
updated from `info@monkeys3dprints.co.uk` to `admin@example.com` so the
Auth0-level identity matches the seeded backend user (the app itself reads
identity from `/user/self`, not from the Auth0 object directly, so this is
cosmetic — it only matters for anything reading `useAuth0().user` directly,
e.g. Sentry/PostHog attribution).

## 4. Auth design

Two accepted credential forms on every protected route (every route except
`POST /auth/login`, which is the only public one):

1. **Dev mock token** — `Authorization: Bearer mock-dev-access-token`
   (or, defensively, any bearer token that isn't a well-formed JWT).
   Resolves directly to the seeded admin user. This is what the SPA sends
   today via the Auth0 shim.
2. **Issued JWT** — from `POST /auth/login`, `{ email, password }` checked
   with `bcrypt.compare` against the stored hash, returns
   `{ token, user }` where `token` is a `jsonwebtoken`-signed JWT
   (`sub` = user id, short local-only secret from `server/.env`). Requests
   with `Authorization: Bearer <jwt>` are verified and decode to the real
   user row. This path isn't used by the SPA (which never calls
   `/auth/login` — it only calls `loginWithRedirect()` on the shimmed
   Auth0 object) but exists so the API is independently testable via
   curl/Postman.

Middleware resolution order: try JWT verify first; if that fails (not a
JWT, or bad signature), fall back to treating any non-empty bearer token as
the dev mock session. Missing/empty `Authorization` header → `401` with
`{ error: { message: "Unauthorized" } }`.

## 5. Data model

SQLite tables, one per resource. Loosely-typed / nested fields (`ports`,
`polygon`, `floorPlanPosition`, `subDevices`, `connections`, `properties`,
billing sub-object, etc.) are stored as `TEXT` columns holding JSON and
parsed/stringified at the route layer — this matches how loose the
frontend's own TS types already are (lots of `any`) and avoids a rigid
relational schema for shapes the frontend doesn't strictly validate either.

| Table | Key columns |
|---|---|
| `users` | `id`, `email` (unique), `password_hash`, `name`, `avatar`, `role`, `is_customer_admin`, `customer_id`, `language`, `permissions_json` |
| `customers` | `id`, `name`, `billing_json` (`{status, plan, subscriptionStatus, validUntil, ...}` per `CustomerBilling`), `custom_device_types_json` |
| `tenants` | `id`, `name`, `slug`, `customer_id` |
| `locations` | `id`, `tenant_id`, `name`, `address`, `city`, `country` |
| `floors` | `id`, `location_id`, `name`, `level`, `floor_plan_image`, `bounds_json` |
| `rooms` | `id`, `floor_id`, `name`, `label`, `color`, `polygon_json` |
| `devices` | `id`, `tenant_id`, `location_id`, `room_id`, `rack_id`, `name`, `label`, `type`, `unit`, `height_u`, `side`, `sub_devices_json`, `ports_json`, `floor_plan_position_json` |
| `device_connections` | `id`, `tenant_id`, `from_device_id`, `from_port`, `to_device_id`, `to_port`, `cable_color`, `type` |
| `vlans` | `id`, `tenant_id`, `vlan_id` (the VLAN number), `name`, `description`, `ports_json` |
| `wlans` | `id`, `tenant_id`, `ssid`, `security`, `description`, `devices_json` |
| `custom_rack_devices` | `id`, `name`, `brand`, `type`, `rack_units`, `ports_count`, `ports_json` — global catalog, not tenant-scoped, matching the grep'd `GET /custom-rack-device` calls (no `tenantId` in any of those) |
| `announcements` | `id`, `title`, `body`, `active`, `dismissed_by_json` |
| `logs` | `id`, `action`, `resource`, `resource_id`, `resource_data_json`, `user_id`, `created_at` |

All ids are string UUIDs (`crypto.randomUUID()`) to match the `_id: string`
convention throughout `types/index.ts`. Every response mirrors the field
name as both `_id` and `id` where the frontend type declares both (e.g.
`User`, `Customer`, `Tenant`) — cheap and avoids guessing which call sites
read which key.

## 6. Seed data (`server/src/seed.ts`, idempotent — safe to re-run)

- **Customer** `Amulet`: `billing: { status: 'active', plan: 'enterprise', subscriptionStatus: 'active', validUntil: '2027-12-31' }` — no `blockedAt`/`readOnlyAt`/`trialEndsAt`, so `getBillingStatus()` in `billing-utils.ts` resolves to `'active'` (full paid access, not `'free'`/`'blocked'`/`'trialing'`).
- **User** `admin@example.com` / `admin` (bcrypt-hashed), `role: 'admin'`, `isCustomerAdmin: true`, `customerId` = Amulet's id, `permissions: [{resourceType: 'customer', resourceId: <amulet-id>, role: 'admin'}, {resourceType: 'tenant', resourceId: <tenant-id>, role: 'admin'}]`.
- **Tenant** `HOME`, owned by Amulet.
- **Location** `HOME`, one **Floor** (`Ground Floor`, level 0), one **Room** inside it.
- **Custom rack device catalog**: `Catalyst 2960-X 24TS-L` (Cisco, switch, 1U, 28 ports) and `Patch Panel 24 Port STP` (PATCHBOX, patch-panel, 1U, 24 ports) — reused verbatim from the old in-file mock adapter's fixtures.
- **Devices**: a rack device placed in the seeded room, plus one of each catalog device instantiated onto it.
- **Vlan**: one sample (`vlanId: 10, name: 'Default'`).
- **Wlan**: one sample (`ssid: 'Amulet-Staff'`).
- **Announcements**: none (empty, matches old mock's `/announcement/active` returning `[]`).

## 7. Endpoints

All paths below are prefixed with nothing extra (matches `VITE_API_BASE_URL`
being the full origin+port, no `/api` prefix, per the grep'd call sites like
`/user/self`, `/tenant`, `/customer/${id}`).

```
POST   /auth/login                                          (public)

GET    /user/self
GET    /user/:id
POST   /user
PATCH  /user/:id
DELETE /user/:id
POST   /user/:id/avatar
POST   /user/:id/password
POST   /user/:id/change-customer

GET    /customer
GET    /customer/:id
PATCH  /customer/:id
PATCH  /customer/:id/owner
DELETE /customer/:id
GET    /icon/customer                                        (stub)

GET    /tenant
POST   /tenant
GET    /tenant/:id
PATCH  /tenant/:id
DELETE /tenant/:id

GET    /tenant/:tenantId/location
GET    /tenant/:tenantId/location/:id
POST   /tenant/:tenantId/location
PATCH  /tenant/:tenantId/location/:id
DELETE /tenant/:tenantId/location/:id

GET    /tenant/:tenantId/floor
GET    /tenant/:tenantId/floor/:id
GET    /tenant/:tenantId/floor/:id/floor-plan
POST   /tenant/:tenantId/floor
PATCH  /tenant/:tenantId/floor/:id
DELETE /tenant/:tenantId/floor/:id

GET    /tenant/:tenantId/room
POST   /tenant/:tenantId/room
POST   /tenant/:tenantId/room/bulk
PATCH  /tenant/:tenantId/room/:id
DELETE /tenant/:tenantId/room/:id

GET    /tenant/:tenantId/device/:id
POST   /tenant/:tenantId/device
POST   /tenant/:tenantId/device/bulk
POST   /tenant/:tenantId/device/:rackId/deactivate
PATCH  /tenant/:tenantId/device/:id
DELETE /tenant/:tenantId/device/:id

POST   /tenant/:tenantId/device-connection/batch
POST   /tenant/:tenantId/device-connection/bulk
PATCH  /tenant/:tenantId/device-connection/:id
DELETE /tenant/:tenantId/device-connection/:id

GET    /tenant/:tenantId/vlan
GET    /tenant/:tenantId/vlan/:id
POST   /tenant/:tenantId/vlan
PATCH  /tenant/:tenantId/vlan/:id
DELETE /tenant/:tenantId/vlan/:id

GET    /tenant/:tenantId/wlan
GET    /tenant/:tenantId/wlan/:id
POST   /tenant/:tenantId/wlan
PATCH  /tenant/:tenantId/wlan/:id
DELETE /tenant/:tenantId/wlan/:id

POST   /tenant/:tenantId/:type/:id/move          (type: location|floor|room|device)

GET    /custom-rack-device
GET    /custom-rack-device/:id

GET    /announcement
GET    /announcement/active
POST   /announcement/:id/dismiss
POST   /announcement/dismiss-all

GET    /log
GET    /export

POST   /support/request
```

List endpoints return `{ data: { docs: [...], totalDocs, totalPages } }`
(honoring `limit`/`sort` query params where the frontend sends them; `sort`
supports a leading `-` for descending). Single-item GET/POST/PATCH return
`{ data: {...} }`. `DELETE` returns `{ success: true }`.

Most of these routes are generated through `lib/crud-factory.ts` — one call
per resource table configuring: table name, allowed sortable columns, the
JSON-column list to parse/stringify, and an optional scope column
(`tenant_id`) that's injected from the URL param and enforced on every
query. Resources with real bespoke behaviour (`/user/self`, `/auth/login`,
`move`, `deactivate`, `bulk`, `avatar`, `password`, `change-customer`,
`dismiss`) get hand-written handlers alongside the generated ones in the
same route file.

## 8. Error handling

Fastify error handler maps thrown `ApiError(status, message)` (and zod
validation failures) to:

```json
{ "error": { "message": "..." } }
```

which matches the frontend's parser:
`error.response.data?.error?.message || error.response.data?.message`.
Unknown id on a scoped lookup → `404`. Zod parse failure on body → `400`.
Uncaught exceptions → `500` with a generic message (logged server-side via
Fastify's default logger).

## 9. Config & running

`server/.env` (gitignored):
```
PORT=4000
JWT_SECRET=<random local-only value generated at setup>
```

`server/package.json` scripts:
- `dev` — `tsx watch src/index.ts`
- `seed` — `tsx src/seed.ts` (idempotent — checks for existing `Amulet`
  customer before inserting)
- `db:reset` — deletes `data/dcim.sqlite` then re-runs `seed`

CORS restricted to `http://localhost:5178` (the Vite dev server port from
`reactsource/vite.config.ts`).

## 10. Testing

`server/src/**/*.test.ts` using `vitest` + Fastify's built-in `inject()`
(no real HTTP socket needed). Smoke coverage, not exhaustive per-endpoint:

- `POST /auth/login` succeeds with `admin@example.com`/`admin`, fails with
  wrong password.
- `GET /user/self` with the dev mock token returns the seeded admin,
  `customer.billing.subscriptionStatus === 'active'`.
- `GET /customer/:id` returns Amulet with the full-subscription billing
  shape.
- One full CRUD round-trip: create a tenant, create a location under it,
  patch it, delete it, confirm 404 after delete — proves the generic CRUD
  factory is wired correctly end-to-end so the same pattern can be trusted
  for the other resources it generates.
