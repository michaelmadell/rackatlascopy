import { Link } from '@tanstack/react-router'
import { TbAlertOctagon } from 'react-icons/tb'
import { useAuth0 } from '@auth0/auth0-react'
import { usePostHog } from 'posthog-js/react'
import { Button } from '@patchdocs/ui'
import Loader from '@/components/common/Loader'
import { ERR_AUTH_DENIED, ERR_AUTH_UNVERIFIED } from '@/lib/sentry-reporter'
import * as m from '@/paraglide/messages'

export default function ErrorPage({ error }: { error: Error }) {
  const { logout } = useAuth0()
  const posthog = usePostHog()

  // Request cancelled by the auth redirect — the page is already on its way to Auth0
  if ((error as { code?: string }).code === 'ERR_CANCELED') return <Loader />

  const isAxiosError = 'response' in error
  const code = isAxiosError ? (error as unknown as { response: { status: number } }).response.status : 500
  // Token refresh failed for a reason useAuthenticatedApi doesn't treat as session-gone. Their own messages
  // are internal strings, so translate. Only the unverified one gets the reload button: `access_denied` is
  // Auth0's answer to the question a reload would ask again.
  const authCode = (error as { code?: string }).code
  const isAuthUnverified = authCode === ERR_AUTH_UNVERIFIED
  const authMessage = isAuthUnverified
    ? m.error_session_unverified()
    : authCode === ERR_AUTH_DENIED
      ? m.error_session_denied()
      : null
  const message =
    authMessage ??
    (isAxiosError
      ? (error as unknown as { response: { data?: { message?: string } } }).response.data?.message || error.message
      : error.message || m.unexpected_error())
  const isNetworkError =
    !isAxiosError &&
    (error.message === 'Network Error' || (error as unknown as { code?: string }).code === 'ERR_NETWORK')

  if (code >= 400 && code < 500) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <TbAlertOctagon className="text-foreground text-5xl mb-3" />
        <p className="mb-8">{m.unauthorized_page_access()}</p>
        <Button
          onClick={() => {
            posthog?.capture('account:auth0_logout')
            posthog?.reset()
            logout({ logoutParams: { returnTo: import.meta.env.VITE_LOGOUT_URL } })
          }}>
          {m.sign_out()}
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6">
      <TbAlertOctagon className="text-red-400 text-6xl mb-3" />
      <p className="text-lg mb-2">{message}</p>
      {isNetworkError && (
        <p className="text-[13px] text-muted-foreground max-w-md text-center leading-snug">
          {m.network_error_firewall_hint()}
        </p>
      )}
      {isAuthUnverified ? (
        <Button className="mt-5" onClick={() => window.location.reload()}>
          {m.reload_page()}
        </Button>
      ) : (
        <Link to="/app" className="text-brand-blue text-sm mt-4">
          {m.back_to_app()}
        </Link>
      )}
    </div>
  )
}
