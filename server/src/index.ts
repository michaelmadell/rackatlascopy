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
