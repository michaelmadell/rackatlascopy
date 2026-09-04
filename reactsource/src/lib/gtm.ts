import { type ConsentState, getConsent } from '@/lib/consent'
import { debugLog } from '@/lib/debug'
import { sha256Hex } from '@/lib/utils'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

let initialized = false

function getContainerId(): string | undefined {
  return import.meta.env.VITE_GTM_CONTAINER_ID
}

function isEnabled(): boolean {
  return !!getContainerId() && typeof window !== 'undefined'
}

function googleConsentFromState(state: ConsentState) {
  return {
    ad_storage: state.marketing ? 'granted' : 'denied',
    ad_user_data: state.marketing ? 'granted' : 'denied',
    ad_personalization: state.marketing ? 'granted' : 'denied',
    analytics_storage: state.analytics ? 'granted' : 'denied'
  }
}

export function pushDataLayer(payload: Record<string, unknown>) {
  if (!isEnabled()) return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
}

export async function fireRegistrationEvent(opts: { email: string; phoneE164: string }) {
  if (!isEnabled() || !opts.email) return
  if (getConsent()?.marketing === false) {
    debugLog('gtm', 'registration_complete skipped — marketing consent denied')
    return
  }
  debugLog('gtm', 'firing registration_complete')
  const [emailHash, phoneHash] = await Promise.all([sha256Hex(opts.email), sha256Hex(opts.phoneE164)])
  pushDataLayer({
    event: 'registration_complete',
    user_data: { sha256_email: emailHash, sha256_phone_number: phoneHash },
    registration_details: { user_id: '', plan_id: '' }
  })
}

export async function firePurchaseEvent(opts: { email: string; invoiceId: string | null; currency: string }) {
  if (!isEnabled() || !opts.invoiceId || !opts.email) return
  if (getConsent()?.marketing === false) {
    debugLog('gtm', 'purchase skipped — marketing consent denied')
    return
  }
  debugLog('gtm', 'firing purchase', { invoiceId: opts.invoiceId, currency: opts.currency })
  const emailHash = await sha256Hex(opts.email)
  pushDataLayer({ ecommerce: null })
  pushDataLayer({
    event: 'purchase',
    user_data: { sha256_email: emailHash },
    ecommerce: {
      transaction_id: opts.invoiceId,
      value: null,
      currency: opts.currency.toUpperCase()
    }
  })
}

export function gtagConsentUpdate(state: ConsentState) {
  if (!isEnabled()) return
  window.dataLayer = window.dataLayer || []
  debugLog('gtm', 'Consent Mode update', googleConsentFromState(state))
  window.gtag('consent', 'update', googleConsentFromState(state))
  window.dataLayer.push({
    event: 'consent_update',
    consent_status: {
      marketing: state.marketing ? 'granted' : 'denied',
      analytics: state.analytics ? 'granted' : 'denied'
    }
  })
}

export function initGtm() {
  if (initialized || !isEnabled()) {
    if (!isEnabled()) debugLog('gtm', 'initGtm skipped — no container id (VITE_GTM_CONTAINER_ID)')
    return
  }
  initialized = true
  const containerId = getContainerId()
  if (!containerId) return
  debugLog('gtm', 'initGtm — Consent Mode default = denied, loading container', containerId)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  })
  window.dataLayer.push({ event: 'consent_initialized', status: 'default' })

  const existing = getConsent()
  if (existing) {
    window.gtag('consent', 'update', googleConsentFromState(existing))
  }

  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript)
  } else {
    document.head.appendChild(script)
  }
}
