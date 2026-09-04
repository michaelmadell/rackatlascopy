import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isUserAdminOfCurrentCustomer } from '@/lib/utils'
import { computeBillingStatus, type BillingStatus } from '@/components/billing/billing-utils'
import type { Theme, User, Tenant, Customer } from '@/types'

interface AppState {
  // Layout
  showSidebar: boolean
  toggleSidebar: () => void
  showInfoSidebar: boolean
  setShowInfoSidebar: (open: boolean) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  commandMenuOpen: boolean
  setCommandMenuOpen: (open: boolean) => void
  supportRequestDialogOpen: boolean
  setSupportRequestDialogOpen: (open: boolean) => void
  // User
  user: User | null
  setUser: (user: User) => void
  avatarTimestamp: number
  setAvatarTimestamp: (timestamp: number) => void
  // Customer
  customer: Customer | null
  billingStatus: BillingStatus
  setCustomer: (customer: Customer) => void
  // Tenant
  tenants: Tenant[]
  setTenants: (tenants: Tenant[]) => void
  activeTenant: Tenant | null
  setActiveTenant: (tenant: Tenant) => void
  lastUsedTenantIdByCustomer: Record<string, string> // Persisted - per-customer fallback when navigating to /app
  // Tenant users
  tenantUsers: Partial<User>[]
  setTenantUsers: (tenantUsers: Partial<User>[]) => void
  // Cache handling
  needToRefetchFloorData: boolean
  setNeedToRefetchFloorData: (needToRefetch: boolean) => void
  needToRefetchRackData: boolean
  setNeedToRefetchRackData: (needToRefetch: boolean) => void
  // Custom device icons
  customDeviceIcons: Record<string, string>
  setCustomDeviceIcons: (icons: Record<string, string>) => void
  setCustomDeviceIcon: (name: string, svg: string) => void
  // Floor editor viewports
  floorViewports: Record<string, { x: number; y: number; k: number }>
  setFloorViewport: (floorId: string, transform: { x: number; y: number; k: number }) => void
  // Maintenance
  isMaintenanceMode: boolean
  maintenanceRetryAfter: number | null
  setMaintenanceMode: (active: boolean, retryAfter?: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Layout
      showSidebar: true,
      toggleSidebar: () => set({ showSidebar: !get().showSidebar }),
      showInfoSidebar: false,
      setShowInfoSidebar: (open: boolean) => set({ showInfoSidebar: open }),
      theme: 'system',
      setTheme: (theme: Theme) => set({ theme }),
      commandMenuOpen: false,
      setCommandMenuOpen: (open: boolean) => set({ commandMenuOpen: open }),
      supportRequestDialogOpen: false,
      setSupportRequestDialogOpen: (open: boolean) => set({ supportRequestDialogOpen: open }),
      // User
      user: {
        _id: 'usr-michael',
        customerId: 'cust-monkeys',
        email: 'info@monkeys3dprints.co.uk',
        name: 'Michael Madell',
        role: 'admin',
        isCustomerAdmin: true,
        language: 'en',
      },
      setUser: (user: User) => set({ user: { ...user, isCustomerAdmin: user.isCustomerAdmin ?? isUserAdminOfCurrentCustomer(user) } }),
      avatarTimestamp: 0,
      setAvatarTimestamp: (timestamp: number) => set({ avatarTimestamp: timestamp }),
      // Customer
      customer: {
        _id: 'cust-monkeys',
        name: 'Monkeys 3D Prints',
        billing: { subscriptionStatus: 'active', plan: 'pro', validUntil: '2027-12-31' },
        customDeviceTypes: [],
        contactPerson: {
          firstName: 'Michael',
          lastName: 'Madell',
          email: 'info@monkeys3dprints.co.uk',
          phone: '+447123456789',
          jobTitle: 'Admin',
          department: 'Engineering',
        },
      },
      billingStatus: 'active',
      setCustomer: (customer: Customer) => set({ customer, billingStatus: computeBillingStatus(customer.billing) }),
      // Tenant
      tenants: [],
      setTenants: (tenants: Tenant[]) => set({ tenants }),
      activeTenant: null,
      setActiveTenant: (tenant: Tenant) =>
        set((state) => ({
          activeTenant: tenant,
          lastUsedTenantIdByCustomer: { ...state.lastUsedTenantIdByCustomer, [tenant.customerId]: tenant._id }
        })),
      lastUsedTenantIdByCustomer: {},
      // Tenant users
      tenantUsers: [],
      setTenantUsers: (tenantUsers: Partial<User>[]) => set({ tenantUsers }),
      // Cache handling
      needToRefetchFloorData: false,
      setNeedToRefetchFloorData: (needToRefetch: boolean) => set({ needToRefetchFloorData: needToRefetch }),
      needToRefetchRackData: false,
      setNeedToRefetchRackData: (needToRefetch: boolean) => set({ needToRefetchRackData: needToRefetch }),
      // Custom device icons
      customDeviceIcons: {},
      setCustomDeviceIcons: (icons: Record<string, string>) => set({ customDeviceIcons: icons ?? {} }),
      setCustomDeviceIcon: (name: string, svg: string) =>
        set((state) => ({ customDeviceIcons: { ...state.customDeviceIcons, [name]: svg } })),
      // Maintenance
      isMaintenanceMode: false,
      maintenanceRetryAfter: null,
      setMaintenanceMode: (active: boolean, retryAfter?: number) =>
        set({ isMaintenanceMode: active, maintenanceRetryAfter: retryAfter ?? null }),
      // Floor editor viewports
      floorViewports: {},
      setFloorViewport: (floorId: string, transform: { x: number; y: number; k: number }) => {
        if (!floorId) return
        set((state) => {
          const viewports = { ...state.floorViewports, [floorId]: transform }
          const keys = Object.keys(viewports)
          if (keys.length > 50) {
            delete viewports[keys[0]]
          }
          return { floorViewports: viewports }
        })
      }
    }),
    {
      name: 'pds',
      partialize: (state) => ({
        ...state,
        // Exclude transient UI state from persistence
        commandMenuOpen: undefined,
        supportRequestDialogOpen: undefined,
        // activeTenant is derived from URL, not persisted (prevents cross-tab conflicts)
        activeTenant: undefined,
        // Icons are fetched fresh on load
        customDeviceIcons: undefined,
        // Maintenance is transient
        isMaintenanceMode: undefined,
        maintenanceRetryAfter: undefined
      })
    }
  )
)
