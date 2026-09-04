import { useSyncExternalStore } from 'react'
import * as Sentry from '@sentry/react'
import { debugLog } from '@/lib/debug'

export type ConsentState = {
  analytics: boolean
  marketing: boolean
}

type Listener = (state: ConsentState | null) => void

const listeners = new Set<Listener>()

// "Resolved" = the consent flow is done blocking the UI: either the user answered the
// banner, or we've determined Cookiebot is unavailable (blocked/timeout). We gate the
// announcements popup on this so its modal Radix dialog never opens over the Cookiebot
// banner (which would steal clicks and silently dismiss the announcement).
type ResolvedListener = () => void
const resolvedListeners = new Set<ResolvedListener>()

// Cookiebot owns the banner, the first-party CookieConsent cookie, versioning and
// cross-domain sharing. This module is a thin adapter that maps Cookiebot's categories
// onto our two-category ConsentState and re-exposes the same store API consumers used
// before (getConsent / onConsentChange / useConsent), so the PostHog/GTM integrations,
// the DB sync and the server-side gating stay unchanged.
// statistics -> analytics, marketing -> marketing (necessary always on, preferences unused)
type CookiebotConsent = {
  necessary: boolean
  preferences: boolean
  statistics: boolean
  marketing: boolean
}

type CookiebotApi = {
  consent: CookiebotConsent
  consented: boolean
  declined: boolean
  hasResponse: boolean
  renew: () => void
}

declare global {
  interface Window {
    Cookiebot?: CookiebotApi
  }
}

// Cookiebot fires these on `window`: ConsentReady on load (with prior response replayed),
// Accept/Decline on every subsequent change via the banner or renew dialog.
const COOKIEBOT_EVENTS = ['CookiebotOnConsentReady', 'CookiebotOnAccept', 'CookiebotOnDecline']

const COOKIEBOT_CBID = '502c57d2-9b80-4c3a-bd70-236398552625'

let cookiebotRequested = false

// The banner is a forced modal, so any user who sees it must choose. The only users who
// browse without a consent record are those whose Cookiebot script never loaded (ad/privacy
// extension or network failure). Because that cohort can never reach the banner, they can
// never consent — so an instance we init in `memory` for them never has to switch
// persistence, and the cross-subdomain identity is never at risk. We surface a `blocked`
// signal so the PostHog integration can spin up that anonymous, cookieless memory baseline
// and we regain visibility into these visitors. 10s keeps the false-positive window small
// (a false "blocked" on a slow-but-working Cookiebot load ends in an automatic reload once
// the real decision arrives); the pageview is not at risk — PostHog captures it at init
// time, however late that is.
const CONSENT_PROBE_DELAY_MS = 10000
let consentProbeTimer: ReturnType<typeof setTimeout> | undefined
let cookiebotBlockedReported = false

function cancelConsentProbe(): void {
  if (consentProbeTimer === undefined) return
  clearTimeout(consentProbeTimer)
  consentProbeTimer = undefined
}

function reportCookiebotBlocked(detectedVia: string): void {
  cancelConsentProbe()
  markConsentResolved()
  markConsentBlocked()
  if (cookiebotBlockedReported) return
  cookiebotBlockedReported = true
  debugLog('consent', 'Cookiebot unavailable — no banner shown, browsing without consent', { detectedVia })
  Sentry.logger.warn('cookiebot_blocked', { detected_via: detectedVia })
}

// Cookiebot auto-shows its banner the moment uc.js loads. The `/` and `/login` routes only
// bounce visitors to Auth0 and render nothing, so loading the script there would flash the
// banner before that redirect. Every other route (register, invitation, auth-* result pages
// and the app itself) injects it via __root.tsx — so the banner appears on real pages both
// before and after login. Manual blocking + our own gating mean nothing tracks before
// consent regardless of load timing, and Cookiebot's cross-domain consent sharing still
// resolves on late load.
// The probe is the real backstop: if Cookiebot never materialises (blocked, or a stale
// script element survived an HMR reload), it flips the resolved latch so the announcements
// gate doesn't stay closed for the whole session. Installed on every load path — now that
// consentResolved gates UI, a path without it is a functional gap, not just lost telemetry.
// An element with id="Cookiebot" (our own script tag) is exposed as `window.Cookiebot` via
// named window properties, so a plain truthiness check can't tell "API loaded" from "our
// unloaded <script> tag is still sitting there" — when uc.js is blocked, window.Cookiebot
// stays pointing at that element, which is truthy. The real API object carries hasResponse;
// the script element does not, so we key off that instead.
function cookiebotApiLoaded(): boolean {
  const cb = window.Cookiebot
  return cb != null && 'hasResponse' in cb
}

function scheduleConsentProbe(): void {
  consentProbeTimer = setTimeout(() => {
    consentProbeTimer = undefined
    if (!cookiebotApiLoaded()) reportCookiebotBlocked('timeout')
  }, CONSENT_PROBE_DELAY_MS)
}

export function loadCookiebot(): void {
  if (cookiebotRequested || typeof document === 'undefined') return
  cookiebotRequested = true
  scheduleConsentProbe()
  if (document.getElementById('Cookiebot')) {
    debugLog('consent', 'loadCookiebot: script already present, skipping injection')
    return
  }
  debugLog('consent', 'injecting Cookiebot script')
  const script = document.createElement('script')
  script.id = 'Cookiebot'
  script.src = 'https://consent.cookiebot.com/uc.js'
  script.async = true
  script.type = 'text/javascript'
  script.setAttribute('data-cbid', COOKIEBOT_CBID)
  script.setAttribute('data-blockingmode', 'manual')
  // A blocked request often fails silently (no error event), so the probe timeout is the
  // real backstop; the error handler just catches the clean network-failure case sooner.
  script.addEventListener('error', () => reportCookiebotBlocked('script_error'))
  document.head.appendChild(script)
}

function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  const cb = window.Cookiebot
  // Until the user has responded, treat consent as undecided. Consumers default to
  // denied (memory persistence, IP stripped, Consent Mode `default` = denied).
  if (!cb?.hasResponse) return null
  return { analytics: !!cb.consent.statistics, marketing: !!cb.consent.marketing }
}

let cachedSnapshot: ConsentState | null = readConsent()

// Seed as resolved if a prior response was already replayed before this module loaded.
let consentResolved = cachedSnapshot !== null

function markConsentResolved(): void {
  if (consentResolved) return
  consentResolved = true
  for (const cb of resolvedListeners) cb()
}

// "Blocked" = Cookiebot never loaded, so the banner will never show and this visitor can
// never record a consent decision. That is a terminal state distinct from "declined": it is
// NOT a user choice, so it must never reach the DB consent-sync or Consent Mode. The PostHog
// integration uses it to init an anonymous, cookieless memory baseline — safe precisely
// because a blocked instance can never be asked to upgrade its persistence later.
type BlockedListener = () => void
const blockedListeners = new Set<BlockedListener>()
let consentBlocked = false

function markConsentBlocked(): void {
  if (consentBlocked) return
  consentBlocked = true
  for (const cb of blockedListeners) cb()
}

export function getConsentBlocked(): boolean {
  return consentBlocked
}

export function onConsentBlocked(cb: BlockedListener): () => void {
  blockedListeners.add(cb)
  return () => {
    blockedListeners.delete(cb)
  }
}

function equal(a: ConsentState | null, b: ConsentState | null): boolean {
  if (a === null || b === null) return a === b
  return a.analytics === b.analytics && a.marketing === b.marketing
}

function refresh() {
  const next = readConsent()
  // A non-null reading means the user has responded — the banner is gone.
  if (next !== null) markConsentResolved()
  if (equal(cachedSnapshot, next)) {
    debugLog('consent', 'Cookiebot event — no change', {
      cookiebot: window.Cookiebot?.consent,
      state: next
    })
    return
  }
  debugLog('consent', 'consent changed', { from: cachedSnapshot, to: next, listeners: listeners.size })
  cachedSnapshot = next
  for (const cb of listeners) cb(next)
}

if (typeof window !== 'undefined') {
  for (const event of COOKIEBOT_EVENTS) {
    window.addEventListener(event, () => {
      cancelConsentProbe()
      debugLog('consent', `event: ${event}`, window.Cookiebot?.consent)
      refresh()
    })
  }
}

export function getConsent(): ConsentState | null {
  return cachedSnapshot
}

export function onConsentChange(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useConsent(): ConsentState | null {
  return useSyncExternalStore(
    onConsentChange,
    () => cachedSnapshot,
    () => cachedSnapshot
  )
}

// Stable identity so useSyncExternalStore doesn't tear down/re-add the listener on every
// render (mirrors how useConsent passes the stable onConsentChange).
function onConsentResolvedChange(cb: ResolvedListener): () => void {
  resolvedListeners.add(cb)
  return () => {
    resolvedListeners.delete(cb)
  }
}

// True once the consent flow no longer blocks the UI (user responded, or Cookiebot is
// unavailable). Used to hold back the announcements popup so it never overlaps the banner.
export function useConsentResolved(): boolean {
  return useSyncExternalStore(
    onConsentResolvedChange,
    () => consentResolved,
    () => consentResolved
  )
}

// Re-open Cookiebot's consent dialog so the user can change their choice.
export function openConsentManager(): void {
  window.Cookiebot?.renew()
}
