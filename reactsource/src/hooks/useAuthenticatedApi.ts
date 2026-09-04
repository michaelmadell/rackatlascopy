import { useMemo } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { useAuth0 } from '@auth0/auth0-react'
import { usePostHog } from 'posthog-js/react'
import { useAppStore } from '@/lib/app-store'
import {
  AUTH_DENIED_MESSAGE,
  AUTH_REDIRECT_MESSAGE,
  AUTH_UNVERIFIED_MESSAGE,
  ERR_AUTH_DENIED,
  ERR_AUTH_UNVERIFIED,
  reportApiError,
  reportAuthFailure
} from '@/lib/sentry-reporter'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'

declare module 'axios' {
  interface AxiosRequestConfig {
    // Set when a 401 already triggered a forced token refresh — caps the retry at one attempt
    retriedWithFreshToken?: boolean
    // Set by callers that render the failure inline (move preview's 409) — suppresses the toast
    silentErrors?: boolean
  }
}

// Module scope on purpose: pages fan out dozens of parallel requests so an auth failure hits many at once.
// Without this each one fires its own loginWithRedirect and the competing Auth0 transactions race on
// state/nonce. A timestamp rather than a flag so it expires on its own: nothing clears it on success (the
// page is gone), but a redirect that never happened — extension, cancelled navigation, Back out of
// bfcache — stops swallowing requests once the window passes.
const AUTH_REDIRECT_WINDOW_MS = 10_000
let authRedirectAt = 0

// Same gate for the suppressed path, wider window: an Auth0 outage hits every request of every fan-out,
// on every refetch. The issue groups by message anyway — we need to know it's happening, not count it.
// Separate from the redirect gate on purpose: one gates behaviour, this one only gates reporting.
const AUTH_REPORT_WINDOW_MS = 60_000
let authReportAt = 0

// Not literally "logged out" — the Auth0 codes where a silent refresh can never succeed, so only an
// interactive login fixes it. `missing_refresh_token` and `invalid_grant` are the two we actually see: we
// run `useRefreshTokens` without the iframe fallback. The iframe-only codes are listed for the day that
// fallback gets turned on — suppressing them would strand the user toasting "server unreachable" on every
// request with no way out short of reloading the page.
const SESSION_GONE_CODES = [
  'login_required',
  'missing_refresh_token',
  'invalid_grant',
  'interaction_required',
  'consent_required'
]

export function useAuthenticatedApi() {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0()
  const posthog = usePostHog()

  return useMemo(() => {
    const api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL
    })

    if (!import.meta.env.VITE_API_BASE_URL) {
      api.defaults.adapter = async (config) => {
        const url = config.url || '';
        let data: any = { success: true };

        if (url.includes('/user/self')) {
          data = {
            data: {
              _id: 'usr-michael',
              customerId: 'cust-monkeys',
              email: 'info@monkeys3dprints.co.uk',
              name: 'Michael Madell',
              language: 'en',
              role: 'admin',
              isCustomerAdmin: true,
              permissions: [
                { resourceType: 'customer', resourceId: 'cust-monkeys', role: 'admin' },
                { resourceType: 'tenant', resourceId: '6a98283e1fc1bf33495daa70', role: 'admin' },
              ],
            }
          };
        } else if (url.includes('/customer/')) {
          data = {
            data: {
              _id: 'cust-monkeys',
              name: 'Monkeys 3D Prints',
              billing: { subscriptionStatus: 'active', plan: 'pro', validUntil: '2027-12-31' },
              customDeviceTypes: [],
            }
          };
        } else if (url.includes('/icon/customer')) {
          data = { success: true, data: {} };
        } else if (url.includes('/tenant')) {
          data = {
            data: {
              docs: [
                {
                  _id: '6a98283e1fc1bf33495daa70',
                  name: 'HOME',
                  customerId: 'cust-monkeys',
                }
              ],
              totalDocs: 1,
            }
          };
        } else if (url.includes('/announcement/active')) {
          data = { data: [] };
        } else if (url.includes('/custom-rack-device')) {
          data = {
            data: {
              docs: [
                {
                  _id: 'cisco-2960x',
                  name: 'Catalyst 2960-X 24TS-L',
                  brand: 'Cisco',
                  type: 'switch',
                  rackUnits: 1,
                  u: 1,
                  portsCount: 28,
                },
                {
                  _id: 'patchbox-pp24',
                  name: 'Patch Panel 24 Port STP',
                  brand: 'PATCHBOX',
                  type: 'patch-panel',
                  rackUnits: 1,
                  u: 1,
                  portsCount: 24,
                }
              ],
              totalDocs: 2,
              totalPages: 1,
            }
          };
        } else if (url.includes('/location')) {
          data = {
            data: {
              docs: [
                {
                  _id: 'loc-home',
                  name: 'HOME',
                  address: '24 Lower Cannon Road',
                  city: 'Newton Abbot',
                  country: 'GB',
                  floors: [
                    {
                      _id: 'flr-gf',
                      name: 'Ground Floor',
                      level: 0,
                    }
                  ]
                }
              ],
              totalDocs: 1,
            }
          };
        } else {
          data = { data: { docs: [], totalDocs: 0 } };
        }

        return {
          data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      };
    }

    api.interceptors.request.use(async (config) => {
      try {
        const token = await getAccessTokenSilently(config.retriedWithFreshToken ? { cacheMode: 'off' } : {})
        config.headers.Authorization = `Bearer ${token}`
        config.headers['Accept-Language'] = useAppStore.getState().user?.language ?? 'en'
        if (import.meta.env.VITE_APP_ENVIRONMENT === 'dev') {
          config.headers['ngrok-skip-browser-warning'] = 'true'
        }
        return config
      } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : ''
        const code = (error as { error?: string })?.error
        // `timeout` only counts as offline if the browser agrees it is — a dead network fails as
        // "Failed to fetch" in milliseconds, so 10s of silence while online is Auth0, not the user's
        // connection. Lumping the two together hid every degraded /oauth/token behind a network toast.
        const offline = !navigator.onLine || /network|failed to fetch/i.test(message)
        const sessionGone = SESSION_GONE_CODES.includes(code ?? '')

        const details = {
          name: error instanceof Error ? error.name : typeof error,
          code,
          message,
          retried: !!config.retriedWithFreshToken,
          url: config.url
        }

        // Bounce to Auth0 only when the session is provably gone, and never while offline — a redirect we
        // can't complete just trades the page for a browser error. Everything else keeps the page too:
        // Auth0 failing, or a code we never enumerated, is not evidence the user needs to log in, and
        // bouncing them costs unsaved work. Suppressing is the recoverable mistake of the two — a reload
        // re-runs checkSession and bounces properly — and the event below names the code we missed.
        // Two distinct errors rather than one: both keep the page, but only one is the user's network.
        if (offline) throw new axios.AxiosError('Network Error', axios.AxiosError.ERR_NETWORK, config)
        if (!sessionGone) {
          // Both paths are dropped by Sentry's ignoreErrors, so the response interceptor won't report
          // this one — and a refresh that failed for an unexplained reason would otherwise be invisible.
          // Timestamp set before the call so a synchronous re-entry can't double-fire.
          if (Date.now() - authReportAt > AUTH_REPORT_WINDOW_MS) {
            authReportAt = Date.now()
            reportAuthFailure('token-refresh-suppressed', details)
          }
          if (code === 'access_denied') throw new axios.AxiosError(AUTH_DENIED_MESSAGE, ERR_AUTH_DENIED, config)
          throw new axios.AxiosError(AUTH_UNVERIFIED_MESSAGE, ERR_AUTH_UNVERIFIED, config)
        }
        if (Date.now() - authRedirectAt < AUTH_REDIRECT_WINDOW_MS) {
          throw new axios.CanceledError(AUTH_REDIRECT_MESSAGE, config)
        }
        authRedirectAt = Date.now()
        // Reported here rather than above so a fan-out of failing requests yields one event, not dozens.
        // Awaited so the event is on the wire before we navigate away.
        await reportAuthFailure('token-refresh', details)
        // Let a failed redirect reject on its own — it's a real error, not a cancellation
        await loginWithRedirect({
          appState: { returnTo: `${window.location.pathname}${window.location.search}` },
          authorizationParams: { ui_locales: getLocale() }
        })
        // Don't send the request without a token — it would just 400 and toast a misleading error
        throw new axios.CanceledError(AUTH_REDIRECT_MESSAGE, config)
      }
    })

    // axios `settle()` resolves any response with a falsy status, so a request killed mid-flight
    // (page navigating to Auth0, blocked by an extension, dead socket) arrives here as a fake
    // 200 with an empty body — every `res.data.data` caller would then read undefined.
    api.interceptors.response.use((response) => {
      if (!response.status) {
        throw new axios.AxiosError('Request aborted', axios.AxiosError.ECONNABORTED, response.config, response.request)
      }
      return response
    })

    api.interceptors.response.use((response) => {
      const permissions = response.headers['x-user-permissions']

      if (permissions && response.data) {
        try {
          const parsedPermissions = JSON.parse(permissions)

          // If response.data is an object, merge permissions into it
          if (typeof response.data === 'object' && response.data !== null && !response.data.permissions) {
            response.data = {
              ...response.data,
              permissions: parsedPermissions
            }
          }
        } catch (error) {
          console.warn('Failed to parse permissions header:', error)
        }
      }

      return response
    })

    api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(error)

        // Cancelled by the auth redirect above — the page is navigating away, nothing to report
        if (axios.isCancel(error)) throw error

        // The API rejected the JWT (expired, despite the SPA considering it fresh) — get a new one and
        // retry once. Token failures are handled by the request interceptor, so nothing to catch here.
        if (error.response?.status === 401 && error.config && !error.config.retriedWithFreshToken) {
          error.config.retriedWithFreshToken = true
          return api.request(error.config)
        }

        const sentryContext = error.config?.sentryContext
        reportApiError(error, {
          action: sentryContext?.action ?? 'authenticated_api_request',
          data: sentryContext?.data
        })

        // Handled inline by the caller — reported above, but no toast on top of its own UI
        if (error.config?.silentErrors) throw error

        if (error.response) {
          // Server responded with error status
          const status = error.response.status
          const message = error.response.data?.error?.message || error.response.data?.message || m.unexpected_error()

          if (status === 503) {
            const retryAfter = Number(error.response.headers['retry-after']) || null
            useAppStore.getState().setMaintenanceMode(true, retryAfter ?? undefined)
          } else if (status === 410) {
            // Customer soft-deleted — full-screen UI handles it, suppress toast
          } else if (status === 401) {
            toast.error(m.error_session_expired())
            posthog?.capture('app:api_error_unauthorized')
          } else if (status === 403) {
            toast.error(m.error_insufficient_permissions())
            posthog?.capture('app:api_error_forbidden')
          } else {
            console.log(status, message)
            toast.error(message)
            posthog?.capture(
              `app:api_error_${status === 400 ? 'bad_request' : status === 404 ? 'not_found' : 'other'}`,
              { message }
            )
          }
        } else if (error.code === ERR_AUTH_DENIED) {
          // Auth0 refused to issue the token. No action offered on purpose — a reload re-asks the question
          // it just answered, and only a fresh login (or an admin) changes the answer.
          toast.error(m.error_session_denied(), { id: 'session-denied' })
        } else if (error.code === ERR_AUTH_UNVERIFIED) {
          // We're online, the refresh failed, and the reason wasn't one we treat as session-gone — so we
          // kept the page rather than bouncing. "Server unreachable" would be a lie and leaves no way out:
          // offer the reload, which re-runs checkSession and either recovers or redirects properly.
          // Fixed id so a fan-out of failing requests collapses into one toast. Default duration on
          // purpose — a persistent failure keeps re-firing it, a one-off blip lets it disappear instead
          // of leaving a stale "couldn't verify your session" on a page that recovered.
          toast.error(m.error_session_unverified(), {
            id: 'session-unverified',
            action: { label: m.reload_page(), onClick: () => window.location.reload() }
          })
        } else if (error.request || error.code === axios.AxiosError.ERR_NETWORK) {
          // Request made but no response received, or never sent because the network was down
          toast.error(m.error_server_unreachable())
        } else {
          // Something else went wrong
          toast.error(m.unexpected_error())
        }

        throw error // Re-throw so the calling code knows the request failed
      }
    )

    return api
  }, [getAccessTokenSilently, loginWithRedirect, posthog])
}
