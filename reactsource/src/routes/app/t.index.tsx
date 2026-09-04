import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/t/')({
  beforeLoad: ({ location }) => {
    throw redirect({ to: '/app', search: location.search })
  }
})
