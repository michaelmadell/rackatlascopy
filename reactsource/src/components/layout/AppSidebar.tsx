import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useAnnouncementsQuery } from '@/hooks/useAnnouncementsQuery'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  Separator,
  useSidebar,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@patchdocs/ui'
import {
  TbSearch,
  TbMapPin,
  TbUsers,
  TbBuilding,
  TbSettings,
  TbBook,
  TbBook2,
  TbLifebuoy,
  TbLicense,
  TbListSearch,
  TbHistory,
  TbAdjustments,
  TbCloudDataConnection,
  TbWorld,
  TbWifi,
  TbServer,
  TbChevronRight,
  TbBell
} from 'react-icons/tb'
import { usePostHog } from 'posthog-js/react'
import { TenantSwitcher } from '@/components/layout/TenantSwitcher'
import { NavUser } from '@/components/layout/NavUser'
import { KeyboardCommand } from '@/components/common/KeyboardCommand'
import { useAppStore } from '@/lib/app-store'
import { isUserAdminOfCurrentTenant } from '@/lib/utils'
import * as m from '@/paraglide/messages'
import type { IconType } from 'react-icons'

const getNavItems = ({
  isTenantAdmin,
  isCustomerAdmin,
  isSystemIntegrator
}: {
  isTenantAdmin: boolean
  isCustomerAdmin: boolean
  isSystemIntegrator: boolean
}) => ({
  main: [
    // {
    //   id: 'dashboard',
    //   href: '/app/t/$tenantId/dashboard',
    //   icon: TbLayoutDashboard,
    //   label: m.dashboard(),
    //   show: true
    // },
    {
      id: 'locations',
      href: '/app/t/$tenantId/locations',
      icon: TbMapPin,
      label: m.locations(),
      show: true
    },
    {
      id: 'racks',
      href: '/app/t/$tenantId/racks',
      icon: TbServer,
      label: m.racks(),
      show: true
    },
    {
      id: 'network',
      icon: TbWorld,
      label: m.networks(),
      show: true,
      isCollapsible: true,
      children: [
        {
          id: 'vlan',
          href: '/app/t/$tenantId/vlan',
          icon: TbCloudDataConnection,
          label: m.vlan(),
          show: true
        },
        {
          id: 'wlan',
          href: '/app/t/$tenantId/wlan',
          icon: TbWifi,
          label: m.wlan(),
          show: true
        }
      ]
    },
    {
      id: 'resources',
      href: '/app/t/$tenantId/resources',
      icon: TbListSearch,
      label: m.resources(),
      show: true
    },
    {
      id: 'activity',
      href: '/app/t/$tenantId/activity',
      icon: TbHistory,
      label: m.activity_log(),
      show: true
    },
    {
      id: 'tenant-settings',
      href: '/app/t/$tenantId/settings',
      icon: TbAdjustments,
      label: m.tenant_settings(),
      show: isSystemIntegrator && isTenantAdmin && !isCustomerAdmin
    }
  ],
  admin: [
    {
      id: 'library',
      href: '/app/library',
      icon: TbBook2,
      label: m.device_library(),
      show: isCustomerAdmin
    },
    {
      id: 'tenants',
      href: '/app/tenants',
      icon: TbBuilding,
      label: m.tenants(),
      show: isSystemIntegrator && isCustomerAdmin
    },
    {
      id: 'users',
      href: '/app/users',
      icon: TbUsers,
      label: m.users_permissions(),
      show: isTenantAdmin
    },
    {
      id: 'settings',
      href: '/app/settings',
      icon: TbSettings,
      label: m.settings_billing(),
      show: isCustomerAdmin
    }
  ],
  footer: [
    {
      id: 'announcements',
      href: '/app/announcements',
      icon: TbBell,
      label: m.announcements(),
      show: true
    },
    {
      id: 'support-request',
      icon: TbLifebuoy,
      label: m.get_support(),
      show: true,
      isDialog: true
    },
    {
      id: 'docs',
      href: import.meta.env.VITE_DOCS_BASE_URL || 'https://patchdocs.io',
      icon: TbBook,
      label: m.documentation(),
      show: true
    },
    {
      id: 'legal',
      href: 'https://patchdocs.io/terms-and-conditions',
      icon: TbLicense,
      label: m.legal_information(),
      highlight: false,
      show: true
    }
  ]
})

function CustomSidebarMenuButton({
  id,
  href,
  icon: Icon,
  label,
  size = 'default',
  highlight,
  badgeCount
}: {
  id: string
  href: string
  icon: IconType
  label: string
  size?: 'default' | 'sm'
  highlight?: boolean
  badgeCount?: number
}) {
  const posthog = usePostHog()
  const { setOpenMobile, isMobile, state } = useSidebar()
  const activeTenant = useAppStore((state) => state.activeTenant)
  const isExternal = href.startsWith('http')
  const showBadge = !!badgeCount && badgeCount > 0 && (state === 'expanded' || isMobile)

  const handleClick = () => {
    if (isExternal) {
      posthog?.capture('app:sidebar_external_link_click', { linkId: id })
    } else if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarMenuButton asChild size={size} tooltip={label}>
      <Link
        to={href}
        params={{ tenantId: activeTenant?._id }}
        target={isExternal ? '_blank' : undefined}
        activeProps={{ className: 'bg-muted' }}
        onClick={handleClick}>
        {({ isActive }: { isActive: boolean }) => (
          <>
            <Icon className={isActive || highlight ? 'text-brand-blue' : ''} />
            <span className={highlight ? 'text-brand-blue' : ''}>{label}</span>
            {showBadge && (
              <span className="ml-auto bg-brand-blue text-white text-xxs leading-none rounded-full px-1.5 py-0.5 min-w-4 text-center">
                {badgeCount}
              </span>
            )}
          </>
        )}
      </Link>
    </SidebarMenuButton>
  )
}

function CollapsedNavDropdown({
  item,
  activeTenantId
}: {
  item: {
    icon: IconType
    label: string
    children: { id: string; href: string; icon: IconType; label: string; show: boolean }[]
  }
  activeTenantId?: string
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleOpen = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }, [])

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton className="cursor-pointer" onMouseEnter={handleOpen} onMouseLeave={handleClose}>
          <item.icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={4}
        className="w-auto p-1 gap-0"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onOpenAutoFocus={(e) => e.preventDefault()}>
        {item.children
          .filter((child) => child.show)
          .map((child) => (
            <Link
              key={child.id}
              to={child.href}
              params={{ tenantId: activeTenantId }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <child.icon className="size-4" />
              <span>{child.label}</span>
            </Link>
          ))}
      </PopoverContent>
    </Popover>
  )
}

export function AppSidebar() {
  const { setCommandMenuOpen, setSupportRequestDialogOpen } = useAppStore()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const user = useAppStore((state) => state.user)
  const customer = useAppStore((state) => state.customer)
  const activeTenant = useAppStore((state) => state.activeTenant)
  const isCustomerAdmin = user?.isCustomerAdmin ?? false
  const isTenantAdmin = isUserAdminOfCurrentTenant(user, activeTenant)
  const isSystemIntegrator = customer?.accountType === 'systemIntegrator'
  const navItems = getNavItems({ isTenantAdmin, isCustomerAdmin, isSystemIntegrator })
  const unreadAnnouncements = useAnnouncementsQuery().data?.length ?? 0

  return (
    <Sidebar collapsible="icon" className="z-50">
      <SidebarHeader>
        {isSystemIntegrator && <TenantSwitcher />}
        {(state === 'expanded' || isMobile) && (
          <button
            type="button"
            className="inline-flex items-center gap-2 whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 px-4 py-2 bg-muted/50 text-muted-foreground hover:bg-muted relative h-8 w-full flex-1 justify-start rounded-md text-xs font-normal shadow-none sm:pr-12 md:flex-none cursor-pointer"
            onClick={() => setCommandMenuOpen(true)}>
            <TbSearch className="pointer-events-none size-4" />
            <span>{m.search()}</span>
            <KeyboardCommand
              keyValue="K"
              className="pointer-events-none absolute top-2 right-2 hidden opacity-100 sm:flex"
              small={true}
            />
          </button>
        )}
        {state === 'collapsed' && !isMobile && (
          <button
            type="button"
            className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-sidebar-ring focus-visible:ring-2 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm cursor-pointer"
            onClick={() => setCommandMenuOpen(true)}>
            <TbSearch />
          </button>
        )}
      </SidebarHeader>
      <SidebarContent className="scrollbar-styled">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.main
                .filter((item) => item.show)
                .map((item) =>
                  item.isCollapsible && item.children ? (
                    <SidebarMenuItem key={item.id}>
                      {state === 'collapsed' && !isMobile ? (
                        <CollapsedNavDropdown item={item} activeTenantId={activeTenant?._id} />
                      ) : (
                        <Collapsible asChild className="group/collapsible">
                          <div>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton className="cursor-pointer" tooltip={item.label}>
                                <item.icon />
                                <span>{item.label}</span>
                                <TbChevronRight className="text-muted-foreground ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children
                                  .filter((child) => child.show)
                                  .map((child) => (
                                    <SidebarMenuSubItem key={child.id}>
                                      <SidebarMenuSubButton asChild>
                                        <Link
                                          to={child.href}
                                          params={{ tenantId: activeTenant?._id }}
                                          activeProps={{ className: 'bg-muted' }}
                                          onClick={() => isMobile && setOpenMobile(false)}>
                                          {({ isActive }: { isActive: boolean }) => (
                                            <>
                                              <child.icon className={isActive ? 'text-brand-blue' : ''} />
                                              <span>{child.label}</span>
                                            </>
                                          )}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )}
                    </SidebarMenuItem>
                  ) : item.href ? (
                    <SidebarMenuItem key={item.id}>
                      <CustomSidebarMenuButton id={item.id} href={item.href} icon={item.icon} label={item.label} />
                    </SidebarMenuItem>
                  ) : null
                )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isTenantAdmin && (
          <>
            <Separator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.admin
                    .filter((item) => item.show)
                    .map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <CustomSidebarMenuButton id={item.id} href={item.href} icon={item.icon} label={item.label} />
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <Separator />
          </>
        )}
        <SidebarGroup className="mt-auto pb-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {navItems.footer
                .filter((item) => item.show)
                .map((item) => (
                  <SidebarMenuItem key={item.id}>
                    {item.isDialog ? (
                      <SidebarMenuButton
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => {
                          if (isMobile) setOpenMobile(false)
                          setSupportRequestDialogOpen(true)
                        }}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    ) : item.href ? (
                      <CustomSidebarMenuButton
                        id={item.id}
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        size="sm"
                        highlight={item.highlight}
                        badgeCount={item.id === 'announcements' ? unreadAnnouncements : undefined}
                      />
                    ) : null}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
            <div className="text-muted-foreground flex justify-between items-center gap-2 overflow-hidden whitespace-nowrap px-2 pt-2 text-xxs group-data-[collapsible=icon]:invisible">
              <span>
                {__APP_VERSION__} <span className="px-0.5">·</span>{' '}
                <a
                  href={`${import.meta.env.VITE_DOCS_BASE_URL}/changelog` || 'https://patchdocs.io'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground">
                  {m.changelog()}
                </a>
              </span>
              {import.meta.env.VITE_APP_ENVIRONMENT !== 'production' && (
                <span className="bg-[#FFFF00] text-black rounded px-1.5 font-mono uppercase leading-snug select-none">
                  {import.meta.env.VITE_APP_ENVIRONMENT}
                </span>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-0 p-0">
        <SidebarGroup>
          <NavUser />
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
