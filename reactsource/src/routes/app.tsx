import { useEffect } from 'react'
import { createFileRoute, useRouter, useRouterState, Outlet, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SidebarProvider, Toaster, Button } from '@patchdocs/ui'
import { TbAlertOctagon } from 'react-icons/tb'
import * as Sentry from '@sentry/react'
import { useAuth0 } from '@auth0/auth0-react'
import { usePostHog } from 'posthog-js/react'
import { useAppStore } from '@/lib/app-store'
import { getConsent, onConsentChange, useConsentResolved, type ConsentState } from '@/lib/consent'
import { debugLog } from '@/lib/debug'
import { pushDataLayer } from '@/lib/gtm'
import { DocPanelProvider } from '@/contexts/DocPanelContext'
import { ExportProvider, useExport } from '@/contexts/ExportContext'
import { HeaderProvider } from '@/contexts/HeaderContext'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useAnnouncementsQuery } from '@/hooks/useAnnouncementsQuery'
import ExportLoadingDialog from '@/components/dialogs/ExportLoadingDialog'
import { AppSidebar } from '@/components/layout/AppSidebar'
import Header from '@/components/layout/Header'
import CommandMenu from '@/components/dialogs/CommandMenu'
import SupportRequestDialog from '@/components/dialogs/SupportRequestDialog'
import Loader from '@/components/common/Loader'
import ErrorPage from '@/components/common/ErrorPage'
import MaintenancePage from '@/components/common/MaintenancePage'
import AnnouncementsDialog from '@/components/dialogs/AnnouncementsDialog'
import BillingBanner from '@/components/billing/BillingBanner'
import { setLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import type { Customer, Tenant, User } from '@/types'

export const Route = createFileRoute('/app')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/', search: { redirect: location.href } })
    }
  },
  component: ProtectedAppLayout
})

function ExportLoadingDialogWrapper() {
  const { isExporting } = useExport()
  return <ExportLoadingDialog open={isExporting} />
}

// Cookiebot is the source of truth for consent. We mirror it onto the user document
// (one-directional) so the API can gate server-side PostHog independently of the browser.
// Reads the live user from the store (not a captured closure) so repeated changes compare
// against the latest persisted value rather than a stale snapshot.
function persistConsentToUser(
  consent: ConsentState,
  api: ReturnType<typeof useAuthenticatedApi>,
  posthog: ReturnType<typeof usePostHog>
) {
  const { user, setUser } = useAppStore.getState()
  if (!user?._id) return
  const db = user.trackingConsent
  const differs = !db || db.analytics !== consent.analytics || db.marketing !== consent.marketing
  if (differs) {
    debugLog('consent', 'syncing consent → DB', { from: db, to: consent, userId: user._id })
    api
      .patch(`/user/${user._id}`, { trackingConsent: consent })
      .then((res) => {
        if (res?.data?.data) {
          setUser(res.data.data as User)
          debugLog('consent', 'consent persisted to DB')
        }
      })
      .catch((err) => debugLog('consent', 'consent DB sync failed', err))
  } else {
    debugLog('consent', 'consent already matches DB, skipping sync', consent)
  }
  if (consent.analytics) {
    debugLog('consent', 'analytics granted → posthog.identify', { userId: user._id })
    posthog?.identify(user._id, { email: user.email })
    pushDataLayer({ event: 'user_id_set', user_id: user._id })
  }
}

function ProtectedAppLayout() {
  const router = useRouter()
  const posthog = usePostHog()
  const { logout } = useAuth0()
  const api = useAuthenticatedApi()
  const theme = useAppStore((state) => state.theme)
  const showSidebar = useAppStore((state) => state.showSidebar)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const setUser = useAppStore((state) => state.setUser)
  const setCustomer = useAppStore((state) => state.setCustomer)
  const setTenants = useAppStore((state) => state.setTenants)
  const activeTenant = useAppStore((state) => state.activeTenant)
  const setActiveTenant = useAppStore((state) => state.setActiveTenant)
  const setTenantUsers = useAppStore((state) => state.setTenantUsers)
  const setCustomDeviceIcons = useAppStore((state) => state.setCustomDeviceIcons)
  const supportRequestDialogOpen = useAppStore((state) => state.supportRequestDialogOpen)
  const setSupportRequestDialogOpen = useAppStore((state) => state.setSupportRequestDialogOpen)

  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: () =>
      api.get('/user/self').then((res) => {
        const user = res?.data?.data as User | undefined
        if (!user) {
          Sentry.captureException(new Error('Missing user data in /user/self response'))
          throw new Error(m.unexpected_error())
        }
        setUser(user)
        setLocale((user.language as 'en' | 'de') || 'en')
        Sentry.setUser({ id: user._id, email: user.email })
        const consent = getConsent()
        if (consent) persistConsentToUser(consent, api, posthog)
        return user
      })
  })

  const customerQuery = useQuery({
    queryKey: ['customer'],
    enabled: !!userQuery.data?.customerId,
    queryFn: () =>
      api.get(`/customer/${userQuery.data?.customerId}`).then((res) => {
        const customer = res.data.data as Customer
        setCustomer(customer)
        posthog?.group('customer', customer._id, { name: customer.name })
        return customer
      })
  })

  const customDeviceIconsQuery = useQuery({
    queryKey: ['custom-device-icons'],
    enabled: !!customerQuery.data,
    queryFn: () =>
      api.get<{ success: boolean; data: Record<string, string> }>('/icon/customer').then((res) => {
        setCustomDeviceIcons(res.data.data)
        return res.data.data
      })
  })

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    enabled: !!userQuery.data,
    queryFn: () =>
      api.get('/tenant?sort=name&limit=100').then((res) => {
        const tenants = res.data.data.docs as Tenant[]
        setTenants(tenants)
        if (tenants.length > 0) {
          // Priority: URL tenant > lastUsedTenantIdByCustomer (persisted, per-customer) > first tenant
          const urlTenantId = (
            router.state.matches.find((m) => 'tenantId' in m.params)?.params as { tenantId?: string } | undefined
          )?.tenantId
          const customerId = tenants[0].customerId
          const lastUsedTenantId = useAppStore.getState().lastUsedTenantIdByCustomer[customerId]
          let selectedTenant = tenants[0]
          if (urlTenantId) {
            const tenant = tenants.find((t: Tenant) => t._id === urlTenantId)
            if (tenant) selectedTenant = tenant
          } else if (lastUsedTenantId) {
            const tenant = tenants.find((t: Tenant) => t._id === lastUsedTenantId)
            if (tenant) selectedTenant = tenant
          }
          setActiveTenant(selectedTenant)
        }
        return tenants
      })
  })

  const tenantUsersQuery = useQuery({
    queryKey: ['tenant-users', activeTenant?._id],
    enabled: !!tenantsQuery.data && !!activeTenant?._id,
    queryFn: () =>
      api
        .get(`/user?tenantId=${activeTenant?._id}&limit=100&sort=-createdAt&select=_id,firstName,lastName,email`)
        .then((res) => {
          setTenantUsers(res.data.data.docs)
          return res.data.data.docs
        })
  })

  useAnnouncementsQuery(!!userQuery.data)

  const announcementsPopupQuery = useQuery({
    queryKey: ['announcements', 'popup'],
    enabled: !!userQuery.data,
    queryFn: () => api.get('/announcement?popup=true').then((res) => res.data.data)
  })

  // Hold the announcements popup until consent is resolved so its modal dialog never opens
  // over the Cookiebot banner (which would steal the first click and dismiss the announcement).
  const consentResolved = useConsentResolved()

  // Mirror later Cookiebot consent changes (banner re-open / renew) onto the user document.
  const currentUser = userQuery.data
  useEffect(() => {
    if (!currentUser) return
    return onConsentChange((state) => {
      if (state) persistConsentToUser(state, api, posthog)
    })
  }, [currentUser, api, posthog])

  useEffect(() => {
    const { location } = router.state
    if (tenantsQuery.data && activeTenant && (location.pathname === '/app' || location.pathname === '/app/')) {
      router.navigate({ to: '/app/t/$tenantId/locations', params: { tenantId: activeTenant._id } })
    }
  }, [tenantsQuery.data, activeTenant, router])

  // Sync active tenant when URL tenant changes
  const urlTenantId = useRouterState({
    select: (s) =>
      (s.matches.find((m) => 'tenantId' in m.params)?.params as { tenantId?: string } | undefined)?.tenantId
  })
  useEffect(() => {
    if (!tenantsQuery.data || !urlTenantId) return
    if (activeTenant?._id !== urlTenantId) {
      const tenant = tenantsQuery.data.find((t: Tenant) => t._id === urlTenantId)
      if (tenant) setActiveTenant(tenant)
    }
  }, [urlTenantId, tenantsQuery.data, activeTenant?._id, setActiveTenant])

  useEffect(() => {
    function updateStores(e: StorageEvent) {
      if (e.key === 'pds') {
        useAppStore.persist.rehydrate()
      }
    }
    window.addEventListener('storage', updateStores)
    return () => {
      window.removeEventListener('storage', updateStores)
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    const resolvedTheme =
      theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
    root.classList.add(resolvedTheme)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#121212' : '#ffffff')
    }
  }, [theme])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1440px)')
    const onChange = () => {
      if (window.innerWidth <= 1440 && showSidebar) {
        toggleSidebar()
      }
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [showSidebar, toggleSidebar])

  // Maintenance mode: any critical query returning 503
  const isMaintenanceError = [userQuery.error, customerQuery.error, tenantsQuery.error].some((err) => {
    if (!err || !('response' in err)) return false
    return (err as unknown as { response: { status: number } }).response?.status === 503
  })
  if (isMaintenanceError) return <MaintenancePage />

  if (userQuery.error) {
    return <ErrorPage error={userQuery.error} />
  }

  // Handle soft-deleted customer
  if (customerQuery.error) {
    const isAxiosError = 'response' in customerQuery.error
    const status = isAxiosError
      ? (customerQuery.error as unknown as { response: { status: number } }).response?.status
      : null

    if (status === 410) {
      return (
        <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center px-4">
          <TbAlertOctagon className="text-foreground text-5xl mb-3" />
          <h1 className="text-xl font-semibold mb-2">{m.organisation_closed()}</h1>
          <p className="text-muted-foreground mb-8">{m.organisation_closed_description()}</p>
          <Button
            onClick={() => {
              posthog?.capture('account:auth0_logout_closed')
              posthog?.reset()
              logout({ logoutParams: { returnTo: import.meta.env.VITE_LOGOUT_URL } })
            }}>
            {m.sign_out()}
          </Button>
        </div>
      )
    }

    return <ErrorPage error={customerQuery.error} />
  }

  if (tenantsQuery.error) {
    return <ErrorPage error={tenantsQuery.error} />
  }
  if (tenantUsersQuery.error) {
    return <ErrorPage error={tenantUsersQuery.error} />
  }

  if (
    userQuery.isPending ||
    customerQuery.isPending ||
    tenantsQuery.isPending ||
    (activeTenant && tenantUsersQuery.isPending) ||
    (customerQuery.data && customDeviceIconsQuery.isPending)
  ) {
    return <Loader />
  }

  if (!activeTenant) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <TbAlertOctagon className="text-foreground text-5xl mb-3" />
        <p className="mb-8">{m.no_permissions_error()}</p>
        <Button
          onClick={() => {
            posthog?.capture('account:auth0_logout')
            posthog?.reset()
            logout({ logoutParams: { returnTo: import.meta.env.VITE_LOGOUT_URL } })
          }}>
          {m.sign_out()}
        </Button>
      </div>
    )
  }

  return (
    <DocPanelProvider>
      <ExportProvider>
        <SidebarProvider defaultOpen={true} open={showSidebar} onOpenChange={toggleSidebar}>
          <AppSidebar />
          <HeaderProvider>
            <div className="flex flex-col w-full h-svh bg-background text-foreground">
              <BillingBanner />
              <Header />
              <main className="h-full bg-muted/50">
                <Outlet />
              </main>
            </div>
          </HeaderProvider>
          <CommandMenu />
          <SupportRequestDialog open={supportRequestDialogOpen} onOpenChange={setSupportRequestDialogOpen} />
          <Toaster position="top-center" richColors offset={10} theme={theme} />
          {consentResolved &&
            announcementsPopupQuery.data &&
            announcementsPopupQuery.data.length > 0 &&
            userQuery.data && (
              <AnnouncementsDialog
                announcements={announcementsPopupQuery.data}
                language={userQuery.data.language ?? 'en'}
              />
            )}
        </SidebarProvider>
        <ExportLoadingDialogWrapper />
      </ExportProvider>
    </DocPanelProvider>
  )
}
