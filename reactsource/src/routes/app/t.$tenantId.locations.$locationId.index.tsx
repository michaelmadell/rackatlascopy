import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Popover, PopoverContent, PopoverTrigger } from '@patchdocs/ui'
import { TbInfoCircle, TbEdit, TbKeyboard, TbEye, TbEyeOff } from 'react-icons/tb'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import ButtonWithTooltip from '@/components/common/ButtonWithTooltip'
import HelpButton from '@/components/common/HelpButton'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useRackLicenseGate } from '@/hooks/useRackLicenseGate'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAppStore } from '@/lib/app-store'
import { getCountryName } from '@/lib/utils'
import Loader from '@/components/common/Loader'
import ErrorPage from '@/components/common/ErrorPage'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import FloorSelector from '@/components/editors/floor-editor/components/FloorSelector'
import InfoSidebar from '@/components/editors/floor-editor/components/InfoSidebar'
import FloorEditor from '@/components/editors/floor-editor/Editor'
import AddConnectionDialog from '@/components/editors/floor-editor/components/dialogs/AddConnectionDialog'
import EditLocationDialog from '@/components/location/EditLocationDialog'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import {
  showCassetteChangesToast,
  hasCassetteChanges,
  cassetteChangeReferences,
  type CassetteChangesReport
} from '@/components/editors/common/CassetteColorConflictDialog'
import SelectRoomDialog from '@/components/editors/floor-editor/components/dialogs/SelectRoomDialog'
import { isSamePortHopDevice } from '@/components/editors/rack-editor/utils/device-helper'
import { KeyboardCommand } from '@/components/common/KeyboardCommand'
import {
  findRoomsContainingPoint,
  isPointInPolygon,
  transformCoordinatesForScale
} from '@/components/editors/floor-editor/utilities'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import type { Floor, Location, Room, Device, DeviceConnection, PermissionsCheckResult } from '@/types'
import type { InfoSidebarProps } from '@/components/editors/floor-editor/components/InfoSidebar'

const ManageBuildingConnections = lazy(() => import('@/components/editors/common/ManageBuildingConnections'))

type DeviceMove = { _id: string; roomId: string; floorPlanPosition: { x: number; y: number } }

type RoomChoice = { move: DeviceMove; deviceLabel: string; roomLabel: string; roomIds: string[] }

type LocationSearch = {
  floorId?: string
  roomId?: string
  deviceId?: string
}

export const Route = createFileRoute('/app/t/$tenantId/locations/$locationId/')({
  component: LocationPage,
  validateSearch: (search: Record<string, unknown>): LocationSearch => {
    return {
      floorId: (search.floorId as string) || '',
      roomId: (search.roomId as string) || undefined,
      deviceId: (search.deviceId as string) || undefined
    }
  }
})

function LocationPage() {
  const { setConfig } = useHeaderConfig()
  const navigate = useNavigate({ from: Route.fullPath })
  const posthog = usePostHog()
  const { floorId, roomId: urlRoomId, deviceId: urlDeviceId } = Route.useSearch()
  const { tenantId, locationId } = Route.useParams()
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const billingStatus = useAppStore((state) => state.billingStatus)
  const customer = useAppStore((state) => state.customer)
  const needToRefetchFloorData = useAppStore((state) => state.needToRefetchFloorData)
  const setNeedToRefetchFloorData = useAppStore((state) => state.setNeedToRefetchFloorData)
  const setNeedToRefetchRackData = useAppStore((state) => state.setNeedToRefetchRackData)
  const isSmallMobile = useMediaQuery('(max-width: 639px)')
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  const [isSaving, setIsSaving] = useState(false)
  const [deletedConnectionIds, setDeletedConnectionIds] = useState<Set<string>>(new Set())
  // Cassette colours a save wrote that were never announced beforehand (§4.3).

  // Panels state
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const showInfoSidebar = useAppStore((state) => state.showInfoSidebar)
  const setShowInfoSidebar = useAppStore((state) => state.setShowInfoSidebar)
  const infoSidebarOpen = isDesktop ? desktopSidebarOpen : showInfoSidebar
  const setInfoSidebarOpen = isDesktop ? setDesktopSidebarOpen : setShowInfoSidebar
  const [infoSidebarView, setInfoSidebarView] = useState<InfoSidebarProps['view']>('floor')
  const [editLocationDialogOpen, setEditLocationDialogOpen] = useState(false)
  const [desktopDevicesSidebarOpen, setDesktopDevicesSidebarOpen] = useState(true)
  const [mobileDevicesSidebarOpen, setMobileDevicesSidebarOpen] = useState(false)
  const devicesSidebarOpen = isDesktop ? desktopDevicesSidebarOpen : mobileDevicesSidebarOpen
  const setDevicesSidebarOpen = isDesktop ? setDesktopDevicesSidebarOpen : setMobileDevicesSidebarOpen
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false)

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [previewSettings, setPreviewSettings] = useState<{ opacity: number; contrast: number } | null>(null)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [showAddConnectionDialog, setShowAddConnectionDialog] = useState(false)
  const [connectionDialogDevice, setConnectionDialogDevice] = useState<Device | null>(null)
  const [connectionDialogPortName, setConnectionDialogPortName] = useState<string | undefined>(undefined)
  const { checkRackLicense, licenseGateDialog } = useRackLicenseGate()
  const [buildingConnectionsDevice, setBuildingConnectionsDevice] = useState<Device | null>(null)
  const [roomDeviceMoves, setRoomDeviceMoves] = useState<{ roomLabel: string; devices: DeviceMove[] } | null>(null)
  const [roomChoices, setRoomChoices] = useState<{
    choices: RoomChoice[]
    pendingMoves: DeviceMove[]
    revertShape?: () => Promise<void>
  } | null>(null)
  const [isMovingDevices, setIsMovingDevices] = useState(false)

  // Track local changes
  const [devicePositions, setDevicePositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [deviceRooms, setDeviceRooms] = useState<Map<string, string>>(new Map()) // Track device room assignments
  const [roomShapes, setRoomShapes] = useState<Map<string, { x: number; y: number }[]>>(new Map())
  const [isEditingInProgress, setIsEditingInProgress] = useState(false)

  // Refs for accessing latest values in callbacks
  const devicePositionsRef = useRef(devicePositions)
  const deviceRoomsRef = useRef(deviceRooms)
  const roomShapesRef = useRef(roomShapes)
  const isEditingInProgressRef = useRef(isEditingInProgress)
  const connectionCreatedRef = useRef(false)

  // Device naming config from customer
  const deviceNaming = useMemo(
    () => ({
      standardDeviceTypePrefixes: customer?.standardDeviceTypePrefixes,
      customDeviceTypes: customer?.customDeviceTypes
    }),
    [customer?.standardDeviceTypePrefixes, customer?.customDeviceTypes]
  )

  // Get location
  const locationQuery = useQuery({
    queryKey: ['location', tenantId, locationId],
    enabled: billingStatus !== 'blocked',
    queryFn: () => api.get(`/tenant/${tenantId}/location/${locationId}`).then((res) => res.data)
  })

  // Get floors (list)
  const floorsQuery = useQuery({
    queryKey: ['floors', tenantId, locationId],
    enabled: billingStatus !== 'blocked',
    queryFn: () =>
      api
        .get(`/tenant/${tenantId}/floor?locationId=${locationId}&sort=level&limit=250&select=_id,reference,level`)
        .then((res) => res.data?.data?.docs as Pick<Floor, '_id' | 'reference' | 'level'>[] | undefined)
  })

  // Get selected floor
  const floorQuery = useQuery({
    queryKey: ['floor', tenantId, locationId, floorId],
    enabled: billingStatus !== 'blocked' && !!floorId,
    queryFn: () => api.get(`/tenant/${tenantId}/floor/${floorId}`).then((res) => res.data)
  })

  // Get floor plan signed URL if floor has a floor plan
  const floorPlanUrlQuery = useQuery({
    queryKey: ['floorPlanUrl', tenantId, floorId],
    enabled: billingStatus !== 'blocked' && !!floorId && floorQuery.isSuccess && !!floorQuery.data?.data?.floorPlan,
    queryFn: () => api.get(`/tenant/${tenantId}/floor/${floorId}/floor-plan`).then((res) => res.data?.data),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })

  // Get rooms of selected floor
  const roomsBulkQuery = useQuery({
    queryKey: ['rooms-bulk', tenantId, locationId, floorId],
    enabled: billingStatus !== 'blocked' && !!floorId,
    queryFn: () =>
      api.post(`/tenant/${tenantId}/room/bulk`, { floorId, attachRoomPermissions: true }).then((res) => ({
        rooms: (res.data?.data || []) as Room[],
        permissions: (res.data?.permissions || {}) as Record<string, PermissionsCheckResult>
      }))
  })

  const rooms = useMemo(() => roomsBulkQuery.data?.rooms || [], [roomsBulkQuery.data?.rooms])
  const roomPermissions = useMemo(() => roomsBulkQuery.data?.permissions || {}, [roomsBulkQuery.data?.permissions])

  // Get devices of selected floor
  const devicesAndConnectionsQuery = useQuery({
    queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId],
    enabled: billingStatus !== 'blocked' && !!floorId,
    queryFn: async () => {
      const devicesResponse = await api.post(`/tenant/${tenantId}/device/bulk`, {
        floorId: floorId,
        attachDevicePermissions: true
      })

      const devices = devicesResponse.data?.data || []
      const devicePermissions = devicesResponse.data?.permissions || {}

      const connectionIds = new Set<string>()
      for (const subDevice of devices) {
        for (const port of subDevice.elements || []) {
          if (port.deviceConnectionIds) {
            for (const connId of port.deviceConnectionIds) {
              if (!deletedConnectionIds.has(connId)) {
                connectionIds.add(connId)
              }
            }
          }
        }
      }

      const uniqueConnectionIds = Array.from(connectionIds)

      const rackIds = devices.filter((d: Device) => d.deviceType === 'rack').map((d: Device) => d._id)

      const [connectionsResult, buildingPairsResult] = await Promise.all([
        uniqueConnectionIds.length > 0
          ? api
              .post(`/tenant/${tenantId}/device-connection/bulk`, {
                ids: uniqueConnectionIds.filter((connId: string) => !deletedConnectionIds.has(connId))
              })
              .then((res) =>
                (res.data?.data || []).filter((conn: DeviceConnection) =>
                  ['front-external', 'back-external', 'external-external'].includes(conn.direction)
                )
              )
          : Promise.resolve([]),
        rackIds.length >= 2
          ? api
              .post(`/tenant/${tenantId}/device-connection/building-pairs`, { rackIds })
              .then((res) => res.data?.data || [])
          : Promise.resolve([])
      ])

      return { devices, devicePermissions, connections: connectionsResult, buildingPairs: buildingPairsResult }
    }
  })

  const floorDevices = useMemo(
    () => devicesAndConnectionsQuery.data?.devices || [],
    [devicesAndConnectionsQuery.data?.devices]
  )
  const floorDevicePermissions = useMemo(
    () => devicesAndConnectionsQuery.data?.devicePermissions || {},
    [devicesAndConnectionsQuery.data?.devicePermissions]
  )
  const floorDeviceConnections = useMemo(
    () =>
      (devicesAndConnectionsQuery.data?.connections || []).filter(
        (conn: DeviceConnection) => !deletedConnectionIds.has(conn._id)
      ),
    [devicesAndConnectionsQuery.data?.connections, deletedConnectionIds]
  )
  const buildingConnectionRackPairs = useMemo(
    () => devicesAndConnectionsQuery.data?.buildingPairs || [],
    [devicesAndConnectionsQuery.data?.buildingPairs]
  )

  // Reset deleted connections tracking when location/floor changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: this is by design
  useEffect(() => {
    setDeletedConnectionIds(new Set())
  }, [locationId, floorId])

  // Refetch devices and connections if flagged (e.g., after changes in rack editor)
  useEffect(() => {
    if (needToRefetchFloorData && floorId) {
      queryClient.invalidateQueries({
        queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
      })
      setNeedToRefetchFloorData(false)
    }
  }, [needToRefetchFloorData, floorId, tenantId, locationId, queryClient, setNeedToRefetchFloorData])

  // Handle toggling all panels
  const anyPanelOpen = infoSidebarOpen || devicesSidebarOpen || bottomDrawerOpen
  const handleToggleAllPanels = useCallback(
    (source: 'keyboard' | 'button') => {
      // If any panel is open, close all. If all are closed, open all.
      const newState = !anyPanelOpen
      setInfoSidebarOpen(newState)
      setDevicesSidebarOpen(newState)
      setBottomDrawerOpen(newState)
      posthog?.capture('floor_editor:toggle_all_panels', { source })
    },
    [anyPanelOpen, setInfoSidebarOpen, setDevicesSidebarOpen, posthog]
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey
      if (isCmd && e.key === 'h') {
        // Don't handle if an input/textarea/contenteditable element is focused
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          (document.activeElement as HTMLElement)?.isContentEditable
        ) {
          return
        }
        e.preventDefault()
        handleToggleAllPanels('keyboard')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleToggleAllPanels])

  // Set header config (title, breadcrumbs, buttons)
  useEffect(() => {
    if (!locationQuery.data) return
    const locationName = locationQuery.data?.data?.name
    const locationRef = locationQuery.data?.data?.reference
    const buttons: React.ReactNode[] = []
    if (billingStatus === 'blocked') {
      setConfig({
        title: locationName || locationRef || m.unknown(),
        documentTitle: locationRef || m.unknown(),
        breadcrumbs: [
          { label: m.locations(), href: `/app/t/${tenantId}/locations` },
          { label: locationRef, href: `/app/t/${tenantId}/locations/${locationId}` },
          { label: floorQuery.data?.data?.reference || '' }
        ],
        buttons: undefined
      })
      return () => setConfig(null)
    }
    buttons.push(
      <Popover key="info">
        <PopoverTrigger asChild>
          <ButtonWithTooltip variant="outline" size="sm-icon" tooltip={m.location_info()} tooltipSide="bottom">
            <TbInfoCircle />
          </ButtonWithTooltip>
        </PopoverTrigger>
        <PopoverContent className="text-[13px] w-60">
          <LocationInfo location={locationQuery.data?.data} />
        </PopoverContent>
      </Popover>
    )
    buttons.push(
      <ButtonWithTooltip
        key="settings"
        variant="outline"
        size="sm-icon"
        tooltip={m.edit_resource({ resource: m.location() })}
        tooltipSide="bottom"
        disabled={!locationQuery.data?.permissions?.canWrite || billingStatus === 'read_only'}
        onClick={() => setEditLocationDialogOpen(true)}>
        <TbEdit />
      </ButtonWithTooltip>
    )
    buttons.push(
      <ButtonWithTooltip
        key="hide"
        variant="outline"
        size="sm-icon"
        tooltip={anyPanelOpen ? m.hide_panels() : m.show_panels()}
        tooltipSide="bottom"
        onClick={() => handleToggleAllPanels('button')}>
        {anyPanelOpen ? <TbEyeOff /> : <TbEye />}
      </ButtonWithTooltip>
    )
    buttons.push(
      <Popover
        key="keyboard-commands"
        onOpenChange={(open) => open && posthog?.capture('floor_editor:keyboard_commands_popover_open')}>
        <PopoverTrigger asChild>
          <ButtonWithTooltip
            variant="outline"
            size="sm-icon"
            className="max-md:hidden"
            tooltip={m.keyboard_shortcuts()}
            tooltipSide="bottom">
            <TbKeyboard />
          </ButtonWithTooltip>
        </PopoverTrigger>
        <PopoverContent className="text-xs w-60">
          <KeyboardCommands />
        </PopoverContent>
      </Popover>
    )
    buttons.push(<HelpButton key="help" docSlug="features/location-view" variant="outline" size="sm-icon" />)
    setConfig({
      title: locationName || locationRef || m.unknown(),
      documentTitle: locationRef || m.unknown(),
      breadcrumbs: [
        { label: m.locations(), href: `/app/t/${tenantId}/locations` },
        { label: locationRef, href: `/app/t/${tenantId}/locations/${locationId}` },
        { label: floorQuery.data?.data?.reference || '' }
      ],
      buttons
    })
    return () => setConfig(null)
  }, [
    setConfig,
    billingStatus,
    tenantId,
    locationId,
    locationQuery.data,
    floorQuery.data,
    handleToggleAllPanels,
    anyPanelOpen,
    posthog
  ])

  // Keep `floorId` on a floor this location still has
  useEffect(() => {
    const floors = floorsQuery.data
    if (!floors) return
    if (floorId && floors.some((floor) => floor._id === floorId)) return
    const defaultFloor = floors.find((floor) => floor.level === 0) || floors[0]
    navigate({ search: (prev) => ({ ...prev, floorId: defaultFloor?._id }), replace: true })
  }, [floorsQuery.data, floorId, navigate])

  // Set initial selection from URL params (deviceId takes precedence over roomId)
  const initialSelectionApplied = useRef(false)
  useEffect(() => {
    if (initialSelectionApplied.current) return
    if (!floorId) return

    // Wait for data to load
    const devicesLoaded = devicesAndConnectionsQuery.isSuccess
    const roomsLoaded = roomsBulkQuery.isSuccess
    if (!devicesLoaded || !roomsLoaded) return

    // deviceId takes precedence
    if (urlDeviceId) {
      const deviceExists = floorDevices.some((d: Device) => d._id === urlDeviceId)
      if (deviceExists) {
        setSelectedDevice(urlDeviceId)
        setSelectedRoom(null)
        setInfoSidebarView('device')
        initialSelectionApplied.current = true
        return
      }
    }

    if (urlRoomId) {
      const roomExists = rooms.some((r) => r._id === urlRoomId)
      if (roomExists) {
        setSelectedRoom(urlRoomId)
        setSelectedDevice(null)
        setInfoSidebarView('room')
        initialSelectionApplied.current = true
        return
      }
    }

    initialSelectionApplied.current = true
  }, [
    floorId,
    urlDeviceId,
    urlRoomId,
    devicesAndConnectionsQuery.isSuccess,
    floorDevices,
    roomsBulkQuery.isSuccess,
    rooms
  ])

  // Initialize device positions and room assignments from API data
  // biome-ignore lint/correctness/useExhaustiveDependencies: this is by design
  useEffect(() => {
    const positions = new Map<string, { x: number; y: number }>()
    const rooms = new Map<string, string>()
    for (const device of floorDevices) {
      if (device.floorPlanPosition) {
        positions.set(device._id, { ...device.floorPlanPosition })
      }
      if (device.roomId) {
        rooms.set(device._id, device.roomId)
      }
    }
    setDevicePositions(positions)
    setDeviceRooms(rooms)
  }, [floorDevices, devicesAndConnectionsQuery.dataUpdatedAt])

  // Initialize room shapes from API data
  // biome-ignore lint/correctness/useExhaustiveDependencies: this is by design
  useEffect(() => {
    const shapes = new Map<string, { x: number; y: number }[]>()
    for (const room of rooms) {
      if (room.floorPlanShapePoints) {
        shapes.set(
          room._id,
          room.floorPlanShapePoints.map((p) => ({ ...p }))
        )
      }
    }
    setRoomShapes(shapes)
  }, [rooms, roomsBulkQuery.dataUpdatedAt])

  // Update refs when state changes
  useEffect(() => {
    devicePositionsRef.current = devicePositions
  }, [devicePositions])

  useEffect(() => {
    deviceRoomsRef.current = deviceRooms
  }, [deviceRooms])

  useEffect(() => {
    roomShapesRef.current = roomShapes
  }, [roomShapes])

  useEffect(() => {
    isEditingInProgressRef.current = isEditingInProgress
  }, [isEditingInProgress])

  // Close mobile devices sidebar when transitioning from mobile to desktop
  useEffect(() => {
    if (isDesktop && mobileDevicesSidebarOpen) {
      setMobileDevicesSidebarOpen(false)
    }
  }, [isDesktop, mobileDevicesSidebarOpen])

  // Track info sidebar view changes
  useEffect(() => {
    posthog?.capture('floor_editor:info_sidebar_view_change', { view: infoSidebarView })
  }, [infoSidebarView, posthog])

  // Handle room selection
  const handleRoomSelect = (roomId: string | null) => {
    setSelectedRoom(roomId)
    setSelectedDevice(null) // Clear device selection when selecting a room
    if (roomId) {
      setInfoSidebarView('room')
      // setInfoSidebarOpen(true)
    } else {
      setInfoSidebarView('floor')
    }
    // Sync selection with URL
    navigate({ search: (prev) => ({ ...prev, roomId: roomId || undefined, deviceId: undefined }), replace: true })
  }

  // Handle device position update
  const handleUpdateDevicePosition = async (
    deviceId: string,
    position: { x: number; y: number },
    roomId?: string
  ): Promise<boolean> => {
    if (!tenantId) return false

    // roomId must always be specified - use the provided one or find the default room
    let finalRoomId = roomId
    if (!finalRoomId) {
      const defaultRoom = rooms.find((r) => r.isDefault) || rooms[0]
      finalRoomId = defaultRoom?._id
    }
    if (!finalRoomId) {
      toast.error(`${m.room()} ${m.not_found().toLowerCase()}`)
      return false
    }

    // Capture previous state so we can roll back if the save fails
    const prevPosition = devicePositionsRef.current.get(deviceId)
    const prevRoomId = deviceRoomsRef.current.get(deviceId)

    // Optimistically move the device so the pin holds its new position during the save
    setDevicePositions((prev) => new Map(prev).set(deviceId, position))
    setDeviceRooms((prev) => new Map(prev).set(deviceId, finalRoomId))

    try {
      const updateData: Partial<Device> = {
        locationId,
        floorId,
        roomId: finalRoomId,
        floorPlanPosition: position
      }
      await api.patch(`/tenant/${tenantId}/device/${deviceId}`, updateData)
      await queryClient.invalidateQueries({
        queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
      })
      toast.success(`${m.device()} ${m.updated().toLowerCase()}`)
      return true
    } catch (_error) {
      // Roll back the optimistic move to the last-saved position
      setDevicePositions((prev) => {
        const updated = new Map(prev)
        if (prevPosition) updated.set(deviceId, prevPosition)
        else updated.delete(deviceId)
        return updated
      })
      setDeviceRooms((prev) => {
        const updated = new Map(prev)
        if (prevRoomId) updated.set(deviceId, prevRoomId)
        else updated.delete(deviceId)
        return updated
      })
      return false
    }
  }

  // Handle device selection
  const handleDeviceSelect = (deviceId: string | null) => {
    setSelectedDevice(deviceId)
    setSelectedRoom(null)
    if (deviceId) {
      setInfoSidebarView('device')
      // setInfoSidebarOpen(true)
    } else {
      setInfoSidebarView('floor')
    }
    // Sync selection with URL
    navigate({ search: (prev) => ({ ...prev, deviceId: deviceId || undefined, roomId: undefined }), replace: true })
  }

  // Handle starting measurement
  const handleStartMeasuring = () => {
    setIsMeasuring(true)
    setInfoSidebarView('floor')
    if (isSmallMobile) {
      setInfoSidebarOpen(false)
    }
    // setInfoSidebarOpen(true)
  }

  /**
   * Narrow invalidate for an ordinary edit; EVERYTHING when it cascaded — a rename, or a room delete that displaces
   * devices. Both rewrite `fullReference` across the subtree server-side (`lib/move.ts`), staling devices and
   * connections beyond this page: the rack editor's `['rack', …]` / `['sub-devices-and-connections', …]` hold rack
   * children carrying those paths. No shared key prefix to target them, and `staleTime` is 2min — so refetch
   * everything, same as `MoveResourceDialog`. Don't narrow it back.
   */
  const invalidateAfterEdit = async (cascaded: boolean, ...narrow: { queryKey: unknown[] }[]) => {
    if (cascaded) return queryClient.invalidateQueries()
    await Promise.all(narrow.map((filter) => queryClient.invalidateQueries(filter)))
  }

  /** Compared case-insensitively: the API uppercases `reference`, so a case-only edit cascades nothing. */
  const referenceChanged = (next: string | undefined, current: string | undefined) =>
    !!next && next.toUpperCase() !== current?.toUpperCase()

  // Handle location update from the edit dialog
  const handleUpdateLocation = async (id: string, data: Partial<Location>): Promise<boolean> => {
    if (!tenantId) return false
    try {
      await api.patch(`/tenant/${tenantId}/location/${id}`, data)
      toast.success(`${m.location()} ${m.updated().toLowerCase()}`)
      await invalidateAfterEdit(referenceChanged(data.reference, locationQuery.data?.data?.reference), {
        queryKey: ['location', tenantId, id]
      })
      return true
    } catch (_error) {
      // handled by interceptor
      return false
    }
  }

  // Handle floor creation
  const handleCreateFloor = async (data: { reference: string; name?: string; level: number }): Promise<boolean> => {
    if (!locationId || !tenantId) return false
    try {
      const response = await api.post(`/tenant/${tenantId}/floor`, {
        tenantId: tenantId,
        locationId,
        name: data.name,
        reference: data.reference,
        level: data.level,
        ...(locationQuery.data?.data?.responsibleUserId
          ? { responsibleUserId: locationQuery.data.data.responsibleUserId }
          : {})
      })
      toast.success(`${m.floor()} ${m.created().toLowerCase()}`)
      if (response.data?.data?._id) {
        await queryClient.invalidateQueries({ queryKey: ['floors', tenantId, locationId] })
        navigate({ search: (prev) => ({ ...prev, floorId: response.data.data._id }) })
      }
      return true
    } catch (_error) {
      // console.error('Failed to create floor:', error)
      return false
    }
  }

  // Handle floor update from InfoSidebar
  const handleUpdateFloor = async (data: FormData): Promise<boolean> => {
    if (!floorId || !tenantId) return false
    setIsSaving(true)
    try {
      await api.patch(`/tenant/${tenantId}/floor/${floorId}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      // toast.success(`${m.floor()} ${m.updated().toLowerCase()}`)
      const hasFloorPlanFile = data.has('floorPlanFile')
      await invalidateAfterEdit(
        referenceChanged(data.get('reference')?.toString(), floorQuery.data?.data?.reference),
        { queryKey: ['floors', tenantId, locationId] },
        { queryKey: ['floor', tenantId, locationId, floorId] },
        ...(hasFloorPlanFile ? [{ queryKey: ['floorPlanUrl', tenantId, floorId] }] : [])
      )
      setPreviewSettings(null)
      return true
    } catch (_error) {
      // console.error('Failed to update floor:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Handle floor plan scale update
  const handleFloorPlanScaleUpdate = async (scale: number): Promise<boolean> => {
    if (!floorId || !tenantId) return false
    try {
      const existingSettings = floorQuery.data?.data?.floorPlanSettings || {}
      const oldScale = existingSettings.scale

      // Transform room coordinates
      const roomUpdatePromises = rooms
        .map((room) => {
          if (!room.floorPlanShapePoints?.length) return null
          const newPoints = transformCoordinatesForScale(room.floorPlanShapePoints, oldScale, scale)
          return api.patch(`/tenant/${tenantId}/room/${room._id}`, {
            floorId,
            floorPlanShapePoints: newPoints
          })
        })
        .filter(Boolean)

      // Transform device coordinates
      const deviceUpdatePromises = floorDevices
        .map((device: Device) => {
          if (!device.floorPlanPosition) return null
          const [newPosition] = transformCoordinatesForScale([device.floorPlanPosition], oldScale, scale)
          return api.patch(`/tenant/${tenantId}/device/${device._id}`, {
            locationId,
            floorId,
            roomId: device.roomId,
            floorPlanPosition: newPosition
          })
        })
        .filter(Boolean)

      // Update floor scale + all coordinates in parallel
      await Promise.all([
        api.patch(`/tenant/${tenantId}/floor/${floorId}`, {
          floorPlanSettings: { ...existingSettings, scale }
        }),
        ...roomUpdatePromises,
        ...deviceUpdatePromises
      ])

      toast.success(`${m.floor_plan_scale()} ${m.updated().toLowerCase()}`)

      // Clear local state first so useEffects will re-populate from fresh data
      setRoomShapes(new Map())
      setDevicePositions(new Map())

      // Refetch queries to get updated data from server
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['floor', tenantId, locationId, floorId] }),
        queryClient.refetchQueries({ queryKey: ['rooms-bulk', tenantId, locationId, floorId] }),
        queryClient.refetchQueries({ queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId] })
      ])

      return true
    } catch (_error) {
      // console.error('Failed to save floor plan scale:', error)
      return false
    }
  }

  // Handle floor deletion
  const handleDeleteFloor = async (): Promise<boolean> => {
    if (!tenantId || !floorId) return false
    try {
      await api.delete(`/tenant/${tenantId}/floor/${floorId}`)
      toast.success(`${m.floor()} ${m.deleted().toLowerCase()}`)
      await queryClient.invalidateQueries({ queryKey: ['floors', tenantId, locationId] })
      return true
    } catch (_error) {
      // console.error('Failed to delete floor:', error)
      return false
    }
  }

  // The pin on the plan is labelled with the reference, so the prompt names the device the same way.
  const deviceLabelOf = (device: Device) => device.reference || device.name || ''

  /** Every other room whose shape contains `position` once `excludeRoomId` is out of the picture, most specific first. */
  const findRoomsForPosition = (position: { x: number; y: number }, excludeRoomId: string) =>
    findRoomsContainingPoint(
      position,
      rooms
        .filter((room) => room._id !== excludeRoomId)
        .map((room) => ({ id: room._id, points: roomShapes.get(room._id) || room.floorPlanShapePoints || [] }))
    )

  /**
   * A shape that now covers devices of another room should probably own them — that stays a question, shapes overlap
   * and a pin can legitimately sit in both. Devices the shape no longer covers are not a question: they cannot keep
   * belonging to a room they no longer stand in, so they move to the room they are in now (the default room when
   * that is none). Only an ambiguous landing — several rooms overlap where the pin stands — is worth asking about.
   * Unplaced devices are untouched, and so is every device the edit didn't actually move in or out of the shape:
   * an edit on the far side of the room must not re-ask about a pin that was already sitting inside it.
   */
  const reconcileRoomDevices = async (
    roomId: string,
    roomLabel: string,
    points: { x: number; y: number }[],
    previousPoints?: { x: number; y: number }[],
    revertShape?: () => Promise<void>
  ) => {
    const defaultRoomId = (rooms.find((room) => room.isDefault) || rooms[0])?._id
    const movesIn: DeviceMove[] = []
    const autoMoves: DeviceMove[] = []
    const choices: RoomChoice[] = []

    for (const device of floorDevices as Device[]) {
      const floorPlanPosition = devicePositions.get(device._id) || device.floorPlanPosition
      if (!floorPlanPosition) continue
      const isInside = isPointInPolygon(floorPlanPosition, points)
      // A new room has no previous shape, so every device it covers counts as newly covered.
      if (previousPoints && isInside === isPointInPolygon(floorPlanPosition, previousPoints)) continue
      if (isInside && device.roomId !== roomId) {
        movesIn.push({ _id: device._id, roomId, floorPlanPosition })
      } else if (!isInside && device.roomId === roomId) {
        const candidates = findRoomsForPosition(floorPlanPosition, roomId)
        // The default room falling back to itself (its own shape shrank away from the pin) is a no-op, not a move.
        const targetRoomId = candidates[0] || defaultRoomId
        if (!targetRoomId || targetRoomId === roomId) continue
        const move = { _id: device._id, roomId: targetRoomId, floorPlanPosition }
        if (candidates.length > 1) {
          choices.push({ move, deviceLabel: deviceLabelOf(device), roomLabel, roomIds: candidates })
        } else {
          autoMoves.push(move)
        }
      }
    }

    // With a choice pending, nothing is sent yet: cancelling puts the shape back and no move should have happened.
    if (choices.length > 0) setRoomChoices({ choices, pendingMoves: autoMoves, revertShape })
    else if (autoMoves.length > 0) await moveDevices(autoMoves)
    if (movesIn.length > 0) setRoomDeviceMoves({ roomLabel, devices: movesIn })
  }

  // Handle room creation
  const handleCreateRoom = async (roomData: {
    reference: string
    name?: string
    floorPlanShapePoints: { x: number; y: number }[]
    floorPlanShapeType: 'polygon' | 'rectangle'
  }): Promise<boolean> => {
    if (!floorId || !locationId || !tenantId) return false
    try {
      const response = await api.post(`/tenant/${tenantId}/room`, {
        tenantId: tenantId,
        locationId,
        floorId,
        name: roomData.name,
        reference: roomData.reference,
        floorPlanShapePoints: roomData.floorPlanShapePoints,
        floorPlanShapeType: roomData.floorPlanShapeType,
        ...(floorQuery.data?.data?.responsibleUserId
          ? { responsibleUserId: floorQuery.data.data.responsibleUserId }
          : {})
      })

      toast.success(`${m.room()} ${m.created().toLowerCase()}`)
      const createdRoom = response.data?.data as Room | undefined
      if (createdRoom) {
        await reconcileRoomDevices(
          createdRoom._id,
          createdRoom.name || createdRoom.reference,
          roomData.floorPlanShapePoints
        )
      }
      await queryClient.invalidateQueries({ queryKey: ['rooms-bulk', tenantId, locationId, floorId] })
      return true
    } catch (_error) {
      // console.error('Failed to create room:', error)
      return false
    }
  }

  const moveDevices = async (devices: DeviceMove[]) => {
    try {
      await Promise.all(
        devices.map((device) =>
          api.patch(`/tenant/${tenantId}/device/${device._id}`, {
            locationId,
            floorId,
            roomId: device.roomId,
            // A room change recentres the pin on the target room server-side (or drops it when that room has no
            // shape); these devices are already standing in the right spot, so send the position back to keep them
            // there (same as a drag between rooms).
            floorPlanPosition: device.floorPlanPosition
          })
        )
      )
      toast.success(`${m.devices()} ${m.updated().toLowerCase()}`)
      // A room change rewrites `fullReference` across each device's subtree — same cascade as `handleDeleteRoom`.
      await queryClient.invalidateQueries()
    } catch (_error) {
      // handled by interceptor
    }
  }

  // Apply the room reassignments the changed shape suggested
  const handleReassignDevices = async () => {
    if (!roomDeviceMoves) return
    setIsMovingDevices(true)
    await moveDevices(roomDeviceMoves.devices)
    setIsMovingDevices(false)
    setRoomDeviceMoves(null)
  }

  // Handle room update from InfoSidebar
  const handleUpdateRoomData = async (roomId: string, data: Partial<Room>): Promise<boolean> => {
    if (!tenantId || !roomId) return false
    setIsSaving(true)
    try {
      await api.patch(`/tenant/${tenantId}/room/${roomId}`, data)
      // toast.success(`${m.room()} ${m.updated().toLowerCase()}`)
      await invalidateAfterEdit(
        referenceChanged(data.reference, rooms.find((room) => room._id === roomId)?.reference),
        {
          queryKey: ['rooms-bulk', tenantId, locationId, floorId]
        }
      )
      return true
    } catch (_error) {
      // console.error('Failed to update room:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Handle room shape update from Editor
  const handleUpdateRoomShape = async (roomId: string, points: { x: number; y: number }[]): Promise<boolean> => {
    if (!tenantId || !roomId) return false
    const floorPlanShapePoints = points.map((p) => ({ x: p.x, y: p.y }))
    const room = rooms.find((r) => r._id === roomId)
    const previousPoints = roomShapes.get(roomId) || room?.floorPlanShapePoints || []
    try {
      await api.patch(`/tenant/${tenantId}/room/${roomId}`, { floorId, floorPlanShapePoints })
      setRoomShapes((prev) => {
        const updated = new Map(prev)
        updated.set(roomId, points)
        return updated
      })
      toast.success(`${m.room()} ${m.updated().toLowerCase()}`)
      // A device left outside by the edit must end up somewhere; refusing to pick means undoing the edit itself.
      const revertShape = async () => {
        try {
          await api.patch(`/tenant/${tenantId}/room/${roomId}`, { floorId, floorPlanShapePoints: previousPoints })
          setRoomShapes((prev) => {
            const updated = new Map(prev)
            updated.set(roomId, previousPoints)
            return updated
          })
          await queryClient.invalidateQueries({ queryKey: ['rooms-bulk', tenantId, locationId, floorId] })
        } catch (_error) {
          // handled by interceptor
        }
      }
      await reconcileRoomDevices(roomId, room?.name || room?.reference || '', points, previousPoints, revertShape)
      await queryClient.invalidateQueries({ queryKey: ['rooms-bulk', tenantId, locationId, floorId] })
      return true
    } catch (_error) {
      // console.error('Failed to update room shape - full error:', error)
      return false
    }
  }

  // Handle room deletion
  const handleDeleteRoom = async (roomId?: string): Promise<boolean> => {
    const roomToDelete = roomId || selectedRoom
    if (!tenantId || !roomToDelete) return false
    try {
      // Check if the room has devices before deletion
      const roomHasDevices = floorDevices.some((device: Device) => device.roomId === roomToDelete)
      await api.delete(`/tenant/${tenantId}/room/${roomToDelete}`)
      toast.success(`${m.room()} ${m.deleted().toLowerCase()}`)
      if (roomToDelete === selectedRoom) {
        setSelectedRoom(null)
        setInfoSidebarView('floor')
        navigate({ search: (prev) => ({ ...prev, roomId: undefined }) })
      }
      // The API displaces the devices onto the default room; those whose pin sits inside another room's shape most
      // likely belong there instead, so offer it. No prompt when the default room is where they'd land anyway.
      const defaultRoomId = (rooms.find((room) => room.isDefault) || rooms[0])?._id
      const deletedRoom = rooms.find((room) => room._id === roomToDelete)
      const deletedRoomLabel = deletedRoom?.name || deletedRoom?.reference || ''
      const autoMoves: DeviceMove[] = []
      const choices: RoomChoice[] = []
      for (const device of floorDevices as Device[]) {
        if (device.roomId !== roomToDelete) continue
        const floorPlanPosition = devicePositions.get(device._id) || device.floorPlanPosition
        if (!floorPlanPosition) continue
        const candidates = findRoomsForPosition(floorPlanPosition, roomToDelete)
        // No candidate means the default room, which is where the API already put them.
        if (candidates.length === 0 || candidates[0] === defaultRoomId) continue
        const move = { _id: device._id, roomId: candidates[0], floorPlanPosition }
        if (candidates.length > 1) {
          choices.push({ move, deviceLabel: deviceLabelOf(device), roomLabel: deletedRoomLabel, roomIds: candidates })
        } else {
          autoMoves.push(move)
        }
      }
      // No shape to put back here — the room is gone — so cancelling a choice just leaves that device where the
      // API already parked it.
      if (autoMoves.length > 0) await moveDevices(autoMoves)
      if (choices.length > 0) setRoomChoices({ choices, pendingMoves: [] })
      // Displacing the devices onto the default room rewrites `fullReference` on every device carrying this roomId —
      // rack children included — and on both endpoints of their connections. Those live in the rack editor's caches,
      // which this page cannot enumerate, so a cascade invalidates everything.
      await invalidateAfterEdit(roomHasDevices, { queryKey: ['rooms-bulk', tenantId, locationId, floorId] })
      return true
    } catch (_error) {
      // console.error('Failed to delete room:', error)
      return false
    }
  }

  // Handle device creation
  const handleCreateDevice = async (deviceData: {
    floorId: string
    roomId: string
    reference: string
    name?: string
    category: 'floor'
    deviceType: string
    customDeviceTypeId?: string
    floorPlanPosition?: { x: number; y: number }
    rackUnitsCount?: number
    elements?: Array<{ number: number; groupNumber: number; rowNumber: number; connectorType: string }>
  }): Promise<boolean> => {
    if (!locationId || !tenantId) return false
    try {
      const room = rooms.find((r) => r._id === deviceData.roomId)

      const payload = {
        tenantId: tenantId,
        locationId,
        floorId: deviceData.floorId,
        roomId: deviceData.roomId,
        name: deviceData.name,
        reference: deviceData.reference,
        category: deviceData.category,
        deviceType: deviceData.deviceType,
        ...(deviceData.customDeviceTypeId ? { customDeviceTypeId: deviceData.customDeviceTypeId } : {}),
        floorPlanPosition: deviceData.floorPlanPosition,
        ...(deviceData.rackUnitsCount !== undefined ? { rackUnitsCount: deviceData.rackUnitsCount } : {}),
        ...(deviceData.elements !== undefined ? { elements: deviceData.elements } : {}),
        ...(room?.responsibleUserId ? { responsibleUserId: room.responsibleUserId } : {})
      }
      await api.post(`/tenant/${tenantId}/device`, payload)
      toast.success(`${m.device()} ${m.created().toLowerCase()}`)
      await queryClient.invalidateQueries({
        queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
      })
      return true
    } catch (_error) {
      // console.error('Failed to create device:', error)
      return false
    }
  }

  // Handle device update from InfoSidebar
  const handleUpdateDeviceData = async (deviceId: string, data: Partial<Device>): Promise<boolean> => {
    if (!tenantId || !deviceId) return false
    setIsSaving(true)
    try {
      await api.patch(`/tenant/${tenantId}/device/${deviceId}`, data)
      // toast.success(`${m.device()} ${m.updated().toLowerCase()}`)
      await queryClient.invalidateQueries({
        queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
      })
      return true
    } catch (_error) {
      // console.error('Failed to update device:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Handle device deletion
  const handleDeleteDevice = async (): Promise<boolean> => {
    if (!tenantId || !selectedDevice) return false
    try {
      await api.delete(`/tenant/${tenantId}/device/${selectedDevice}`)
      toast.success(`${m.device()} ${m.deleted().toLowerCase()}`)
      setSelectedDevice(null)
      setInfoSidebarView('floor')
      navigate({ search: (prev) => ({ ...prev, deviceId: undefined }) })
      await queryClient.invalidateQueries({
        queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
      })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      return true
    } catch (_error) {
      // console.error('Failed to delete device:', error)
      return false
    }
  }

  // Handle device connection creation
  const handleCreateDeviceConnection = async (
    connections: Array<{
      fromDeviceId: string
      toDeviceId: string
      port1Name?: string
      port2Name?: string
      direction?: string
      cassetteColor?: string
    }>
  ): Promise<boolean> => {
    if (!tenantId || connections.length === 0) return false
    try {
      const createPromises = connections.map((connection) =>
        api.post(`/tenant/${tenantId}/device-connection/batch`, {
          create: [
            {
              locationId,
              floorId,
              roomId: selectedRoom,
              device1Id: connection.fromDeviceId,
              device2Id: connection.toDeviceId,
              port1Name: connection.port1Name ?? '01',
              port2Name: connection.port2Name ?? '01',
              direction: connection.direction ?? 'external-external',
              ...(connection.cassetteColor ? { cassetteColor: connection.cassetteColor } : {})
            }
          ],
          delete: []
        })
      )
      const responses = await Promise.all(createPromises)
      // What the server actually wrote, for the conflicts the client could not see coming.
      const report = responses.map((response) => response.data as CassetteChangesReport).find(hasCassetteChanges)
      if (report) showCassetteChangesToast(report)
      toast.success(
        `${connections.length > 1 ? m.device_connections() : m.device_connection()} ${m.created().toLowerCase()}`
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
        }),
        queryClient.invalidateQueries({ queryKey: ['connection-dialog-sub-devices'] })
      ])
      // Sequential: connection-dialog-connections depends on connection-dialog-sub-devices data
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      setNeedToRefetchRackData(true)
      return true
    } catch (_error) {
      // console.error('Failed to create device connections:', error)
      return false
    }
  }

  // Handle device connection deletion
  const handleDeleteDeviceConnection = async (
    connectionId: string,
    _device1Id?: string,
    _device2Id?: string
  ): Promise<boolean> => {
    if (!tenantId || !connectionId) return false
    try {
      setDeletedConnectionIds((prev) => new Set(prev).add(connectionId))
      await api.delete(`/tenant/${tenantId}/device-connection/${connectionId}`)
      toast.success(`${m.device_connection()} ${m.deleted().toLowerCase()}`)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
        }),
        queryClient.invalidateQueries({ queryKey: ['connection-dialog-sub-devices'] })
      ])
      // Sequential: connection-dialog-connections depends on connection-dialog-sub-devices data
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      setNeedToRefetchRackData(true)
      return true
    } catch (_error) {
      // console.error('Failed to delete device connection:', error)
      setDeletedConnectionIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(connectionId)
        return newSet
      })
      return false
    }
  }

  // Update a single device connection's metadata (e.g. color)
  const handleUpdateDeviceConnection = async (connectionId: string, data: { cableColor: string }): Promise<void> => {
    if (!tenantId || !connectionId) return
    try {
      const response = await api.patch(`/tenant/${tenantId}/device-connection/${connectionId}`, data)
      // The colour is written onto the chain's undocumented cassettes too, so the toast names them.
      const references = cassetteChangeReferences(response.data)
      toast.success(m.connection_color_updated(), {
        description: references.length ? m.cassette_color_also_set({ references: references.join(', ') }) : undefined
      })
      await queryClient.invalidateQueries({
        queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
      })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      setNeedToRefetchRackData(true)
    } catch (_error) {
      toast.error(m.update_connection_error())
    }
  }

  // Handle batch create device connections (for building connections dialog)
  const handleCreateDeviceConnections = async (
    connections: Array<{
      locationId: string
      device1Id: string
      port1Name: string
      device2Id: string
      port2Name: string
      direction: string
      connectionType: string
    }>
  ): Promise<void> => {
    if (!tenantId || connections.length === 0) return

    const connectionsToCreate = connections.map((conn) => ({
      locationId: conn.locationId,
      device1Id: conn.device1Id,
      device2Id: conn.device2Id,
      port1Name: conn.port1Name,
      port2Name: conn.port2Name,
      direction: conn.direction,
      connectionType: conn.connectionType
    }))

    try {
      await api.post(`/tenant/${tenantId}/device-connection/batch`, {
        create: connectionsToCreate,
        delete: []
      })

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
        }),
        queryClient.invalidateQueries({ queryKey: ['connection-dialog-sub-devices'] })
      ])
      // Sequential: connection-dialog-connections depends on connection-dialog-sub-devices data
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      setNeedToRefetchRackData(true)
      toast.success(`${m.connections()} ${m.created().toLowerCase()}`)
    } catch {
      // handled by interceptor
    }
  }

  // Handle batch delete device connections (for building connections dialog)
  const handleDeleteDeviceConnections = async (connectionIds: string[]): Promise<void> => {
    if (!tenantId || connectionIds.length === 0) return

    // Mark connections as deleted to prevent stale data issues
    for (const id of connectionIds) {
      setDeletedConnectionIds((prev) => new Set(prev).add(id))
    }

    try {
      await api.post(`/tenant/${tenantId}/device-connection/batch`, {
        create: [],
        delete: connectionIds
      })

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['floor-devices-and-connections', tenantId, locationId, floorId]
        }),
        queryClient.invalidateQueries({ queryKey: ['connection-dialog-sub-devices'] })
      ])
      // Sequential: connection-dialog-connections depends on connection-dialog-sub-devices data
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      setNeedToRefetchRackData(true)
      toast.success(`${m.connections()} ${m.deleted().toLowerCase()}`)
    } catch {
      // handled by interceptor
    }
  }

  // Handle opening connection dialog
  const handleOpenConnectionDialog = (device: Device, portName?: string) => {
    setConnectionDialogDevice(device)
    setConnectionDialogPortName(portName)
    setShowAddConnectionDialog(true)
  }

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (locationQuery.error) {
    return <ErrorPage error={locationQuery.error} />
  }
  if (floorsQuery.error) {
    return <ErrorPage error={floorsQuery.error} />
  }

  if (locationQuery.isPending || floorsQuery.isPending || floorQuery.isPending) {
    return <Loader />
  }

  return (
    <div className="h-full bg-sidebar">
      <div className="flex w-full h-full">
        <div className="flex-1 min-w-0 h-full mr-6 xl:mr-0">
          <FloorSelector
            floors={floorsQuery.data || []}
            currentFloorId={floorId}
            rooms={rooms}
            devices={floorDevices}
            selectedRoomId={selectedRoom}
            locationPermissions={locationQuery.data?.permissions}
            floorPermissions={floorQuery.data?.permissions}
            roomPermissionsWithId={Object.entries(roomPermissions).map(([roomId, permissions]) => ({
              roomId,
              permissions: permissions as PermissionsCheckResult
            }))}
            existingRooms={rooms.map((room) => {
              const localShape = roomShapes.get(room._id)
              return {
                id: room._id,
                name: room.name,
                reference: room.reference,
                points: localShape || room.floorPlanShapePoints || [],
                type: room.floorPlanShapeType || 'polygon'
              }
            })}
            onCreateFloor={handleCreateFloor}
            onCreateDevice={handleCreateDevice}
            deviceNaming={deviceNaming}
            readOnly={billingStatus === 'read_only'}
          />
          <FloorEditor
            isSaving={isSaving}
            dataLoaded={
              locationQuery.isSuccess &&
              floorsQuery.isSuccess &&
              floorQuery.isSuccess &&
              (!floorQuery.data?.data?.floorPlan || floorPlanUrlQuery.isSuccess)
            }
            tenantId={tenantId}
            locationId={locationId}
            floors={floorsQuery.data || []}
            currentFloorId={floorId}
            floorPlan={floorPlanUrlQuery.data || null}
            floorPlanSettings={
              previewSettings
                ? {
                    ...floorQuery.data?.data?.floorPlanSettings,
                    ...previewSettings
                  }
                : floorQuery.data?.data?.floorPlanSettings
            }
            isFloorEmpty={rooms.filter((r) => !r.isDefault).length === 0 && floorDevices.length === 0}
            rooms={rooms}
            selectedRoomId={selectedRoom}
            floorPermissions={floorQuery.data?.permissions}
            roomPermissionsWithId={Object.entries(roomPermissions).map(([roomId, permissions]) => ({
              roomId,
              permissions: permissions as PermissionsCheckResult
            }))}
            devicePermissionsWithId={Object.entries(floorDevicePermissions).map(([deviceId, permissions]) => ({
              deviceId,
              permissions: permissions as PermissionsCheckResult
            }))}
            existingRooms={rooms.map((room) => {
              // Use local shape if it exists, otherwise use API shape
              const localShape = roomShapes.get(room._id)
              return {
                id: room._id,
                name: room.name,
                reference: room.reference,
                points: localShape || room.floorPlanShapePoints || [],
                type: room.floorPlanShapeType || 'polygon'
              }
            })}
            devices={floorDevices}
            selectedDeviceId={selectedDevice}
            existingDevices={floorDevices.map((device: Device) => {
              // Use local position if it exists, otherwise use API position
              const localPosition = devicePositions.get(device._id)
              if (localPosition) {
                return {
                  ...device,
                  floorPlanPosition: localPosition
                }
              }
              return device
            })}
            existingConnections={floorDeviceConnections}
            buildingConnectionRackPairs={buildingConnectionRackPairs}
            startMeasuring={isMeasuring}
            onMeasuringStateChange={setIsMeasuring}
            onScaleUpdate={handleFloorPlanScaleUpdate}
            onRoomSelect={handleRoomSelect}
            onCreateRoom={handleCreateRoom}
            onUpdateRoom={handleUpdateRoomShape}
            onDeleteRoom={handleDeleteRoom}
            onDeviceSelect={handleDeviceSelect}
            onCreateDevice={handleCreateDevice}
            onUpdateDevicePosition={handleUpdateDevicePosition}
            onDeleteDevice={handleDeleteDevice}
            onOpenConnectionDialog={handleOpenConnectionDialog}
            onEditingStateChange={setIsEditingInProgress}
            devicesSidebarOpen={devicesSidebarOpen}
            infoSidebarOpen={infoSidebarOpen}
            bottomDrawerOpen={bottomDrawerOpen}
            onDevicesSidebarToggle={setDevicesSidebarOpen}
            onBottomDrawerToggle={setBottomDrawerOpen}
            deviceNaming={deviceNaming}
            readOnly={billingStatus === 'read_only'}
          />
        </div>
        <InfoSidebar
          open={infoSidebarOpen}
          onToggle={() => {
            setInfoSidebarOpen(!infoSidebarOpen)
            posthog?.capture('floor_editor:info_sidebar_toggle')
          }}
          view={infoSidebarView}
          isSaving={isSaving}
          floorData={floorQuery.data?.data}
          floorPermissions={floorQuery.data?.permissions}
          rooms={rooms}
          floorCount={floorsQuery.data?.length ?? 0}
          roomData={selectedRoom ? rooms.find((r) => r._id === selectedRoom) : undefined}
          roomPermissions={
            selectedRoom ? (roomPermissions[selectedRoom] as PermissionsCheckResult | undefined) : undefined
          }
          deviceData={selectedDevice ? floorDevices.find((d: Device) => d._id === selectedDevice) : undefined}
          devicePermissions={
            selectedDevice ? (floorDevicePermissions[selectedDevice] as PermissionsCheckResult) : undefined
          }
          deviceQueryKey={['floor-devices-and-connections', tenantId, locationId, floorId]}
          deviceConnections={
            selectedDevice
              ? floorDeviceConnections.filter(
                  (conn: DeviceConnection) => conn.device1Id === selectedDevice || conn.device2Id === selectedDevice
                )
              : []
          }
          hasFloorPlan={!!floorPlanUrlQuery.data}
          hasScale={!!floorQuery.data?.data?.floorPlanSettings?.scale}
          readOnly={billingStatus === 'read_only'}
          onStartMeasuring={handleStartMeasuring}
          onUpdateFloor={handleUpdateFloor}
          onUpdateRoom={selectedRoom ? (data: Partial<Room>) => handleUpdateRoomData(selectedRoom, data) : undefined}
          onUpdateDevice={
            selectedDevice ? (data: Partial<Device>) => handleUpdateDeviceData(selectedDevice, data) : undefined
          }
          onFloorSettingsPreview={setPreviewSettings}
          onDeleteFloor={handleDeleteFloor}
          onDeleteRoom={selectedRoom ? () => handleDeleteRoom() : undefined}
          onDeleteDevice={selectedDevice ? handleDeleteDevice : undefined}
          onDeleteDeviceConnection={handleDeleteDeviceConnection}
          onCreateDeviceConnection={handleOpenConnectionDialog}
          onUpdateDeviceConnection={handleUpdateDeviceConnection}
          onOpenManageBuildingConnections={(device) => setBuildingConnectionsDevice(device)}
        />
      </div>
      <EditLocationDialog
        open={editLocationDialogOpen}
        onOpenChange={setEditLocationDialogOpen}
        location={locationQuery.data?.data ?? null}
        permissions={locationQuery.data?.permissions}
        readOnly={billingStatus === 'read_only'}
        onSave={handleUpdateLocation}
      />

      <AddConnectionDialog
        isOpen={showAddConnectionDialog}
        sourceDevice={connectionDialogDevice}
        sourcePortName={connectionDialogPortName}
        currentLocation={locationQuery.data?.data || null}
        currentFloor={floorsQuery.data?.find((f) => f._id === floorId) || null}
        currentRoom={connectionDialogDevice ? rooms.find((r) => r._id === connectionDialogDevice.roomId) || null : null}
        existingDevices={floorDevices}
        onDeviceUpdate={handleUpdateDeviceData}
        onClose={() => {
          if (!connectionCreatedRef.current) {
            posthog?.capture('floor_editor:connection_creation_cancel')
          }
          setShowAddConnectionDialog(false)
          setConnectionDialogDevice(null)
          setConnectionDialogPortName(undefined)
          connectionCreatedRef.current = false
        }}
        onCreateConnection={async (fromPort, toPort, outbound, rackDeviceSide, rackDeviceIds, cassetteColor) => {
          connectionCreatedRef.current = true
          setShowAddConnectionDialog(false)
          setConnectionDialogDevice(null)

          // License gate: check after dialog is closed so the license dialog is visible
          if (rackDeviceIds && rackDeviceIds.length > 0) {
            const proceed = await checkRackLicense(rackDeviceIds)
            if (!proceed) return false
          }
          let success = false
          if (outbound) {
            const direction = rackDeviceSide === 'back' ? 'back-external' : 'front-external'
            success = await handleCreateDeviceConnection([
              {
                fromDeviceId: toPort.deviceId,
                toDeviceId: fromPort.deviceId,
                port1Name: toPort.portName,
                port2Name: fromPort.portName,
                direction,
                cassetteColor
              }
            ])
          } else {
            success = await handleCreateDeviceConnection([
              {
                fromDeviceId: fromPort.deviceId,
                toDeviceId: toPort.deviceId,
                port1Name: fromPort.portName,
                port2Name: toPort.portName,
                direction: 'external-external',
                cassetteColor
              }
            ])
          }
          if (success) {
            posthog?.capture('floor_editor:connection_created', {
              fromDeviceId: fromPort.deviceId,
              toDeviceId: toPort.deviceId,
              outbound
            })
          }
          return success
        }}
        onOpenManageBuildingConnections={() => {
          if (connectionDialogDevice && isSamePortHopDevice(connectionDialogDevice.deviceType)) {
            setBuildingConnectionsDevice(connectionDialogDevice)
          }
        }}
      />
      {buildingConnectionsDevice && (
        <Suspense fallback={null}>
          <ManageBuildingConnections
            open={!!buildingConnectionsDevice}
            onOpenChange={(open) => {
              if (!open) setBuildingConnectionsDevice(null)
            }}
            sourceDevice={buildingConnectionsDevice}
            existingConnections={floorDeviceConnections}
            defaultLocationId={locationId}
            defaultFloorId={floorId || ''}
            defaultRoomId={buildingConnectionsDevice.roomId || ''}
            onSave={async (data) => {
              if (data.connectionsToDelete.length > 0) {
                await handleDeleteDeviceConnections(data.connectionsToDelete)
              }
              if (data.connectionsToCreate.length > 0) {
                await handleCreateDeviceConnections(
                  data.connectionsToCreate.map((conn) => ({
                    ...conn,
                    connectionType: 'building'
                  }))
                )
              }
            }}
          />
        </Suspense>
      )}
      <ConfirmDialog
        // Held back while a room choice is pending: two modal overlays at once would stack.
        open={!!roomDeviceMoves && !roomChoices}
        onOpenChange={(open) => {
          if (!open) setRoomDeviceMoves(null)
        }}
        title={m.move_devices_title()}
        description={m.move_devices_into_room_description({
          count: roomDeviceMoves?.devices.length ?? 0,
          room: roomDeviceMoves?.roomLabel ?? ''
        })}
        confirmButtonText={m.move()}
        cancelButtonText={m.keep_position()}
        loading={isMovingDevices}
        onConfirm={handleReassignDevices}
      />
      {roomChoices && (
        <SelectRoomDialog
          key={roomChoices.choices[0].move._id}
          open
          rooms={roomChoices.choices[0].roomIds.map((id) => {
            const room = rooms.find((r) => r._id === id)
            return { value: id, label: room?.name ? `${room.reference} - ${room.name}` : room?.reference || id }
          })}
          defaultRoomId={roomChoices.choices[0].move.roomId}
          description={m.move_device_left_room_description({
            device: roomChoices.choices[0].deviceLabel,
            room: roomChoices.choices[0].roomLabel
          })}
          onConfirm={async (roomId) => {
            const { choices, pendingMoves, revertShape } = roomChoices
            const [choice, ...rest] = choices
            const moves = [...pendingMoves, { ...choice.move, roomId }]
            // Everything the edit implied is sent in one go, once the last device has an owner.
            if (rest.length > 0) setRoomChoices({ choices: rest, pendingMoves: moves, revertShape })
            else {
              setRoomChoices(null)
              await moveDevices(moves)
            }
          }}
          onCancel={async () => {
            const { choices, pendingMoves, revertShape } = roomChoices
            if (revertShape) {
              // Undoing the shape edit is the only way to keep this device in the room it is drawn in.
              setRoomChoices(null)
              setRoomDeviceMoves(null)
              await revertShape()
              return
            }
            // Room deleted: no shape to restore, so skip this device and carry on with the rest.
            const rest = choices.slice(1)
            if (rest.length > 0) setRoomChoices({ choices: rest, pendingMoves })
            else {
              setRoomChoices(null)
              if (pendingMoves.length > 0) await moveDevices(pendingMoves)
            }
          }}
        />
      )}
      {licenseGateDialog}
    </div>
  )
}

function LocationInfo({ location }: { location: Location }) {
  return (
    <div>
      <p className="font-semibold">{location.name}</p>
      {location.address && (
        <div className="mt-2 leading-tight">
          <p className="font-semibold">{m.address()}</p>
          <p>{location.address.line1}</p>
          <p>{location.address.line2}</p>
          <p>
            {location.address.postalCode} {location.address.city}
          </p>
          <p>{location.address.state}</p>
          {location.address.countryCode && <p>{getCountryName(location.address.countryCode, getLocale())}</p>}
        </div>
      )}
      {location.contactPerson?.lastName && (
        <div className="mt-2 leading-tight">
          <p className="font-semibold">{m.contact_person()}</p>
          <p>
            {location.contactPerson.firstName} {location.contactPerson.lastName}
          </p>
          <p>{location.contactPerson.email}</p>
          <p>{location.contactPerson.phone}</p>
          <p>
            {m.job_title()}: {location.contactPerson.jobTitle}
          </p>
          <p>
            {m.department()}: {location.contactPerson.department}
          </p>
        </div>
      )}
    </div>
  )
}

function KeyboardCommands() {
  return (
    <div className="flex flex-col gap-2 leading-tight">
      <div className="flex items-center justify-between gap-2">
        <span>{m.toggle_app_sidebar()}</span>
        <KeyboardCommand keyValue="B" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.toggle_editor_panels()}</span>
        <KeyboardCommand keyValue="H" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.cancel_measurement_room_polygon_drawing_room_shape_editing()}</span>
        <KeyboardCommand keyValue="ESC" modifier={false} />
      </div>
    </div>
  )
}
