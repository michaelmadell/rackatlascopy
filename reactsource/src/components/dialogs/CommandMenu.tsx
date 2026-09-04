import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@patchdocs/ui'
import { TbServer, TbDevices, TbLifebuoy, TbSunMoon } from 'react-icons/tb'
import { usePostHog } from 'posthog-js/react'
import { useAppStore } from '@/lib/app-store'
import { useResourceSearch } from '@/hooks/useResourceSearch'
import { resourceTypeIcons, getResourceNavigation } from '@/lib/utils'
import * as m from '@/paraglide/messages'

const quickLinks = [
  { href: '/app/t/$tenantId/locations', label: m.locations },
  { href: '/app/t/$tenantId/resources', label: m.resources },
  { href: '/app/t/$tenantId/activity', label: m.activity_log },
  { href: '/app/library', label: m.device_library, customerAdminOnly: true }
]

const docsUrl = import.meta.env.VITE_DOCS_BASE_URL || 'https://patchdocs.io'

export default function CommandMenu() {
  const { commandMenuOpen, setCommandMenuOpen, setSupportRequestDialogOpen, setTheme, activeTenant, user } =
    useAppStore()
  const navigate = useNavigate()
  const posthog = usePostHog()
  const { searchQuery, setSearchQuery, searchResults, isSearching, hasMinQueryLength, searchCount } = useResourceSearch(
    {
      tenantId: activeTenant?._id,
      enabled: commandMenuOpen,
      minQueryLength: 2,
      debounceMs: 300
    }
  )

  // PostHog tracking refs
  const openTimeRef = useRef<number | null>(null)
  const resultSelectedRef = useRef(false)
  const resultTypeSelectedRef = useRef<string | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandMenuOpen(!commandMenuOpen)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandMenuOpen, setCommandMenuOpen])

  // Track dialog open/close and capture analytics
  useEffect(() => {
    if (commandMenuOpen) {
      openTimeRef.current = Date.now()
      resultSelectedRef.current = false
      resultTypeSelectedRef.current = null
    } else if (openTimeRef.current !== null) {
      const duration = Date.now() - openTimeRef.current
      posthog?.capture('app:command_menu_close', {
        duration: duration,
        searchCount: searchCount,
        resultSelected: resultSelectedRef.current,
        resultTypeSelected: resultTypeSelectedRef.current
      })
      openTimeRef.current = null
    }
  }, [commandMenuOpen, posthog, searchCount])

  // Reset search when command menu closes
  useEffect(() => {
    if (!commandMenuOpen) {
      setSearchQuery('')
    }
  }, [commandMenuOpen, setSearchQuery])

  const showSearchResults = hasMinQueryLength

  return (
    <CommandDialog open={commandMenuOpen} onOpenChange={setCommandMenuOpen} shouldFilter={false}>
      <CommandInput placeholder={m.combobox_search_placeholder()} value={searchQuery} onValueChange={setSearchQuery} />
      <CommandList className="max-h-105">
        <CommandEmpty>{m.command_no_results()}</CommandEmpty>

        {!showSearchResults && (
          <>
            <CommandGroup heading={m.command_quicklinks()}>
              {quickLinks
                .filter((link) => !link.customerAdminOnly || user?.isCustomerAdmin)
                .map((link) => (
                  <CommandItem
                    key={link.href}
                    onSelect={() => {
                      resultSelectedRef.current = true
                      resultTypeSelectedRef.current = 'quick_link'
                      setCommandMenuOpen(false)
                      navigate({ to: link.href, params: { tenantId: activeTenant?._id } })
                    }}>
                    {link.label()}
                  </CommandItem>
                ))}
              <CommandItem
                onSelect={() => {
                  resultSelectedRef.current = true
                  resultTypeSelectedRef.current = 'quick_link'
                  setCommandMenuOpen(false)
                  window.open(docsUrl, '_blank', 'noopener')
                }}>
                {m.documentation()}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading={m.actions()}>
              <CommandItem
                onSelect={() => {
                  resultSelectedRef.current = true
                  resultTypeSelectedRef.current = 'action'
                  setCommandMenuOpen(false)
                  setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')
                }}>
                <TbSunMoon className="size-4.5!" />
                {m.theme_toggle()}
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  resultSelectedRef.current = true
                  resultTypeSelectedRef.current = 'action'
                  setCommandMenuOpen(false)
                  setSupportRequestDialogOpen(true)
                }}>
                <TbLifebuoy className="size-4.5!" />
                {m.get_support()}
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {showSearchResults && (
          <>
            {isSearching && (
              <CommandGroup heading={m.command_results()}>
                <CommandItem disabled>{m.address_search_searching()}</CommandItem>
              </CommandGroup>
            )}
            {!isSearching && searchResults.length > 0 && (
              <CommandGroup heading={`${m.command_results()} (${searchResults.length})`}>
                {searchResults.map((result) => {
                  let Icon = TbDevices
                  if (result.type === 'device' && result.deviceType === 'rack') {
                    Icon = TbServer
                  } else if (result.type === 'device') {
                    Icon = TbDevices
                  } else {
                    Icon = resourceTypeIcons[result.type as keyof typeof resourceTypeIcons] || TbDevices
                  }

                  const navigation = getResourceNavigation(result, activeTenant?._id)

                  return (
                    <CommandItem
                      key={result._id}
                      className="flex items-center gap-2"
                      disabled={!navigation}
                      onSelect={() => {
                        if (navigation) {
                          resultSelectedRef.current = true
                          resultTypeSelectedRef.current =
                            result.type === 'device' && result.deviceType === 'rack' ? 'rack' : result.type
                          setCommandMenuOpen(false)
                          navigate(navigation)
                        }
                      }}>
                      <Icon className="size-4" />
                      {result.type === 'vlan' ? (
                        <div className="flex min-w-0 flex-col">
                          <span>
                            {m.vlan()} {result.networkNumber}
                          </span>
                          <span className="text-[11px] truncate">{result.name}</span>
                        </div>
                      ) : result.type === 'wlan' ? (
                        <div className="flex min-w-0 flex-col">
                          <span>{result.ssid}</span>
                          <span className="text-[11px] truncate">{m.wlan()}</span>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">
                            {result.reference}
                            {result.name ? ` - ${result.name}` : ''}
                          </span>
                          <span className="text-[11px] truncate">{result.fullReference || '-'}</span>
                        </div>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
