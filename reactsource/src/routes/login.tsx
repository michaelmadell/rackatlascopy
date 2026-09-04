import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { getLocale } from '@/paraglide/runtime'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: search.redirect as string | undefined
  }),
  component: Login
})

function Login() {
  const { loginWithRedirect } = useAuth0()
  const { redirect: redirectTo } = Route.useSearch()

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only redirect on initial mount
  useEffect(() => {
    loginWithRedirect({
      appState: { returnTo: redirectTo || '/app' },
      authorizationParams: { ui_locales: getLocale() }
    })
  }, [])

  return null
}
