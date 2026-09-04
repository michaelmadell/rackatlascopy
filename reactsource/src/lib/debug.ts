// Lightweight scoped console logger for non-production builds. Helps trace consent,
// PostHog and GTM behaviour on localhost and staging without leaking logs to production.
const DEBUG_ENABLED = import.meta.env.VITE_APP_ENVIRONMENT !== 'production'

const SCOPE_COLORS: Record<string, string> = {
  consent: '#10b981',
  posthog: '#f59e0b',
  gtm: '#3b82f6'
}

export function debugLog(scope: keyof typeof SCOPE_COLORS | string, ...args: unknown[]): void {
  if (!DEBUG_ENABLED) return
  const color = SCOPE_COLORS[scope] ?? '#888'
  console.log(`%c[${scope}]`, `color:${color};font-weight:bold`, ...args)
}
