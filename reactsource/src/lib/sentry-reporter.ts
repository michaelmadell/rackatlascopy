import * as Sentry from '@sentry/react'
import axios from 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    sentryContext?: { action: string; data?: Record<string, unknown> }
  }
}

type ReportContext = {
  action: string
  data?: Record<string, unknown>
}

// Thrown by useAuthenticatedApi when a token refresh failed for a reason we deliberately didn't treat as
// session-gone. Deliberately not ERR_NETWORK: the failure is Auth0's, and ErrorPage's firewall hint would
// otherwise send the user to their IT team over it. Both consts feed Sentry's `ignoreErrors` —
// reportAuthFailure already sends these explicitly, so letting reportApiError capture them too would
// double-report every one.
export const ERR_AUTH_UNVERIFIED = 'ERR_AUTH_UNVERIFIED'
export const AUTH_UNVERIFIED_MESSAGE = 'Session unverified'

// Same handling — keep the page, don't bounce — but Auth0 answered `access_denied`: a policy decision
// (unverified email, blocked user, a denying Action). Its own code so nothing offers a reload, which can
// only produce the same denial.
export const ERR_AUTH_DENIED = 'ERR_AUTH_DENIED'
export const AUTH_DENIED_MESSAGE = 'Session denied'

// Thrown by useAuthenticatedApi once the Auth0 redirect is under way, to stop the token-less request.
// The response interceptor's `isCancel` guard drops it, but an uncaught rejection still reaches Sentry's
// global onunhandledrejection handler — so it feeds `ignoreErrors` too. Deliberate control flow, and
// `reportAuthFailure('token-refresh')` already reported the reason we're bouncing.
export const AUTH_REDIRECT_MESSAGE = 'auth-redirect'

// Strip protocol+host and replace Mongo ObjectIds / long alphanumeric segments with :id so endpoints group cleanly
function normalizeEndpoint(url: string | undefined): string {
  if (!url) return ''
  const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  return path.replace(/\/[a-f0-9]{24}(?=\/|$)/gi, '/:id').replace(/\/[A-Za-z0-9_-]{20,}(?=\/|$)/g, '/:id')
}

/**
 * A token refresh that failed. These never reach Auth0 when the SDK fails locally, so they leave no
 * trace in its logs, and both outcomes are invisible by default: `token-refresh` bounces the user and
 * is swallowed by `useAuthenticatedApi`'s `isCancel` guard, and `token-refresh-suppressed` — where we
 * deliberately keep the page instead of bouncing — surfaces as an `ERR_AUTH_UNVERIFIED` axios error,
 * which `ignoreErrors` drops. Report them explicitly so a mid-session kick-out is traceable to a
 * path + reason.
 *
 * Returns the flush so the bouncing caller can await it — the transport uses `keepalive`, which usually
 * survives the navigation to Auth0, but "usually" is a poor bet for the one event we most want. Capped
 * short: it's a backstop for browsers without `keepalive`, not something the user should wait on.
 */
export function reportAuthFailure(path: 'token-refresh' | 'token-refresh-suppressed', data: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setLevel('warning')
    scope.setTag('action', 'auth_failure')
    // Same :id collapsing as reportApiError, so failures facet by endpoint instead of by ObjectId
    if (typeof data.url === 'string') scope.setTag('endpoint', normalizeEndpoint(data.url))
    scope.setContext('auth', data)
    // Message is the grouping key, so the two paths are already separate issues — no tag needed for it
    Sentry.captureMessage(`auth: ${path}`)
  })
  return Sentry.flush(300)
}

export function reportApiError(error: unknown, { action, data }: ReportContext) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const method = error.config?.method?.toUpperCase() ?? 'REQUEST'
    const endpoint = normalizeEndpoint(error.config?.url)
    const responseData = error.response?.data as { message?: string; error?: { message?: string } } | undefined
    const apiAttrs = {
      action,
      status,
      endpoint,
      url: error.config?.url,
      method,
      responseMessage: responseData?.message ?? responseData?.error?.message
    }

    if (status && status >= 400 && status < 500) {
      Sentry.logger.warn(`API ${status} ${method} ${endpoint} (${action})`, { ...apiAttrs, ...data })
      return
    }

    Sentry.withScope((scope) => {
      scope.setTag('action', action)
      scope.setTag('endpoint', `${method} ${endpoint}`)
      scope.setContext('api', apiAttrs)
      if (data) scope.setContext('data', data)
      Sentry.captureException(error)
    })
    return
  }

  Sentry.withScope((scope) => {
    scope.setTag('action', action)
    if (data) scope.setContext('data', data)
    Sentry.captureException(error)
  })
}
