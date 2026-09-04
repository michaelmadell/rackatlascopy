import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/t/$tenantId/')({
  beforeLoad: ({ location, params }) => {
    if (location.pathname === `/app/t/${params.tenantId}` || location.pathname === `/app/t/${params.tenantId}/`) {
      throw redirect({ to: '/app/t/$tenantId/locations', params: { tenantId: params.tenantId } })
    }
  }
})
