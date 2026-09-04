import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import type { AppState, Auth0ContextInterface } from '@auth0/auth0-react'
import * as TanStackQueryProvider from '@/integrations/tanstack-query/root-provider.tsx'
import NotFoundPage from '@/components/common/NotFoundPage'
import Loader from '@/components/common/Loader'
import { type PostHogInitBranch, registerPostHogConsent } from '@/lib/consent-integrations/posthog'
import { registerGtmConsent } from '@/lib/consent-integrations/gtm'
import { debugLog } from '@/lib/debug'
import { initGtm } from '@/lib/gtm'
import { AUTH_DENIED_MESSAGE, AUTH_REDIRECT_MESSAGE, AUTH_UNVERIFIED_MESSAGE } from '@/lib/sentry-reporter'
import { getLocale } from '@/paraglide/runtime'
import { routeTree } from '@/routeTree.gen'
import '@/styles.css'
console.log('MAIN.TSX RUNNING - Patchdocs Initializing');

// Reload page when a stale JS chunk fails to load after a deploy
const isChunkLoadError = (e: unknown): boolean => {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  return (
    /Failed to fetch dynamically imported module/.test(message) ||
    /Importing a module script failed/.test(message) ||
    /error loading dynamically imported module/.test(message) ||
    /not a valid JavaScript MIME type/.test(message)
  )
}

let lastReloadAttemptAt = 0
const safeReload = () => {
  if (!navigator.onLine) return
  const now = Date.now()
  if (now - lastReloadAttemptAt < 1_000) return
  lastReloadAttemptAt = now
  const key = 'chunk-reload-at'
  const last = Number(sessionStorage.getItem(key) || 0)
  if (now - last < 10_000) {
    Sentry.captureMessage('Chunk reload guard blocked', 'error')
    return
  }
  sessionStorage.setItem(key, String(now))
  Sentry.addBreadcrumb({ category: 'chunk-reload', message: 'auto-reloading on chunk error', level: 'info' })
  window.location.reload()
}

window.addEventListener('vite:preloadError', () => safeReload())
window.addEventListener('unhandledrejection', (e) => {
  if (isChunkLoadError(e.reason)) safeReload()
})
window.addEventListener('error', (e) => {
  if (isChunkLoadError(e.error)) safeReload()
})

const mockAuth: Auth0ContextInterface = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    sub: 'auth0|mock-user-1',
    name: 'Michael Madell',
    email: 'info@monkeys3dprints.co.uk',
    email_verified: true,
  },
  loginWithRedirect: async () => {},
  logout: async () => {},
  getAccessTokenSilently: async () => 'mock-dev-token',
  getIdTokenClaims: async () => ({} as any),
  loginWithPopup: async () => {},
  handleRedirectCallback: async () => ({} as any),
  getAccessTokenWithPopup: async () => 'mock-dev-token',
} as any;

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProvider.getContext(),
    auth: (import.meta.env.VITE_AUTH0_DOMAIN ? {} : mockAuth) as Auth0ContextInterface
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultNotFoundComponent: NotFoundPage
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

document.documentElement.lang = getLocale()

// Init Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tunnel: import.meta.env.VITE_SENTRY_TUNNEL, // e.g. /api/i/s/ (with trailing slash)
  release: __APP_VERSION__,
  environment: import.meta.env.VITE_APP_ENVIRONMENT,
  enabled: import.meta.env.VITE_APP_ENVIRONMENT !== 'dev',
  debug: import.meta.env.VITE_APP_ENVIRONMENT === 'dev',
  enableLogs: true,
  // integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  ignoreErrors: [
    // Browser extensions
    'Object Not Found Matching Id',
    'antifingerprint not defined yet',
    // In-app browsers (Facebook/Instagram/etc.) inject scripts using a
    // WKWebView bridge we don't use — errors from those are not ours
    'window.webkit.messageHandlers',
    // Network issues
    'NetworkError when attempting to fetch resource',
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'error loading dynamically imported module',
    'not a valid JavaScript MIME type',
    'AbortError: The operation was aborted',
    'Non-Error promise rejection captured with value: Timeout',
    'client is offline',
    'AxiosError: Network Error',
    // Already reported explicitly by reportAuthFailure with the Auth0 code attached — without this the
    // response interceptor's reportApiError would double-report every one
    `AxiosError: ${AUTH_UNVERIFIED_MESSAGE}`,
    `AxiosError: ${AUTH_DENIED_MESSAGE}`,
    // Deliberate cancellation of an in-flight request while we redirect to Auth0 — not an error, and
    // the redirect itself is already reported by reportAuthFailure('token-refresh')
    `CanceledError: ${AUTH_REDIRECT_MESSAGE}`,
    // Mapbox Search JS internal bug (element detached before measurement)
    /null is not an object \(evaluating '.*\.parentElement\.appendChild'\)/,
    /Cannot read properties of null \(reading 'appendChild'\)/,
    // Bare DOM Event rejected as promise — typically browser extensions / injected scripts
    /Event `Event` \(type=error\) captured as promise rejection/
  ]
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production.
  // Learn more at https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  // tracesSampleRate: 1.0,
  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error.
  // Learn more at https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,
})

// GTM
initGtm()
registerGtmConsent()

// Auth0 redirects back with ?code=…&state=… (and ?error=… on failure). PostHog's
// initial pageview fires before Auth0 cleans the URL, so strip these from the
// captured URL props to avoid leaking auth codes into analytics.
const SENSITIVE_URL_PARAMS = ['code', 'state', 'error', 'error_description']

const stripSensitiveUrlParams = (properties: Record<string, unknown>) => {
  for (const key of ['$current_url', '$pathname', '$initial_current_url', '$initial_pathname']) {
    const value = properties[key]
    if (typeof value !== 'string' || !value.includes('?')) continue
    try {
      const url = new URL(value, window.location.origin)
      let changed = false
      for (const param of SENSITIVE_URL_PARAMS) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param)
          changed = true
        }
      }
      if (changed) properties[key] = key.includes('pathname') ? `${url.pathname}${url.search}` : url.toString()
    } catch {
      // Leave malformed values untouched
    }
  }
}

// PostHog — initialised once from the resolved Cookiebot decision; persistence is never
// switched at runtime (see registerPostHogConsent for why).
if (import.meta.env.VITE_APP_ENVIRONMENT !== 'dev') {
  const initPostHog = (persistence: 'memory' | 'localStorage+cookie', branch: PostHogInitBranch) => {
    posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST, // e.g. /api/i/p (without trailing slash)
      ui_host: import.meta.env.VITE_POSTHOG_UI_HOST,
      defaults: '2025-05-24',
      autocapture: true,
      capture_pageview: true,
      enable_heatmaps: true,
      // Session recording records an individual, so it is not "anonymous" — keep it off
      // for decliners (memory) and on staging.
      disable_session_recording: persistence === 'memory' || import.meta.env.VITE_APP_ENVIRONMENT === 'staging',
      persistence,
      cross_subdomain_cookie: true,
      person_profiles: 'identified_only',
      before_send: (event) => {
        if (!event) return null
        event.properties.app = 'patchdocs_web_app'
        event.properties.consent_branch = branch
        stripSensitiveUrlParams(event.properties)
        // Decliners (memory) are tracked anonymously: strip IP and disable geoip.
        if (persistence === 'memory') {
          event.properties.$ip = '0.0.0.0'
          event.properties.$geoip_disable = true
        }
        return event
      }
    })
    debugLog('posthog', `initialized (${persistence}, ${branch})`)
  }
  registerPostHogConsent(posthog, initPostHog)
} else {
  debugLog('posthog', 'disabled in dev environment')
}

const onAuth0RedirectCallback = (appState: AppState | undefined) => {
  // Soft URL cleanup — avoids cancelling in-flight Vite modulepreload fetches (Firefox iOS race)
  const target = appState?.returnTo || '/app'
  window.history.replaceState({}, '', target)
}

function InnerApp() {
  const auth = useAuth0()
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (auth.isLoading) {
        setShowLoading(true)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [auth.isLoading])

  if (auth.isLoading) {
    if (!showLoading) return null
    return <Loader />
  }

  return <RouterProvider router={router} context={{ auth }} />
}

function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN || 'dev.local'}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID || 'dev-client'}
      onRedirectCallback={onAuth0RedirectCallback}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access'
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage">
      <InnerApp />
    </Auth0Provider>
  )
}

// Render the app
const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
  const root = createRoot(rootElement, {
    onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
      console.warn('Uncaught error', error, errorInfo.componentStack)
    }),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler()
  })

  root.render(
    <StrictMode>
      {import.meta.env.VITE_APP_ENVIRONMENT === 'dev' ? (
        <TanStackQueryProvider.Provider>
          <App />
        </TanStackQueryProvider.Provider>
      ) : (
        <PostHogProvider client={posthog}>
          <TanStackQueryProvider.Provider>
            <App />
          </TanStackQueryProvider.Provider>
        </PostHogProvider>
      )}
    </StrictMode>
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals()
