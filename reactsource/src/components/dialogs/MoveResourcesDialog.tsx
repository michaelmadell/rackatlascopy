import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label
} from '@patchdocs/ui'
import { TbLoader2 } from 'react-icons/tb'
import TargetRow from '@/components/common/TargetRow'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useDebounce } from '@/hooks/useDebounce'
import { useAppStore } from '@/lib/app-store'
import { canMoveResourceType, type MoveResourceType } from '@/lib/utils'
import * as m from '@/paraglide/messages'

/** Structurally satisfied by `Location`, `Floor` and `Device` alike. */
export interface MovableResource {
  _id: string
  tenantId: string
  reference: string
  fullReference?: string
  locationId?: string
  floorId?: string
  roomId?: string
  deviceType?: string
  level?: number
}

interface MoveSummary {
  to: { tenantId: string; locationId?: string; floorId?: string; roomId?: string; fullReference?: string }
  tenantChanged: boolean
  floorChanged: boolean
  counts: { floors: number; rooms: number; devices: number; connectionsRewritten: number; connectionsDeleted: number }
  affectedVlanIds: string[]
  affectedWlanIds: string[]
  positionReset: boolean
  positionCleared: boolean
}

interface MoveConflict {
  field: 'reference' | 'level'
  suggestion: string | number
}

interface ResourceStub {
  _id: string
  reference: string
  name?: string
}

const vlanWarning = ({ affectedVlanIds, affectedWlanIds }: MoveSummary) => {
  const vlans = affectedVlanIds.length
  const wlans = affectedWlanIds.length
  if (vlans === 0) return m.move_summary_wlans_only({ count: wlans })
  if (wlans === 0) return m.move_summary_vlans_only({ count: vlans })
  return m.move_summary_vlans({ vlans, wlans })
}

const toOptions = (docs: ResourceStub[] = []) =>
  docs.map((doc) => ({ value: doc._id, label: doc.name ? `${doc.reference} - ${doc.name}` : doc.reference }))

export interface MoveResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: MoveResourceType
  resource: MovableResource
}

const REFERENCE_CONFLICT_MESSAGES = {
  location: m.move_conflict_reference_location,
  floor: m.move_conflict_reference_floor,
  device: m.move_conflict_reference_device,
  rack: m.move_conflict_reference_rack
}

const MoveResourceDialog = ({ open, onOpenChange, type, resource }: MoveResourceDialogProps) => {
  const api = useAuthenticatedApi()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams({ strict: false })
  const tenants = useAppStore((state) => state.tenants)
  const customer = useAppStore((state) => state.customer)

  const [tenantId, setTenantId] = useState(resource.tenantId)
  const [locationId, setLocationId] = useState(resource.locationId ?? '')
  const [floorId, setFloorId] = useState(resource.floorId ?? '')
  const [roomId, setRoomId] = useState(resource.roomId ?? '')
  const [reference, setReference] = useState('')
  const [level, setLevel] = useState('')
  const [revealed, setRevealed] = useState<{ reference?: boolean; level?: boolean }>({})
  const [isMoving, setIsMoving] = useState(false)

  const isRack = type === 'device' && resource.deviceType === 'rack'
  const resourceLabel = isRack ? m.rack() : type === 'device' ? m.device() : type === 'floor' ? m.floor() : m.location()

  // Each type moves to a different kind of parent and drags a different subtree along, so one sentence
  // can't cover them — a floor device has nothing "inside it".
  const description = isRack
    ? m.move_rack_description()
    : type === 'device'
      ? m.move_device_description()
      : type === 'floor'
        ? m.move_floor_description()
        : m.move_location_description()

  // Cross-tenant moves are a system-integrator feature; a single tenant leaves nothing to choose.
  const showTenantSelect = canMoveResourceType('location', customer?.accountType, tenants.length)

  // The dialog stays mounted between openings, so reopening has to reset it — during render, not in an
  // effect. An effect runs after the first paint of the reopened dialog, by which point the conflict
  // effect below has already re-revealed the inputs from the previous session's cached 409.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTenantId(resource.tenantId)
      setLocationId(resource.locationId ?? '')
      setFloorId(resource.floorId ?? '')
      setRoomId(resource.roomId ?? '')
      setReference('')
      setLevel('')
      setRevealed({})
      setIsMoving(false)
    }
  }

  const locationsQuery = useQuery({
    queryKey: ['move-locations', tenantId],
    queryFn: () =>
      api.get(`/tenant/${tenantId}/location?limit=1000&select=_id,reference,name`).then((res) => res.data?.data?.docs),
    enabled: open && type !== 'location' && !!tenantId
  })

  const floorsQuery = useQuery({
    queryKey: ['move-floors', tenantId, locationId],
    queryFn: () =>
      api
        .get(`/tenant/${tenantId}/floor?locationId=${locationId}&limit=250&sort=level&select=_id,reference,name`)
        .then((res) => res.data?.data?.docs),
    enabled: open && type === 'device' && !!locationId
  })

  const roomsQuery = useQuery({
    queryKey: ['move-rooms', tenantId, floorId],
    queryFn: () =>
      api
        .get(`/tenant/${tenantId}/room?floorId=${floorId}&limit=1000&select=_id,reference,name`)
        .then((res) => res.data?.data?.docs),
    enabled: open && type === 'device' && !!floorId
  })

  const target =
    type === 'location'
      ? { tenantId }
      : type === 'floor'
        ? { tenantId, locationId }
        : { tenantId, locationId, floorId, roomId }

  // The deepest id is the one the server needs; `changed` is what keeps the preview from firing a
  // guaranteed `move_target_unchanged` while the current values are still selected.
  const targetReady = type === 'location' ? !!tenantId : type === 'floor' ? !!locationId : !!roomId
  const changed =
    type === 'location'
      ? tenantId !== resource.tenantId
      : type === 'floor'
        ? locationId !== resource.locationId
        : roomId !== resource.roomId

  const debouncedReference = useDebounce(reference, 400)
  const debouncedLevel = useDebounce(level, 400)
  const overrides = {
    ...(debouncedReference ? { reference: debouncedReference.toUpperCase() } : {}),
    ...(type === 'floor' && debouncedLevel !== '' ? { level: Number(debouncedLevel) } : {})
  }

  const previewQuery = useQuery({
    queryKey: ['move-preview', type, resource._id, target, overrides],
    queryFn: () =>
      api
        .post(
          `/tenant/${resource.tenantId}/${type}/${resource._id}/move/preview`,
          { ...target, ...overrides },
          {
            silentErrors: true
          }
        )
        .then((res) => res.data?.data as MoveSummary),
    enabled: open && targetReady && changed,
    retry: false
  })

  // A 409 names the clashing fields and a free value for each. Reveal an input per field and offer the
  // suggestion as its placeholder — prefilling would read as a decision already made, and the user is
  // the one who names their resources.
  const previewError = previewQuery.error
  const conflicts = axios.isAxiosError(previewError)
    ? (previewError.response?.data?.conflicts as MoveConflict[] | undefined)
    : undefined
  const suggestedReference = conflicts?.find((conflict) => conflict.field === 'reference')?.suggestion
  const suggestedLevel = conflicts?.find((conflict) => conflict.field === 'level')?.suggestion
  const referenceTaken = suggestedReference !== undefined
  const levelTaken = suggestedLevel !== undefined

  useEffect(() => {
    if (referenceTaken) setRevealed((prev) => ({ ...prev, reference: true }))
    if (levelTaken) setRevealed((prev) => ({ ...prev, level: true }))
  }, [referenceTaken, levelTaken])

  // What the failed request actually carried — an override once the user typed one, the resource's own value until then.
  const conflictMessage =
    referenceTaken && levelTaken
      ? m.move_conflict_both({
          level: overrides.level ?? resource.level ?? 0,
          reference: overrides.reference ?? resource.reference
        })
      : levelTaken
        ? m.move_conflict_level({ level: overrides.level ?? resource.level ?? 0 })
        : referenceTaken
          ? REFERENCE_CONFLICT_MESSAGES[isRack ? 'rack' : type]({
              reference: overrides.reference ?? resource.reference
            })
          : ''

  // A 403 already says exactly which permission is missing — "this target cannot be used" only hides that.
  const forbiddenMessage =
    axios.isAxiosError(previewError) && previewError.response?.status === 403
      ? ((previewError.response.data?.error?.message || previewError.response.data?.message) as string | undefined)
      : undefined

  const summary = previewQuery.data
  const needsVlanChoice =
    !!summary?.tenantChanged && summary.affectedVlanIds.length + summary.affectedWlanIds.length > 0

  // The box is a warning, not a receipt: only what the user would not expect and cannot undo. `danger`
  // is reserved for what the move destroys — the rest are notes and shouldn't read as red.
  const warnings = [
    summary && summary.counts.connectionsDeleted > 0
      ? { text: m.move_summary_connections_deleted({ count: summary.counts.connectionsDeleted }), danger: true }
      : null,
    summary?.positionReset ? { text: m.move_summary_position_reset(), danger: false } : null,
    summary?.positionCleared ? { text: m.move_summary_position_cleared(), danger: false } : null,
    needsVlanChoice && summary ? { text: vlanWarning(summary), danger: false } : null
  ].filter((warning) => warning !== null)

  const handleMove = async (vlanStrategy?: 'copy' | 'clear') => {
    setIsMoving(true)
    try {
      const res = await api.post(`/tenant/${resource.tenantId}/${type}/${resource._id}/move`, {
        ...target,
        ...overrides,
        ...(vlanStrategy ? { vlanStrategy } : {})
      })
      const result = res.data?.data as MoveSummary
      toast.success(m.move_success({ resource: resourceLabel }))
      onOpenChange(false)

      // A moved location is gone from the page we're on; a moved device takes its own page's URL with it.
      if (type === 'location') {
        await navigate({ to: '/app/t/$tenantId/locations', params: { tenantId: result.to.tenantId } })
      } else if (type === 'device' && params.deviceId === resource._id && result.to.locationId) {
        await navigate({
          to: '/app/t/$tenantId/locations/$locationId/devices/$deviceId',
          params: { tenantId: result.to.tenantId, locationId: result.to.locationId, deviceId: resource._id }
        })
      }
      // A move rewrites ids and references across the hierarchy — cheaper to refetch everything than to enumerate.
      await queryClient.invalidateQueries()
    } catch (_error) {
      // The API interceptor already toasted the reason
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isMoving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-106.25" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{m.move_resource({ resource: resourceLabel })}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {showTenantSelect && (
            <TargetRow
              label={m.tenant()}
              options={toOptions(tenants)}
              value={tenantId}
              onChange={(value) => {
                setTenantId(value)
                setLocationId('')
                setFloorId('')
                setRoomId('')
              }}
            />
          )}

          {type !== 'location' && (
            <TargetRow
              label={m.location()}
              options={toOptions(locationsQuery.data)}
              value={locationId}
              onChange={(value) => {
                setLocationId(value)
                setFloorId('')
                setRoomId('')
              }}
            />
          )}

          {type === 'device' && (
            <>
              <TargetRow
                label={m.floor()}
                options={toOptions(floorsQuery.data)}
                value={floorId}
                onChange={(value) => {
                  setFloorId(value)
                  setRoomId('')
                }}
                disabled={!locationId}
              />
              <TargetRow
                label={m.room()}
                options={toOptions(roomsQuery.data)}
                value={roomId}
                onChange={setRoomId}
                disabled={!floorId}
              />
            </>
          )}

          {conflictMessage && <p className="text-sm text-amber-700 dark:text-amber-500">{conflictMessage}</p>}

          {revealed.reference && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="move-reference">{m.id()}</Label>
              <div className="col-span-3">
                <Input
                  id="move-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder={suggestedReference === undefined ? undefined : String(suggestedReference)}
                  className="max-w-24 uppercase h-8"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                />
              </div>
            </div>
          )}

          {revealed.level && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="move-level">{m.level()}</Label>
              <div className="col-span-3">
                <Input
                  id="move-level"
                  type="number"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  placeholder={suggestedLevel === undefined ? undefined : String(suggestedLevel)}
                  className="max-w-24 h-8"
                />
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              {warnings.map((warning) => (
                <li
                  key={warning.text}
                  className={warning.danger ? 'text-destructive-foreground' : 'text-amber-700 dark:text-amber-500'}>
                  {warning.text}
                </li>
              ))}
            </ul>
          )}

          {!conflictMessage && previewError && (
            <p className="text-xs text-destructive-foreground">{forbiddenMessage || m.move_summary_unavailable()}</p>
          )}
        </div>

        <DialogFooter className={needsVlanChoice ? 'sm:flex-col-reverse' : undefined}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            {m.cancel()}
          </Button>
          {needsVlanChoice ? (
            <>
              {/* Copy is the primary action: it is the least destructive of the two. */}
              <Button type="button" variant="outline" disabled={isMoving} onClick={() => handleMove('clear')}>
                {m.move_and_clear_vlans()}
              </Button>
              <Button type="button" disabled={isMoving} onClick={() => handleMove('copy')}>
                {isMoving ? (
                  <>
                    <TbLoader2 className="animate-spin" /> {m.moving()}&hellip;
                  </>
                ) : (
                  m.move_and_copy_vlans()
                )}
              </Button>
            </>
          ) : (
            <Button type="button" disabled={!summary || isMoving} onClick={() => handleMove()}>
              {isMoving ? (
                <>
                  <TbLoader2 className="animate-spin" /> {m.moving()}&hellip;
                </>
              ) : (
                m.move()
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MoveResourceDialog
