import { Fragment, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useAnnouncementsQuery } from '@/hooks/useAnnouncementsQuery'

// Loosely-typed Link for breadcrumbs — routes have varying search schemas
const NavLink = Link as React.FC<{ to?: string; search?: Record<string, string>; children?: ReactNode }>
import {
  useSidebar,
  Skeleton,
  Badge,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator
} from '@patchdocs/ui'
import { TbMenu2 } from 'react-icons/tb'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import type { HeaderBreadcrumb } from '@/contexts/HeaderContext'
import { useAppStore } from '@/lib/app-store'
import Logo from '@/components/common/Logo'
import * as m from '@/paraglide/messages'

export default function Header() {
  const { config } = useHeaderConfig()
  const customer = useAppStore((state) => state.customer)
  const activeTenant = useAppStore((state) => state.activeTenant)
  const { toggleSidebar, state: sidebarState, isMobile } = useSidebar()
  const unreadAnnouncements = useAnnouncementsQuery().data?.length ?? 0
  const showUnreadDot = unreadAnnouncements > 0 && (sidebarState === 'collapsed' || isMobile)
  const breadcrumbListRef = useRef<HTMLOListElement>(null)
  const { pathname } = useLocation()
  const showSystemIntegratorBadge = pathname.endsWith('app/settings') && customer?.accountType === 'systemIntegrator'
  const showExemptBadge = pathname.endsWith('app/settings') && customer?.billing?.exempt

  // Auto-generate breadcrumbs when config.breadcrumbs is omitted
  // Only show tenant breadcrumb for systemIntegrator accounts
  const breadcrumbs = useMemo(() => {
    if (!config) return []
    const isSystemIntegrator = customer?.accountType === 'systemIntegrator'
    const tenantBreadcrumb: HeaderBreadcrumb | null =
      isSystemIntegrator && activeTenant
        ? { label: activeTenant.reference || '', href: `/app/t/${activeTenant._id}` }
        : null
    if (config.breadcrumbs) {
      return tenantBreadcrumb ? [tenantBreadcrumb, ...config.breadcrumbs] : config.breadcrumbs
    }
    if (pathname.startsWith('/app/t/')) {
      return tenantBreadcrumb ? [tenantBreadcrumb, { label: config.title }] : [{ label: config.title }]
    }
    return [{ label: config.title }]
  }, [config, pathname, activeTenant, customer?.accountType])

  // Set document.title
  useEffect(() => {
    if (!config) {
      document.title = m.product_name()
      return
    }
    if (config.documentTitle) {
      document.title = `${config.documentTitle} - ${m.product_name()}`
    } else {
      document.title = `${breadcrumbs
        .slice()
        .reverse()
        .map((b) => b.label)
        .join(' - ')} - ${m.product_name()}`
    }
    return () => {
      document.title = m.product_name()
    }
  }, [config, breadcrumbs])

  // Auto-scroll breadcrumbs to show current page
  // biome-ignore lint/correctness/useExhaustiveDependencies: breadcrumbs used as trigger to re-scroll
  useEffect(() => {
    if (breadcrumbListRef.current) {
      breadcrumbListRef.current.scrollTo({ left: breadcrumbListRef.current.scrollWidth })
    }
  }, [breadcrumbs])

  return (
    <header className="w-full h-18 flex gap-4 items-center bg-sidebar border-b border-border">
      <div className="w-11 min-w-11 h-full flex flex-col border-r border-border">
        <div className="h-9 flex justify-center items-center border-b border-border hover:bg-sidebar-accent">
          <Link
            to="/app/t/$tenantId/dashboard"
            params={{ tenantId: activeTenant?._id ?? '' }}
            className="w-full h-full flex justify-center items-center">
            <Logo className="w-4.5" />
          </Link>
        </div>
        <div className="h-9 flex justify-center items-center hover:bg-sidebar-accent">
          <button
            type="button"
            className="relative w-full h-full flex justify-center items-center cursor-pointer"
            onClick={toggleSidebar}>
            <TbMenu2 className="size-4.5" />
            {showUnreadDot && <span className="absolute top-1.75 right-1.75 size-1.5 rounded-full bg-brand-blue" />}
          </button>
        </div>
      </div>
      <div
        className={`h-full flex flex-col flex-1 py-4 min-w-0 ${breadcrumbs.length > 1 ? 'justify-between' : 'justify-center'}`}>
        {config ? (
          <>
            <div className="flex items-center gap-2 min-w-0 truncate">
              <h1 className="text-base font-semibold leading-tight">{config.title}</h1>
              {(showSystemIntegratorBadge || showExemptBadge) && (
                <div className="flex items-center gap-1 min-w-0">
                  {showSystemIntegratorBadge && (
                    <Badge className="bg-blue-50 text-primary-blue dark:bg-primary-blue/30 dark:text-blue-300">
                      {m.billing_si_title()}
                    </Badge>
                  )}
                  {showExemptBadge && (
                    <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                      Exempt
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {breadcrumbs.length > 1 && (
              <Breadcrumb>
                <BreadcrumbList
                  ref={breadcrumbListRef}
                  className="text-xs text-foreground gap-1 sm:gap-1 flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
                  {breadcrumbs.map((breadcrumb, index) => (
                    <Fragment
                      key={`${breadcrumb.href ?? ''}|${breadcrumb.label}|${
                        breadcrumb.search ? JSON.stringify(breadcrumb.search) : ''
                      }`}>
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 ? (
                          <span className="text-muted-foreground whitespace-nowrap">{breadcrumb.label}</span>
                        ) : (
                          <BreadcrumbLink className="whitespace-nowrap touch-action:manipulation" asChild>
                            <NavLink to={breadcrumb.href} search={breadcrumb.search}>
                              {breadcrumb.label}
                            </NavLink>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-28 rounded mb-1" />
            <Skeleton className="h-4 w-36 rounded" />
          </>
        )}
      </div>
      <div className={`h-full flex gap-2 py-4 pr-4 ${breadcrumbs.length > 1 ? 'items-end' : 'items-center'}`}>
        <div className="flex items-center gap-1.5 md:gap-2">{config?.buttons}</div>
      </div>
    </header>
  )
}
