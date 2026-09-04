import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/t/$tenantId/locations/$locationId/devices_/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/app/t/$tenantId/locations/$locationId', params })
  }
})
