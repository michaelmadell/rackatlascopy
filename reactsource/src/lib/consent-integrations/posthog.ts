import type { PostHog } from 'posthog-js'
import { type ConsentState, getConsent, getConsentBlocked, onConsentBlocked, onConsentChange } from '@/lib/consent'
import { debugLog } from '@/lib/debug'

// null = no Cookiebot response yet (the banner is blocking, so effectively no usage).
type Mode = 'undecided' | 'memory' | 'persistent'

// Which consent branch this PostHog instance was initialised through. Stamped onto every
// event (see initPostHog's before_send) so any metric can be segmented by how the visitor
// was tracked: 'granted' = consented, 'declined' = refused the banner, 'blocked' = Cookiebot
// never loaded (ad/privacy blocker). Note 'declined' and 'blocked' are both memory-persistence
// but must stay distinguishable — persistence alone can't tell them apart.
export type PostHogInitBranch = 'granted' | 'declined' | 'blocked'

const modeFor = (state: ConsentState | null): Mode =>
  state === null ? 'undecided' : state.analytics ? 'persistent' : 'memory'

const BLOCKED_RELOAD_LATCH_KEY = 'ph_blocked_reload'

function hasBlockedReloadLatch(): boolean {
  try {
    return sessionStorage.getItem(BLOCKED_RELOAD_LATCH_KEY) === '1'
  } catch {
    // Storage unavailable → the latch could never persist, so never allow the auto-reload.
    return true
  }
}

// Returns whether the latch actually persisted. Some browsers (e.g. older Safari private
// mode) return null from getItem but throw on setItem, so the read-side guard alone can't
// catch a failed write — callers must fail closed on a false return and skip the reload.
function setBlockedReloadLatch(): boolean {
  try {
    sessionStorage.setItem(BLOCKED_RELOAD_LATCH_KEY, '1')
    return true
  } catch {
    return false
  }
}

// PostHog is initialised ONCE, with a persistence chosen up-front from the resolved
// Cookiebot decision; we never switch persistence at runtime. posthog-js writes the
// CURRENT props to the target storage on a persistence switch without reading the
// existing value first.
//
//   declined → 'memory'              : anonymous, cookieless, ephemeral baseline.
//   granted  → 'localStorage+cookie' : a fresh init READS and adopts the existing
//                                      cross-subdomain distinct_id, so login identify()
//                                      and cross-subdomain events resolve to one person.
//
// A genuine mind-change after the first decision reloads the page so PostHog re-inits
// cleanly with the new persistence rather than performing the clobbering switch.
export function registerPostHogConsent(
  posthog: PostHog,
  initPostHog: (persistence: 'memory' | 'localStorage+cookie', branch: PostHogInitBranch) => void
) {
  let current: Mode = 'undecided'
  let blockedInit = false

  const apply = (state: ConsentState | null) => {
    const next = modeFor(state)
    if (next === 'undecided' || next === current) {
      debugLog('posthog', 'apply: no-op', { current, next })
      return
    }
    if (current === 'undecided') {
      // First decision this page load — init once with the matching persistence.
      debugLog('posthog', `init: ${next}`)
      initPostHog(
        next === 'persistent' ? 'localStorage+cookie' : 'memory',
        next === 'persistent' ? 'granted' : 'declined'
      )
      current = next
      return
    }
    // Mind-change after a decision. On a downgrade, clear our persistent cross-subdomain
    // cookie to honour the revocation; then reload so PostHog re-inits with the new mode.
    // After a blocked-fallback init the "mind-change" is automatic (late consent replay) —
    // allow it once per session, then stay in memory rather than risk a reload loop.
    if (blockedInit) {
      // Skip the reload if the latch is already set, or if we can't persist it — either way
      // we can't guarantee we won't loop, so stay in memory for the session.
      if (hasBlockedReloadLatch() || !setBlockedReloadLatch()) {
        debugLog('posthog', `late consent after blocked init (${current} → ${next}) — staying in memory`)
        return
      }
    }
    debugLog('posthog', `consent changed: ${current} → ${next} → reload`)
    if (current === 'persistent') posthog.reset()
    window.location.reload()
  }

  // Cookiebot never loaded (ad/privacy blocker or network failure), so this visitor will
  // never see the banner and can never consent. Spin up the same anonymous, cookieless
  // memory baseline decliners get — it regains visibility without ever touching the shared
  // cross-subdomain cookie. Safe because a memory instance here never has to switch: the
  // only escape is Cookiebot loading late, which flows through `apply` as a mind-change
  // (memory → persistent) and reloads for a clean, cookie-reading re-init.
  const applyBlocked = () => {
    if (current !== 'undecided') return
    debugLog('posthog', 'cookiebot blocked → init memory (anonymous baseline)')
    initPostHog('memory', 'blocked')
    current = 'memory'
    blockedInit = true
  }

  debugLog('posthog', 'registerPostHogConsent', { initialConsent: getConsent(), blocked: getConsentBlocked() })
  apply(getConsent())
  if (getConsentBlocked()) applyBlocked()
  onConsentChange(apply)
  onConsentBlocked(applyBlocked)
}
