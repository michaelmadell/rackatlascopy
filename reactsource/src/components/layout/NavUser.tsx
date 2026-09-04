import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { TbSelector, TbLogout, TbCheck, TbUser, TbSwitchHorizontal } from 'react-icons/tb'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  ScrollArea
} from '@patchdocs/ui'
import { usePostHog } from 'posthog-js/react'
import { useAppStore } from '@/lib/app-store'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import Loader from '@/components/common/Loader'
import * as m from '@/paraglide/messages'

interface Customer {
  _id: string
  name: string
}

export function NavUser() {
  const posthog = usePostHog()
  const { logout } = useAuth0()
  const { isMobile, setOpenMobile } = useSidebar()
  const api = useAuthenticatedApi()
  const user = useAppStore((state) => state.user)
  const customer = useAppStore((state) => state.customer)
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)
  const avatarTimestamp = useAppStore((state) => state.avatarTimestamp)
  const acceptedCustomerIds = new Set(
    user?.customers?.filter((id) => {
      const invitation = user?.invitations?.find((inv) => inv.invitedToCustomerId === id)
      return !invitation || invitation.acceptedAt
    })
  )
  const canSwitchCustomer = acceptedCustomerIds.size > 1
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)

  const { data: customers, isPending } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customer')
      return response.data.data
    },
    enabled: customerDialogOpen && canSwitchCustomer
  })

  const switchCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await api.post(`/user/${user?._id}/change-customer`, { customerId })
    },
    onSuccess: () => {
      posthog?.capture('account:customer_switch')
      posthog?.reset()
      window.location.href = '/app'
    }
  })

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    posthog?.capture('account:theme_change', { theme: newTheme })
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-sidebar-border cursor-pointer">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage
                    src={
                      user?.avatar
                        ? `${import.meta.env.VITE_PUBLIC_STORAGE}${user.avatar}?t=${avatarTimestamp}`
                        : undefined
                    }
                  />
                  <AvatarFallback className="rounded-lg">{user?.firstName?.charAt(0) ?? ''}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="truncate text-xs">{canSwitchCustomer ? `@ ${customer?.name}` : user?.email}</span>
                </div>
                <TbSelector className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                      src={
                        user?.avatar
                          ? `${import.meta.env.VITE_PUBLIC_STORAGE}${user.avatar}?t=${avatarTimestamp}`
                          : undefined
                      }
                    />
                    <AvatarFallback className="rounded-lg">{user?.firstName?.charAt(0) ?? ''}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">{m.theme()}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleThemeChange('light')}>
                      {theme === 'light' && <TbCheck />}
                      {m.theme_light()}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleThemeChange('dark')}>
                      {theme === 'dark' && <TbCheck />}
                      {m.theme_dark()}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleThemeChange('system')}>
                      {theme === 'system' && <TbCheck />}
                      {m.theme_system()}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link
                    to="/app/account"
                    className="w-full cursor-pointer"
                    onClick={() => isMobile && setOpenMobile(false)}>
                    <TbUser />
                    {m.profile_settings()}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {canSwitchCustomer && (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        setDropdownOpen(false)
                        setCustomerDialogOpen(true)
                      }}>
                      <TbSwitchHorizontal />
                      {m.switch_directory()}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  posthog?.capture('account:auth0_logout')
                  posthog?.reset()
                  logout({ logoutParams: { returnTo: import.meta.env.VITE_LOGOUT_URL } })
                }}>
                <TbLogout />
                {m.sign_out()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{m.switch_directory()}</DialogTitle>
            <DialogDescription className="sr-only">Select a directory below.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="mt-4 h-75">
            {isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {customers
                  ?.filter((cust) => acceptedCustomerIds.has(cust._id))
                  .map((cust) => (
                    <Button
                      key={cust._id}
                      variant={customer?._id === cust._id ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => switchCustomerMutation.mutate(cust._id)}
                      disabled={switchCustomerMutation.isPending || customer?._id === cust._id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cust.name}</span>
                        {customer?._id === cust._id && <TbCheck className="ml-2 h-4 w-4" />}
                      </div>
                    </Button>
                  ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
