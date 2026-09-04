import { useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { TbAlertTriangle } from 'react-icons/tb'
import { Button } from '@patchdocs/ui'
import { useAppStore } from '@/lib/app-store'
import {
  getTrialDaysRemaining,
  isTrialEndingWithinDay,
  getDeletionDate,
  getActiveWelcomeOffer,
  getWelcomeOfferPercent
} from './billing-utils'
import { formatDate } from '@/lib/utils'
import * as m from '@/paraglide/messages'

const BASE_HEADER_HEIGHT = '4.5rem'
const TRIAL_WARNING_DAYS = 3

export default function BillingBanner() {
  const ref = useRef<HTMLDivElement>(null)
  const billing = useAppStore((s) => s.customer?.billing)
  const trialEndsAt = billing?.trialEndsAt
  const paymentFailedAt = billing?.paymentFailedAt
  const paymentMethodType = billing?.paymentMethodType
  const blockedAt = billing?.blockedAt
  const blockedPeriodDays = billing?.blockedPeriodDays
  const isAdmin = useAppStore((s) => s.user?.isCustomerAdmin ?? false)
  const status = useAppStore((s) => s.billingStatus)

  const trialDays = status === 'trialing' ? getTrialDaysRemaining(trialEndsAt) : 0
  const showTrialWarning = status === 'trialing' && trialDays <= TRIAL_WARNING_DAYS
  const shouldShow = showTrialWarning || ['past_due', 'read_only', 'blocked'].includes(status)

  useEffect(() => {
    if (!shouldShow || !ref.current) return
    const bannerHeight = ref.current.offsetHeight
    document.documentElement.style.setProperty('--header-height', `calc(${BASE_HEADER_HEIGHT} + ${bannerHeight}px)`)
    return () => {
      document.documentElement.style.setProperty('--header-height', BASE_HEADER_HEIGHT)
    }
  }, [shouldShow])

  if (!shouldShow) return null

  let message: string
  let variant: 'destructive' | 'warning' = 'warning'

  const deletionDate = getDeletionDate(blockedAt, blockedPeriodDays)
  const deletionDateStr = deletionDate ? formatDate(deletionDate) : ''

  if (status === 'blocked') {
    message = paymentFailedAt
      ? m.billing_blocked_banner_payment_failed({ date: deletionDateStr })
      : m.billing_blocked_banner({ date: deletionDateStr })
    variant = 'destructive'
  } else if (status === 'read_only') {
    message = paymentFailedAt ? m.billing_read_only_banner_payment_failed() : m.billing_read_only_banner()
    variant = 'destructive'
  } else if (status === 'past_due') {
    message = paymentMethodType === 'sepa_debit' ? m.billing_past_due_warning_sepa() : m.billing_past_due_warning_card()
  } else {
    message = isTrialEndingWithinDay(trialEndsAt)
      ? m.billing_trial_banner_less_than_one()
      : trialDays === 1
        ? m.billing_trial_banner_one()
        : m.billing_trial_banner({ days: trialDays })
  }

  const welcomeOffer = getActiveWelcomeOffer(billing)
  if (welcomeOffer) {
    const percent = getWelcomeOfferPercent(welcomeOffer)
    const offerNote =
      percent != null ? m.billing_welcome_offer_banner({ percent }) : m.billing_welcome_offer_banner_generic()
    message = `${message} ${offerNote}`
  }

  return (
    <div
      ref={ref}
      className={`flex items-center justify-between flex-wrap sm:flex-nowrap gap-1 sm:gap-2 px-4 py-1 md:py-0.5 text-[13px] ${
        variant === 'destructive'
          ? 'bg-red-500/15 dark:bg-red-700/50 border-b border-border text-red-900 dark:text-foreground'
          : 'bg-yellow-500/15 dark:bg-yellow-700/55 border-b border-border text-yellow-900 dark:text-foreground'
      }`}>
      <div className="flex items-center gap-1.5">
        <TbAlertTriangle className="shrink-0 size-3.5" />
        <span>{message}</span>
      </div>
      {isAdmin && (
        <Button variant="ghost" size="xs" className="px-0 text-primary text-[13px] hover:bg-transparent" asChild>
          <Link to="/app/settings" search={{ tab: 'billing' }}>
            {showTrialWarning ? m.billing_subscribe_now() : m.billing_manage_subscription()}
          </Link>
        </Button>
      )}
    </div>
  )
}
