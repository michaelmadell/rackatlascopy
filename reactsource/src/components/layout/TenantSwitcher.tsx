import { Link, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { TbSelector, TbSettings, TbBriefcase2 } from 'react-icons/tb'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@patchdocs/ui'
import { usePostHog } from 'posthog-js/react'
import { useAppStore } from '@/lib/app-store'
import * as m from '@/paraglide/messages'
import type { Tenant } from '@/types'

export function TenantSwitcher() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { isMobile, setOpenMobile } = useSidebar()
  const tenants = useAppStore((state) => state.tenants)
  const activeTenant = useAppStore((state) => state.activeTenant)

  const handleTenantChange = async (tenant: Tenant) => {
    if (isMobile) setOpenMobile(false)
    await router.navigate({ to: '/app/t/$tenantId/locations', params: { tenantId: tenant._id } })
    await queryClient.invalidateQueries({ queryKey: ['locations', tenant._id] })
    posthog?.capture('tenant:tenant_switch', { tenantId: tenant._id })
  }

  if (!activeTenant) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {tenants.length === 1 && (
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-sidebar-border">
            <div className="bg-foreground text-background flex aspect-square size-8 items-center justify-center rounded-lg">
              <TbBriefcase2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeTenant.name}</span>
              <span className="truncate text-xs">{activeTenant.reference}</span>
            </div>
          </SidebarMenuButton>
        )}
        {tenants.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-sidebar-border cursor-pointer">
                <div className="bg-foreground text-background flex aspect-square size-8 items-center justify-center rounded-lg">
                  <TbBriefcase2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{activeTenant.name}</span>
                  <span className="truncate text-xs">{activeTenant.reference}</span>
                </div>
                <TbSelector className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}>
              <DropdownMenuLabel className="text-muted-foreground text-xs">{m.tenants()}</DropdownMenuLabel>
              {tenants.map((tenant) => (
                <DropdownMenuItem
                  key={tenant.name}
                  onClick={() => handleTenantChange(tenant)}
                  className={`gap-2 p-2 cursor-pointer ${tenant._id === activeTenant._id ? 'font-medium focus:**:text-background!' : ''}`}>
                  <div
                    className={`flex size-6 items-center justify-center rounded-md border ${tenant._id === activeTenant._id ? 'bg-foreground' : ''}`}>
                    <TbBriefcase2
                      className={`size-3.5 shrink-0 ${tenant._id === activeTenant._id ? 'text-background' : ''}`}
                    />
                  </div>
                  {tenant.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 p-2 cursor-pointer" asChild>
                <Link to="/app/tenants" onClick={() => isMobile && setOpenMobile(false)}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <TbSettings className="size-3.5 shrink-0" />
                  </div>
                  <div className="text-muted-foreground font-medium">{m.manage_tenants()}</div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
