import { useEffect } from 'react'
import { HeadContent, Outlet, createRootRouteWithContext, useRouterState } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
// import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'
import type { QueryClient } from '@tanstack/react-query'
import type { Auth0ContextInterface } from '@auth0/auth0-react'
import { loadCookiebot } from '@/lib/consent'

interface MyRouterContext {
  queryClient: QueryClient
  auth: Auth0ContextInterface
  title?: string
}

// These routes render nothing and immediately redirect to Auth0; loading Cookiebot there
// would flash its banner before the redirect. Every other route is a real page (register,
// invitation, auth-* result pages, the app) where the banner should show.
const REDIRECT_ROUTES = new Set(['/', '/login'])

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!REDIRECT_ROUTES.has(pathname)) loadCookiebot()
  }, [pathname])

  return (
    <>
      <HeadContent />
      <Outlet />
      {/* <TanStackRouterDevtools />
      <TanStackQueryLayout /> */}
    </>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  head: () => ({
    meta: [{ title: 'Patchdocs' }]
  })
})
