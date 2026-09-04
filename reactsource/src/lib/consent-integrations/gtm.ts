import { type ConsentState, getConsent, onConsentChange } from '@/lib/consent'
import { gtagConsentUpdate } from '@/lib/gtm'
import { debugLog } from '@/lib/debug'

export function registerGtmConsent() {
  const apply = (state: ConsentState | null) => {
    if (!state) {
      debugLog('gtm', 'no consent yet, leaving Consent Mode at default (denied)')
      return
    }
    gtagConsentUpdate(state)
  }
  debugLog('gtm', 'registerGtmConsent', { initialConsent: getConsent() })
  apply(getConsent())
  onConsentChange(apply)
}
