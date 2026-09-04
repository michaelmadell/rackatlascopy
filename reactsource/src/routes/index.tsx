import { useEffect } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { getLocale } from '@/paraglide/runtime'

export const Route = createFileRoute('/')({
  validateSearch: (
    search: Record<string, unknown>
  ): { redirect?: string; error?: string; error_description?: string } => ({
    redirect: search.redirect as string | undefined,
    error: search.error as string | undefined,
    error_description: search.error_description as string | undefined
  }),
  beforeLoad: ({ context, search }) => {
    if (search.error) {
      throw redirect({
        to: '/auth-error',
        search: { error: search.error, error_description: search.error_description }
      })
    }
    if (context.auth.isAuthenticated || !import.meta.env.VITE_AUTH0_DOMAIN) {
      throw redirect({ to: '/app' })
    }
  },
  component: Index
})

function Index() {
  const { loginWithRedirect } = useAuth0()
  const { redirect: redirectTo } = Route.useSearch()

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only redirect on initial mount
  useEffect(() => {
    // Skip if an Auth0 callback is still in the URL — let the SDK finish processing it first
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') && params.has('state')) return
    loginWithRedirect({
      appState: { returnTo: redirectTo || '/app' },
      authorizationParams: { ui_locales: getLocale() }
    })
  }, [])

  return null
}
