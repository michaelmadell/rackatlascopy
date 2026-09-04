import { ACTIVE_SUBSCRIPTION_STATUSES, PAYABLE_SUBSCRIPTION_STATUSES } from '@patchdocs/constants'
import type { Customer, CustomerBilling, OfferCoupon } from '@/types'
import { isEuCountry } from '@/lib/utils'
import * as m from '@/paraglide/messages'

const MS_PER_DAY = 86400000

export type BillingStatus =
  | 'exempt'
  | 'free'
  | 'active'
  | 'active_trialing'
  | 'trialing'
  | 'past_due'
  | 'read_only'
  | 'blocked'

export interface Invoice {
  id: string
  number: string
  date: number
  amount: number
  status: string
  currency: string
  hostedInvoiceUrl: string
}

export interface ActiveRack {
  _id: string
  reference: string
  fullReference: string
}

export function computeBillingStatus(billing: CustomerBilling | undefined): BillingStatus {
  const now = new Date()

  if (billing?.exempt === true) return 'exempt'

  if (billing?.plan === 'free') return 'free'

  // Explicit state markers take precedence (set by crons/webhooks)
  if (billing?.blockedAt) return 'blocked'
  if (billing?.readOnlyAt) {
    const readOnlyDate = new Date(billing.readOnlyAt)
    readOnlyDate.setDate(readOnlyDate.getDate() + (billing.readOnlyPeriodDays ?? 30))
    if (readOnlyDate < now) return 'blocked'
    return 'read_only'
  }

  // Subscription-based states
  const subscriptionStatus = billing?.subscriptionStatus
  if (subscriptionStatus === 'trialing') return 'active_trialing'
  if (subscriptionStatus === 'active') return 'active'

  // past_due (card retries / SEPA pending) and unpaid (card retries exhausted / SEPA failed with no retries)
  // share the same UX: 14d warning grace from paymentFailedAt, then read_only via cron.
  if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
    const paymentFailedAt = billing?.paymentFailedAt
    if (paymentFailedAt) {
      const failedDate = new Date(paymentFailedAt)
      failedDate.setDate(failedDate.getDate() + (billing.gracePeriodDays ?? 14))
      if (failedDate < now) return 'read_only'
      return 'past_due'
    }
    // No paymentFailedAt yet — invoice.payment_failed hasn't fired. For SEPA past_due this means
    // settlement is in progress (bank hasn't returned the debit), so render as active.
    if (subscriptionStatus === 'past_due' && billing?.paymentMethodType === 'sepa_debit') return 'active'
    return 'past_due'
  }

  const trialEndsAt = billing?.trialEndsAt
  if (trialEndsAt && now < new Date(trialEndsAt)) return 'trialing'

  return 'read_only'
}

// Whether the computed billingStatus reads as an active-ish subscription (for display/UX gating). This is the
// UX projection — not the API guard; use hasActiveSubscription to decide whether a subscription mutation is allowed.
export function isActiveBillingStatus(status: BillingStatus): boolean {
  return status === 'active' || status === 'active_trialing'
}

// Mirrors the API's hasActiveSubscription guard. Gate subscription mutations (cancel, change-interval, redeem, ...)
// on the raw Stripe subscriptionStatus, NOT on billingStatus: billingStatus maps the SEPA settlement window's
// past_due to 'active', so gating on it would offer actions the API then rejects with billing_no_subscription.
export function hasActiveSubscription(billing: CustomerBilling | undefined): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(billing?.subscriptionStatus ?? '')
}

// Mirrors the API's hasPayableSubscription guard. Wider than hasActiveSubscription — also past_due/unpaid, where the
// subscription still exists in Stripe and updating the payment method is how the customer recovers. Excludes canceled.
export function hasPayableSubscription(billing: CustomerBilling | undefined): boolean {
  return PAYABLE_SUBSCRIPTION_STATUSES.includes(billing?.subscriptionStatus ?? '')
}

// Mirrors the API's isEnterprise helper. Enterprise contracts are sales-provisioned: every self-serve
// billing mutation is rejected by the API, so hide them rather than offer actions that always fail.
export function isEnterprise(billing: CustomerBilling | undefined): boolean {
  return !!billing?.enterprisePrice?.priceId
}

// Enterprise prices are sales-negotiated and can bill on any Stripe cadence, so they have no
// monthly/yearly key in `prices` — and no billingInterval to index it by. One accessor for both cases.
export function getPriceTier(billing: CustomerBilling | undefined) {
  if (isEnterprise(billing)) return billing?.prices?.enterprise
  return billing?.prices?.[billing?.billingInterval ?? 'monthly']
}

// "month" / "3 months" — the cadence as a bare period, for composing into a fee label or suffix.
function describeBillingPeriod(billing: CustomerBilling | undefined) {
  const enterprisePrice = billing?.enterprisePrice
  const interval = enterprisePrice?.priceId
    ? enterprisePrice.interval
    : billing?.billingInterval === 'yearly'
      ? 'year'
      : 'month'
  const count = enterprisePrice?.priceId ? (enterprisePrice.intervalCount ?? 1) : 1
  const period =
    count === 1
      ? {
          day: m.billing_period_day_one,
          week: m.billing_period_week_one,
          month: m.billing_period_month_one,
          year: m.billing_period_year_one
        }[interval]()
      : {
          day: m.billing_period_day_other,
          week: m.billing_period_week_other,
          month: m.billing_period_month_other,
          year: m.billing_period_year_other
        }[interval]({ count })
  return { interval, period, count }
}

// Headline label for the recurring amount: "Monthly fee", "Yearly fee", "Fee for 3 months".
export function formatFeeLabel(billing: CustomerBilling | undefined): string {
  const { interval, period, count } = describeBillingPeriod(billing)
  if (count > 1) return m.billing_fee_for({ period })
  return {
    day: m.billing_daily_fee,
    week: m.billing_weekly_fee,
    month: m.billing_monthly_fee,
    year: m.billing_yearly_fee
  }[interval]()
}

// Terse suffix after an amount: "/month", "/year", "/3 months".
export function formatPeriodSuffix(billing: CustomerBilling | undefined): string {
  if (!isEnterprise(billing)) {
    return billing?.billingInterval === 'yearly' ? m.billing_per_year() : m.billing_per_month()
  }
  return m.billing_per_period({ period: describeBillingPeriod(billing).period })
}

export function getTrialDaysRemaining(trialEndsAt: string | undefined): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / MS_PER_DAY))
}

export function isTrialEndingWithinDay(trialEndsAt: string | undefined): boolean {
  if (!trialEndsAt) return false
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return ms > 0 && ms < MS_PER_DAY
}

export function formatTrialDaysRemaining(trialEndsAt: string | undefined): string {
  if (isTrialEndingWithinDay(trialEndsAt)) return '<1'
  return String(getTrialDaysRemaining(trialEndsAt))
}

export function getPaymentFailureGraceEnd(billing: CustomerBilling | undefined): Date | null {
  if (!billing?.paymentFailedAt) return null
  const days = billing.gracePeriodDays ?? 14
  return new Date(new Date(billing.paymentFailedAt).getTime() + days * MS_PER_DAY)
}

export function getDeletionDate(blockedAt: string | undefined, blockedPeriodDays: number | undefined): Date | null {
  if (!blockedAt || !blockedPeriodDays) return null
  return new Date(new Date(blockedAt).getTime() + blockedPeriodDays * MS_PER_DAY)
}

export function getVatNote(countryCode: string): string {
  if (countryCode === 'AT') return m.billing_vat_at()
  if (isEuCountry(countryCode)) return m.billing_vat_eu_reverse_charge()
  return m.billing_vat_non_eu()
}

// The server sends welcomeOffer regardless of the validity window; only surface it when now is inside it.
export function getActiveWelcomeOffer(billing: CustomerBilling | undefined): CustomerBilling['welcomeOffer'] | null {
  const offer = billing?.welcomeOffer
  if (!offer || billing?.welcomeOfferApplied || billing?.subscriptionId) return null
  if (!offer.monthly && !offer.yearly) return null
  if (!offer.validFrom || !offer.validUntil) return null
  const now = Date.now()
  if (now < new Date(offer.validFrom).getTime() || now > new Date(offer.validUntil).getTime()) return null
  return offer
}

// A single representative percentage for terse copy (banner): only when it is unambiguous across intervals.
export function getWelcomeOfferPercent(offer: NonNullable<CustomerBilling['welcomeOffer']>): number | null {
  const percents = [offer.monthly?.percentOff, offer.yearly?.percentOff].filter(
    (p): p is number => typeof p === 'number'
  )
  if (!percents.length) return null
  return percents.every((p) => p === percents[0]) ? percents[0] : null
}

// interval disambiguates a 'once' coupon (first month vs first year); pass null for interval-neutral wording.
export function describeOfferCoupon(coupon: OfferCoupon, interval: 'monthly' | 'yearly' | null): string {
  const percent = coupon.percentOff
  if (coupon.duration === 'repeating' && coupon.durationInMonths) {
    return coupon.durationInMonths === 1
      ? m.billing_offer_repeating_one({ percent })
      : m.billing_offer_repeating_other({ percent, months: coupon.durationInMonths })
  }
  if (coupon.duration === 'once') {
    if (interval === 'monthly') return m.billing_offer_once_monthly({ percent })
    if (interval === 'yearly') return m.billing_offer_once_yearly({ percent })
    return m.billing_offer_once({ percent })
  }
  return m.billing_offer_forever({ percent })
}

function offerCouponsEqual(a: OfferCoupon, b: OfferCoupon): boolean {
  return a.percentOff === b.percentOff && a.duration === b.duration && a.durationInMonths === b.durationInMonths
}

// Offer phrase (no validity sentence): a single neutral description when both intervals share the same coupon,
// otherwise the per-plan descriptions joined with "or".
export function describeWelcomeOfferPlans(offer: NonNullable<CustomerBilling['welcomeOffer']>): string {
  const { monthly, yearly } = offer
  if (monthly && yearly && offerCouponsEqual(monthly, yearly)) return describeOfferCoupon(monthly, null)
  const parts: string[] = []
  if (monthly) parts.push(m.billing_welcome_offer_plan_monthly({ offer: describeOfferCoupon(monthly, 'monthly') }))
  if (yearly) parts.push(m.billing_welcome_offer_plan_yearly({ offer: describeOfferCoupon(yearly, 'yearly') }))
  if (parts.length === 2) return m.billing_welcome_offer_both({ monthly: parts[0], yearly: parts[1] })
  return parts[0] ?? ''
}

export function getMissingInvoiceDetails(customer: Customer) {
  const addr = customer.address
  const isEu = isEuCountry(addr?.countryCode || '')
  const missingAddress = !(addr?.line1 && addr?.city && addr?.postalCode && addr?.countryCode)
  const missingTaxId = isEu && !customer.tax?.taxId
  const vatNotVerified = isEu && !!customer.tax?.taxId && customer.tax?.vatValidation?.status !== 'verified'
  return { missingAddress, missingTaxId, vatNotVerified }
}
