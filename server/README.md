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
