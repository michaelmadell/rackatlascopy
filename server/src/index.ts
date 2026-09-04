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
