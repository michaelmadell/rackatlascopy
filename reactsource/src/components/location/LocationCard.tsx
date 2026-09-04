import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@patchdocs/ui'
import {
  TbAddressBook,
  TbBuilding,
  TbStairs,
  TbDoor,
  TbDevices,
  TbMapPin,
  TbPhone,
  TbDotsVertical,
  TbEdit,
  TbLoader2,
  TbCopy,
  TbLink,
  TbFileDownload,
  TbTimelineEventText,
  TbArrowsMove,
  TbTrash,
  TbNotes
} from 'react-icons/tb'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useExport } from '@/contexts/ExportContext'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useAppStore } from '@/lib/app-store'
import { canMoveResourceType, getAddressString } from '@/lib/utils'
import * as m from '@/paraglide/messages'
import type { Location, PermissionsCheckResult } from '@/types'

export type LocationListItem = Location & {
  floorsCount: number
  roomsCount: number
  devicesCount: number
}

interface LocationCardProps {
  location: LocationListItem
  tenantId: string
  readOnly: boolean
  onEdit: (location: Location, permissions?: PermissionsCheckResult) => void
  onNotes: (location: Location, permissions?: PermissionsCheckResult) => void
  onMove: (location: Location) => void
  onDelete: (location: Location) => void
  onActivityLog: (location: Location) => void
}

const LocationCard = ({
  location,
  tenantId,
  readOnly,
  onEdit,
  onNotes,
  onMove,
  onDelete,
  onActivityLog
}: LocationCardProps) => {
  const [loadingAction, setLoadingAction] = useState<'edit' | 'notes' | null>(null)
  // The list endpoint never reports per-location permissions (list semantics strip read_all/delete), so the menu
  // resolves them from the single-location query — same key as the detail page, so the cache is shared and an
  // invalidation after a save refreshes this card too.
  const [loadFull, setLoadFull] = useState(false)
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { triggerExport } = useExport()
  const customer = useAppStore((s) => s.customer)
  const tenants = useAppStore((s) => s.tenants)

  const fullQueryOptions = {
    queryKey: ['location', tenantId, location._id],
    queryFn: (): Promise<{ data: Location; permissions?: PermissionsCheckResult }> =>
      api.get(`/tenant/${tenantId}/location/${location._id}`).then((res) => res.data)
  }
  const fullQuery = useQuery({ ...fullQueryOptions, enabled: loadFull })
  const full = fullQuery.data

  // Both top-level actions need the full location (and its permissions), which the list endpoint never carries.
  const openWithFull = async (
    action: 'edit' | 'notes',
    open: (location: Location, permissions?: PermissionsCheckResult) => void
  ) => {
    setLoadFull(true)
    setLoadingAction(action)
    try {
      const result = await queryClient.fetchQuery(fullQueryOptions)
      open(result.data, result.permissions)
    } catch (_error) {
      // handled by interceptor
    } finally {
      setLoadingAction(null)
    }
  }

  const copy = (text: string, event: string) => {
    navigator.clipboard.writeText(text)
    toast.success(m.copied_to_clipboard())
    posthog?.capture(event)
  }

  const permissions = full?.permissions
  const canWrite = !readOnly && permissions?.canWrite
  const canMove = canWrite && canMoveResourceType('location', customer?.accountType, tenants.length)
  const address = getAddressString(location.address)
  const contact = location.contactPerson?.lastName ? location.contactPerson : undefined

  return (
    <Card className="p-3 md:p-4 relative overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex items-center sm:gap-0.5">
        <Button
          size="sm-icon"
          variant="ghost"
          onClick={() => openWithFull('edit', onEdit)}
          className="p-0.5 sm:p-1"
          disabled={loadingAction !== null || readOnly}>
          {loadingAction === 'edit' ? (
            <TbLoader2 className="size-4 sm:size-5 animate-spin" />
          ) : (
            <TbEdit className="size-4 sm:size-5" />
          )}
        </Button>
        <Button
          size="sm-icon"
          variant="ghost"
          onClick={() => openWithFull('notes', onNotes)}
          className="p-0.5 sm:p-1"
          disabled={loadingAction !== null || readOnly}>
          {loadingAction === 'notes' ? (
            <TbLoader2 className="size-4 sm:size-5 animate-spin" />
          ) : (
            <TbNotes
              className={`size-4 sm:size-5 ${location.notesExcerpt ? 'text-yellow-600 dark:text-yellow-400' : ''}`}
            />
          )}
        </Button>
        <DropdownMenu onOpenChange={(open) => open && setLoadFull(true)}>
          <DropdownMenuTrigger asChild>
            <Button size="sm-icon" variant="ghost" className="p-0.5 sm:p-1">
              <TbDotsVertical className="size-4 sm:size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-xs cursor-pointer py-1"
              onClick={() => copy(location.fullReference || location.reference, 'app:copy_id_to_clipboard')}>
              <TbCopy className="size-3" />
              {m.copy_id()}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs cursor-pointer py-1"
              onClick={() =>
                copy(
                  `${window.location.origin}/app/t/${tenantId}/locations/${location._id}`,
                  'app:copy_link_to_clipboard'
                )
              }>
              <TbLink className="size-3" />
              {m.copy_link()}
            </DropdownMenuItem>
            {loadFull && fullQuery.isPending && (
              <DropdownMenuItem className="text-xs py-1" disabled>
                <TbLoader2 className="size-3 animate-spin" />
                {m.loading()}&hellip;
              </DropdownMenuItem>
            )}
            {permissions?.canReadAll && !readOnly && (
              <DropdownMenuItem
                className="text-xs cursor-pointer py-1"
                onClick={() => triggerExport('location', location._id)}>
                <TbFileDownload className="size-3" />
                {m.export_as_pdf()}
              </DropdownMenuItem>
            )}
            {permissions?.canReadAll && (
              <DropdownMenuItem className="text-xs cursor-pointer py-1" onClick={() => onActivityLog(location)}>
                <TbTimelineEventText className="size-3" />
                {m.activity_log()}
              </DropdownMenuItem>
            )}
            {canMove && full && (
              <DropdownMenuItem className="text-xs cursor-pointer py-1" onClick={() => onMove(full.data)}>
                <TbArrowsMove className="size-3" />
                {m.move()}
              </DropdownMenuItem>
            )}
            {!readOnly && permissions?.canDelete && (
              <DropdownMenuItem className="text-xs cursor-pointer py-1" onClick={() => onDelete(location)}>
                <TbTrash className="size-3 text-destructive-foreground" />
                {m.delete()}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 md:gap-4 pr-20 sm:pr-24">
          <Link
            to="/app/t/$tenantId/locations/$locationId"
            params={{ tenantId, locationId: location._id ?? '' }}
            className="bg-foreground text-background flex aspect-square size-10 md:size-12 items-center justify-center rounded-lg">
            <TbBuilding className="size-5 md:size-6" />
          </Link>
          <div className="grid flex-1 text-left min-w-0">
            <Link
              to="/app/t/$tenantId/locations/$locationId"
              params={{ tenantId, locationId: location._id ?? '' }}
              className="truncate text-base md:text-lg font-semibold leading-snug">
              {location.name}
            </Link>
            <span className="truncate text-sm leading-snug text-muted-foreground">{location.reference}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground leading-none">
              <TbStairs className="size-3 shrink-0" /> {m.floors()}
            </span>
            <span className="text-base md:text-lg font-semibold leading-none">{location.floorsCount}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground leading-none">
              <TbDoor className="size-3 shrink-0" /> {m.rooms()}
            </span>
            <span className="text-base md:text-lg font-semibold leading-none">{location.roomsCount}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-sm text-muted-foreground leading-none">
              <TbDevices className="size-3 shrink-0" /> {m.devices()}
            </span>
            <span className="text-base md:text-lg font-semibold leading-none">{location.devicesCount}</span>
          </div>
        </div>
        {(address || contact) && (
          <div className="flex flex-col gap-3 text-sm">
            {address && (
              <div className="flex items-center gap-1.5">
                <TbMapPin className="size-4 shrink-0" />
                <span className="leading-none">{address}</span>
              </div>
            )}
            {contact && (
              <div className="flex items-center gap-1.5">
                <TbAddressBook className="size-4 shrink-0" />
                <span className="leading-none">
                  {`${contact.firstName} ${contact.lastName}${contact.jobTitle ? `, ${contact.jobTitle}` : ''}`}
                </span>
              </div>
            )}
            {contact?.phone && (
              <div className="flex items-center gap-1.5">
                <TbPhone className="size-4 shrink-0" />
                <span className="leading-none">{contact.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

export default LocationCard
