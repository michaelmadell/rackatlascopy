import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/t/$tenantId/dashboard')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/app/t/$tenantId/locations', params })
  }
})
