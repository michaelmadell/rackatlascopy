import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createFileRoute, useNavigate, useBlocker } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Popover, PopoverContent, PopoverTrigger } from '@patchdocs/ui'
import { TbEye, TbEyeOff, TbKeyboard, TbArrowBigUp, TbBackspace } from 'react-icons/tb'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import HelpButton from '@/components/common/HelpButton'
import ButtonWithTooltip from '@/components/common/ButtonWithTooltip'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAppStore } from '@/lib/app-store'
import Loader from '@/components/common/Loader'
import ErrorPage from '@/components/common/ErrorPage'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import Editor from '@/components/editors/rack-editor/Editor'
import {
  showCassetteChangesToast,
  hasCassetteChanges,
  cassetteChangeReferences
} from '@/components/editors/common/CassetteColorConflictDialog'
import { KeyboardCommand } from '@/components/common/KeyboardCommand'
import * as m from '@/paraglide/messages'
import type { UnsavedChanges } from '@/components/editors/rack-editor/hooks/useAutoSave'
import type { Device, DeviceConnection, DeviceElement } from '@/types'

type RackEditorSearch = {
  subDeviceId?: string
}

export const Route = createFileRoute('/app/t/$tenantId/locations/$locationId/devices/$deviceId')({
  component: DevicePage,
  validateSearch: (search: Record<string, unknown>): RackEditorSearch => {
    return {
      subDeviceId: (search.subDeviceId as string) || undefined
    }
  }
})

function DevicePage() {
  const { setConfig } = useHeaderConfig()
  const navigate = useNavigate({ from: Route.fullPath })
  const { tenantId, locationId, deviceId } = Route.useParams()
  const { subDeviceId: urlSubDeviceId } = Route.useSearch()
  const posthog = usePostHog()
  const api = useAuthenticatedApi()
  const billingStatus = useAppStore((state) => state.billingStatus)
  const customer = useAppStore((state) => state.customer)
  const needToRefetchRackData = useAppStore((state) => state.needToRefetchRackData)
  const setNeedToRefetchRackData = useAppStore((state) => state.setNeedToRefetchRackData)
  const setNeedToRefetchFloorData = useAppStore((state) => state.setNeedToRefetchFloorData)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveNowRef = useRef<(() => Promise<boolean>) | null>(null)
  const queryClient = useQueryClient()
  const isDesktop = useMediaQuery('(min-width: 1280px)')

  // Panel state management
  const [desktopInfoSidebarOpen, setDesktopInfoSidebarOpen] = useState(true)
  const showInfoSidebar = useAppStore((state) => state.showInfoSidebar)
  const setShowInfoSidebar = useAppStore((state) => state.setShowInfoSidebar)
  const infoSidebarOpen = isDesktop ? desktopInfoSidebarOpen : showInfoSidebar
  const setInfoSidebarOpen = isDesktop ? setDesktopInfoSidebarOpen : setShowInfoSidebar

  const [desktopDevicesSidebarOpen, setDesktopDevicesSidebarOpen] = useState(true)
  const [mobileDevicesSidebarOpen, setMobileDevicesSidebarOpen] = useState(false)
  const devicesSidebarOpen = isDesktop ? desktopDevicesSidebarOpen : mobileDevicesSidebarOpen
  const setDevicesSidebarOpen = isDesktop ? setDesktopDevicesSidebarOpen : setMobileDevicesSidebarOpen

  const [connectionsListOpen, setConnectionsListOpen] = useState(false)
  // Cassette colours a save wrote that were never announced beforehand (§4.3).
  const [showHeightUnitIndicators, setShowHeightUnitIndicators] = useState(true)

  // Device naming config from customer
  const deviceNaming = useMemo(
    () => ({
      standardDeviceTypePrefixes: customer?.standardDeviceTypePrefixes,
      customDeviceTypes: customer?.customDeviceTypes
    }),
    [customer?.standardDeviceTypePrefixes, customer?.customDeviceTypes]
  )

  // Get device
  const deviceQuery = useQuery({
    queryKey: ['rack', tenantId, locationId, deviceId],
    enabled: billingStatus !== 'blocked',
    queryFn: () =>
      api.get(`/tenant/${tenantId}/device/${deviceId}`).then((res) => {
        // console.log('device response:', res.data)
        return res.data
      })
  })
  const device = deviceQuery.data?.data
  const devicePermissions = deviceQuery.data?.permissions

  // Get sub-devices and connections in a single query
  const subDevicesAndConnectionsQuery = useQuery({
    queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId],
    enabled: billingStatus !== 'blocked' && !!deviceId,
    queryFn: async () => {
      const devicesResponse = await api.post(`/tenant/${tenantId}/device/bulk`, {
        rackDeviceId: deviceId
      })

      const devices = devicesResponse.data?.data || []

      const connectionIds = new Set<string>()
      for (const subDevice of devices) {
        for (const port of subDevice.elements || []) {
          if (port.deviceConnectionIds) {
            for (const connId of port.deviceConnectionIds) {
              connectionIds.add(connId)
            }
          }
        }
      }

      const uniqueConnectionIds = Array.from(connectionIds)
      let connections = []

      if (uniqueConnectionIds.length > 0) {
        const connectionsResponse = await api.post(`/tenant/${tenantId}/device-connection/bulk`, {
          ids: uniqueConnectionIds
        })
        connections = connectionsResponse.data?.data || []
      }

      return { devices, connections }
    }
    // Add retry configuration to handle transient errors
    // retry: (failureCount: number, error: unknown) => {
    //   // Don't retry 403 errors (deleted connections)
    //   if ((error as { response?: { status: number } })?.response?.status === 403) {
    //     return false
    //   }
    //   // Retry other errors up to 3 times
    //   return failureCount < 3
    // }
  })

  const subDevices = subDevicesAndConnectionsQuery.data?.devices || []
  const subDeviceConnections = subDevicesAndConnectionsQuery.data?.connections || []

  // Fetch custom rack devices
  const customRackDevicesQuery = useQuery({
    queryKey: ['custom-rack-devices'],
    enabled: billingStatus !== 'blocked',
    queryFn: () => api.get(`/custom-rack-device?limit=10000`).then((res) => res.data)
  })
  const customRackDevices = customRackDevicesQuery.data?.data?.docs || []

  // Refetch devices and connections when flag is set (e.g., after changes on floor editor)
  useEffect(() => {
    if (needToRefetchRackData && deviceId) {
      queryClient.invalidateQueries({
        queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
      })
      setNeedToRefetchRackData(false)
      // console.log('refetched rack data')
    }
  }, [needToRefetchRackData, deviceId, tenantId, locationId, queryClient, setNeedToRefetchRackData])

  // Handle toggle all panels
  const anyPanelOpen = infoSidebarOpen || devicesSidebarOpen || connectionsListOpen || showHeightUnitIndicators
  const handleToggleAllPanels = useCallback(
    (source: 'keyboard' | 'button') => {
      const newState = !anyPanelOpen
      setInfoSidebarOpen(newState)
      setDevicesSidebarOpen(newState)
      setConnectionsListOpen(newState)
      setShowHeightUnitIndicators(newState)
      posthog?.capture('rack_editor:toggle_all_panels', { source })
    },
    [anyPanelOpen, setInfoSidebarOpen, setDevicesSidebarOpen, posthog]
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+H or Ctrl+H to toggle all panels
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
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
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleAllPanels])

  // Set header config (title, breadcrumbs, buttons)
  useEffect(() => {
    if (!device) return
    const deviceRef = device.reference
    setConfig({
      title: device.name || deviceRef || m.unknown(),
      documentTitle: deviceRef || m.unknown(),
      breadcrumbs: [
        { label: m.locations(), href: `/app/t/${tenantId}/locations` },
        { label: device.locationReference || '', href: `/app/t/${tenantId}/locations/${locationId}` },
        {
          label: device.floorReference || '',
          href: `/app/t/${tenantId}/locations/${locationId}`,
          search: { floorId: device.floorId }
        },
        { label: deviceRef }
      ],
      buttons:
        billingStatus === 'blocked'
          ? undefined
          : [
              <ButtonWithTooltip
                key="hide"
                variant="outline"
                size="sm-icon"
                tooltip={anyPanelOpen ? m.hide_panels() : m.show_panels()}
                tooltipSide="bottom"
                onClick={() => handleToggleAllPanels('button')}>
                {anyPanelOpen ? <TbEyeOff /> : <TbEye />}
              </ButtonWithTooltip>,
              <Popover
                key="keyboard-commands"
                onOpenChange={(open) => open && posthog?.capture('rack_editor:keyboard_commands_popover_open')}>
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
              </Popover>,
              <HelpButton key="help" docSlug="features/rack-editor" variant="outline" size="sm-icon" />
            ]
    })
    return () => setConfig(null)
  }, [setConfig, billingStatus, tenantId, locationId, device, handleToggleAllPanels, anyPanelOpen, posthog])

  // Handle auto-save from Editor
  // biome-ignore lint/correctness/useExhaustiveDependencies: no need to have api.xxx as dependencies
  const handleAutoSave = useCallback(
    async (changes: UnsavedChanges) => {
      if (
        (!changes.devices || changes.devices.size === 0) &&
        (!changes.connections || changes.connections.size === 0)
      ) {
        return
      }

      // Prepare device operations
      const devicesToCreate: Array<Partial<Device>> = []
      const devicesToUpdate: Array<Record<string, unknown>> = []
      const deviceIdsToDelete: string[] = []

      if (changes.devices && changes.devices.size > 0) {
        for (const [_changeKey, change] of changes.devices) {
          if (change.type === 'add') {
            const isRackTrayDevice = change.device.deviceType === 'rack-tray-device'
            devicesToCreate.push({
              _id: change.device._id,
              locationId: locationId,
              floorId: device?.floorId,
              roomId: device?.roomId,
              rackDeviceId: deviceId,
              category: 'rack',
              deviceType: change.device.deviceType,
              reference: change.device.reference,
              name: change.device.name,
              standardRackDevice: change.device.standardRackDevice,
              customRackDeviceId: change.device.customRackDeviceId,
              manufacturer: change.device.manufacturer,
              modelName: change.device.modelName,
              elements: change.device.elements,
              heightInRack: change.device.heightInRack || (isRackTrayDevice ? undefined : 1),
              unitInRack: change.device.unitInRack,
              sideOfRack: change.device.sideOfRack || 'front',
              ...(isRackTrayDevice
                ? { rackTrayId: change.device.rackTrayId, indexInRackTray: change.device.indexInRackTray }
                : {}),
              ...(device?.responsibleUserId ? { responsibleUserId: device.responsibleUserId } : {})
            })
          } else if (change.type === 'update') {
            const isRackTrayDevice = change.device.deviceType === 'rack-tray-device'
            if (isRackTrayDevice) {
              if (change.device._id && change.device.rackTrayId) {
                devicesToUpdate.push({
                  id: change.device._id,
                  rackTrayId: change.device.rackTrayId,
                  indexInRackTray: change.device.indexInRackTray,
                  sideOfRack: change.device.sideOfRack || 'front'
                })
              }
            } else if (change.device._id && change.device.unitInRack) {
              devicesToUpdate.push({
                id: change.device._id,
                heightInRack: change.device.heightInRack || 1,
                unitInRack: change.device.unitInRack,
                sideOfRack: change.device.sideOfRack || 'front'
              })
            }
          } else if (change.type === 'delete') {
            if (change.device._id) deviceIdsToDelete.push(change.device._id)
          }
        }
      }

      // Prepare connection operations
      const connectionsToCreate: Partial<DeviceConnection>[] = []
      const connectionIdsToDelete: string[] = []

      if (changes.connections && changes.connections.size > 0) {
        for (const [_connectionId, change] of changes.connections) {
          if (change.type === 'add') {
            connectionsToCreate.push({
              _id: change.connection._id,
              locationId: locationId,
              device1Id: change.connection.device1Id,
              device2Id: change.connection.device2Id,
              port1Name: change.connection.port1Name,
              port2Name: change.connection.port2Name,
              direction: change.connection.direction,
              ...(change.connection.cassetteColor ? { cassetteColor: change.connection.cassetteColor } : {})
            })
          } else if (change.type === 'update') {
            if (change.connection._id) {
              connectionIdsToDelete.push(change.connection._id)
            }
            connectionsToCreate.push({
              _id: change.connection._id,
              locationId: locationId,
              device1Id: change.connection.device1Id,
              device2Id: change.connection.device2Id,
              port1Name: change.connection.port1Name,
              port2Name: change.connection.port2Name,
              direction: change.connection.direction,
              ...(change.connection.cassetteColor ? { cassetteColor: change.connection.cassetteColor } : {})
            })
          } else if (change.type === 'delete') {
            if (change.connection._id) {
              connectionIdsToDelete.push(change.connection._id)
            }
          }
        }
      }

      try {
        const response = await api.post(
          `/tenant/${tenantId}/device/rack-editor/batch`,
          {
            devices: {
              create: devicesToCreate,
              update: devicesToUpdate,
              delete: deviceIdsToDelete
            },
            connections: {
              create: connectionsToCreate,
              delete: connectionIdsToDelete
            }
          },
          {
            sentryContext: {
              action: 'rack_auto_save',
              data: {
                rackDeviceId: deviceId,
                devicesCreated: devicesToCreate.map((d) => d._id),
                devicesUpdated: devicesToUpdate.map((d) => d.id),
                devicesDeleted: deviceIdsToDelete,
                connectionsCreated: connectionsToCreate.map((c) => c._id),
                connectionsDeleted: connectionIdsToDelete
              }
            }
          }
        )

        // What the server actually wrote, for the conflicts the client could not see coming (§4.3 / §4.5).
        if (hasCassetteChanges(response.data)) showCassetteChangesToast(response.data)

        // Refetch all data after changes
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['rack', tenantId, locationId, deviceId] }),
          queryClient.invalidateQueries({
            queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
          })
        ])
        queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })

        setNeedToRefetchFloorData(true)
      } catch (error) {
        console.error('handleAutoSave - Auto-save failed:', error)

        // Check for structured validation response (affectedId from server)
        const data = (
          error as { response?: { data?: { affectedId?: string; message?: string; resourceLabel?: string } } }
        )?.response?.data
        if (data?.affectedId) {
          const wrapped = new Error(data.message ?? 'Validation error')
          ;(wrapped as { validationInfo?: unknown }).validationInfo = {
            message: data.message ?? 'Validation error',
            affectedId: data.affectedId,
            resourceLabel: data.resourceLabel
          }
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['rack', tenantId, locationId, deviceId] }),
            queryClient.invalidateQueries({
              queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
            })
          ]).catch(() => {})
          throw wrapped
        }

        // Refetch to resync then re-throw
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['rack', tenantId, locationId, deviceId] }),
          queryClient.invalidateQueries({
            queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
          })
        ]).catch(() => {})
        throw error
      }
    },
    [deviceId, locationId, tenantId, queryClient, device?.floorId, device?.roomId, device?.responsibleUserId]
  )

  // Update rack mutation - only used by InfoSidebar RackForm
  const updateRackMutation = useMutation({
    mutationFn: async (updatedRack: Partial<Device>) => {
      const data = {
        tenantId: tenantId,
        locationId: locationId,
        floorId: device?.floorId,
        roomId: device?.roomId,
        ...updatedRack
      }
      const response = await api.patch(`/tenant/${tenantId}/device/${deviceId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rack', tenantId, locationId, deviceId] })
      queryClient.invalidateQueries({
        queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
      })
      setNeedToRefetchFloorData(true)
      // toast.success(`${m.rack()} ${m.updated().toLowerCase()}`)
    }
  })

  // Handle rack update from Editor/InfoSidebar
  const handleRackUpdate = useCallback(
    async (updatedRack: Partial<Device>) => {
      if (isSaving) return
      setIsSaving(true)
      try {
        if (isDirty && saveNowRef.current) {
          const saved = await saveNowRef.current()
          if (!saved) return // flush failed — don't mutate against unsaved state
        }
        await updateRackMutation.mutateAsync(updatedRack)
      } finally {
        setIsSaving(false)
      }
    },
    [updateRackMutation, isDirty, isSaving]
  )

  // Handle sub-device selection change (for URL sync)
  const handleSelectedDeviceChange = useCallback(
    (subDeviceId: string | null) => {
      navigate({ search: (prev) => ({ ...prev, subDeviceId: subDeviceId || undefined }), replace: true })
    },
    [navigate]
  )

  // Handle rack deletion
  const handleRackDeletion = useCallback(async () => {
    try {
      await api.delete(`/tenant/${tenantId}/device/${deviceId}`)
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      // toast.success(`${m.rack()} ${m.deleted().toLowerCase()}`)
      navigate({ to: '/app/t/$tenantId/locations/$locationId', params: { tenantId, locationId } })
      return true
    } catch (_error) {
      // console.error('Failed to delete rack:', error)
      return false
    }
  }, [api, deviceId, navigate, tenantId, locationId, queryClient])

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Device> }) => {
      const response = await api.patch(`/tenant/${tenantId}/device/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
      })
      // toast.success(`${m.device()} ${m.updated().toLowerCase()}`)
    }
  })

  // Handle device update from InfoSidebar
  const handleDeviceUpdate = useCallback(
    async (subDeviceId: string, updatedDevice: Partial<Device>): Promise<boolean> => {
      if (isSaving) return false
      setIsSaving(true)
      try {
        if (isDirty && saveNowRef.current) {
          const saved = await saveNowRef.current()
          if (!saved) return false // flush failed — don't mutate against unsaved state
        }

        // Optimistic update: immediately update subDevices so derived state recomputes
        queryClient.setQueryData(
          ['sub-devices-and-connections', tenantId, locationId, deviceId],
          (old: { devices: Device[]; connections: DeviceConnection[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              devices: old.devices.map((d: Device) => (d._id === subDeviceId ? { ...d, ...updatedDevice } : d))
            }
          }
        )

        const targetDevice = subDevices?.find((d: Device) => d._id === subDeviceId) || device
        if (!targetDevice) {
          toast.error(`${m.device()} ${m.not_found().toLowerCase()}`)
          return false
        }
        const updateData = {
          ...updatedDevice,
          floorId: targetDevice.floorId,
          roomId: targetDevice.roomId,
          locationId: targetDevice.locationId,
          tenantId: targetDevice.tenantId,
          customerId: targetDevice.customerId
        }
        await updateDeviceMutation.mutateAsync({ id: subDeviceId, data: updateData })
        return true
      } finally {
        setIsSaving(false)
      }
    },
    [updateDeviceMutation, subDevices, device, isDirty, isSaving, queryClient, tenantId, locationId, deviceId]
  )

  // Batch create device connections mutation
  const batchCreateDeviceConnectionsMutation = useMutation({
    mutationFn: async (
      connections: Array<{
        locationId: string
        device1Id: string
        port1Name: string
        device2Id: string
        port2Name: string
        direction: string
        connectionType: string
      }>
    ) => {
      // Map connections to the format expected by the batch API
      const connectionsToCreate = connections.map((conn) => ({
        locationId: conn.locationId,
        device1Id: conn.device1Id,
        device2Id: conn.device2Id,
        port1Name: conn.port1Name,
        port2Name: conn.port2Name,
        direction: conn.direction,
        connectionType: conn.connectionType
      }))

      const response = await api.post(`/tenant/${tenantId}/device-connection/batch`, {
        create: connectionsToCreate,
        delete: []
      })
      return response.data
    },
    onSuccess: async (data) => {
      if (hasCassetteChanges(data)) showCassetteChangesToast(data)
      await queryClient.invalidateQueries({
        queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
      })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-sub-devices'] })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      setNeedToRefetchFloorData(true)
      // toast.success(`${m.connections()} ${m.created().toLowerCase()}`)
    },
    onError: () => {
      toast.error('Failed to create connections')
    }
  })

  // Batch delete device connections mutation
  const batchDeleteDeviceConnectionsMutation = useMutation({
    mutationFn: async (connectionIds: string[]) => {
      const response = await api.post(`/tenant/${tenantId}/device-connection/batch`, {
        create: [],
        delete: connectionIds
      })
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
      })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-sub-devices'] })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      setNeedToRefetchFloorData(true)
      // toast.success(`${m.connections()} ${m.deleted().toLowerCase()}`)
    },
    onError: () => {
      toast.error('Failed to delete connections')
    }
  })

  // Handle batch create device connections
  const handleCreateDeviceConnections = useCallback(
    async (
      connections: Array<{
        locationId: string
        device1Id: string
        port1Name: string
        device2Id: string
        port2Name: string
        direction: string
        connectionType: string
      }>
    ) => {
      await batchCreateDeviceConnectionsMutation.mutateAsync(connections)
    },
    [batchCreateDeviceConnectionsMutation]
  )

  // Handle batch delete device connections
  const handleDeleteDeviceConnections = useCallback(
    async (connectionIds: string[]) => {
      await batchDeleteDeviceConnectionsMutation.mutateAsync(connectionIds)
    },
    [batchDeleteDeviceConnectionsMutation]
  )

  // Update a single device connection's metadata (e.g. color)
  const updateDeviceConnectionMutation = useMutation({
    mutationFn: async ({ connectionId, data }: { connectionId: string; data: { cableColor: string } }) => {
      const response = await api.patch(`/tenant/${tenantId}/device-connection/${connectionId}`, data)
      return response.data
    },
    onSuccess: async (data) => {
      // Setting a connection's colour also writes it onto the undocumented cassettes the chain runs through,
      // so the toast names them rather than reporting the cable alone.
      const references = cassetteChangeReferences(data)
      toast.success(m.connection_color_updated(), {
        description: references.length ? m.cassette_color_also_set({ references: references.join(', ') }) : undefined
      })
      await queryClient.invalidateQueries({
        queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
      })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      setNeedToRefetchFloorData(true)
    },
    onError: () => {
      toast.error(m.update_connection_error())
    }
  })

  const handleUpdateDeviceConnection = useCallback(
    async (connectionId: string, data: { cableColor: string }) => {
      // Same barrier as the other sidebar operations: the server resolves the colour over the whole chain,
      // so a connection drawn but not yet saved has to land first — otherwise it is coloured silently, after
      // a dialog that could not know about it.
      if (isDirty && saveNowRef.current) {
        const saved = await saveNowRef.current()
        if (!saved) return // flush failed — don't mutate against unsaved state
      }
      await updateDeviceConnectionMutation.mutateAsync({ connectionId, data })
    },
    [updateDeviceConnectionMutation, isDirty]
  )

  // Deactivate rack (remove license): server deletes all of the rack's connections
  const deactivateRackMutation = useMutation({
    mutationFn: async (rackId: string) => {
      const response = await api.post(`/tenant/${tenantId}/device/${rackId}/deactivate`)
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
      })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-sub-devices'] })
      await queryClient.invalidateQueries({ queryKey: ['connection-dialog-connections'] })
      queryClient.invalidateQueries({ queryKey: ['billing-active-racks'] })
      setNeedToRefetchFloorData(true)
    },
    onError: () => {
      toast.error('Failed to remove license')
    }
  })

  const handleDeactivateRack = useCallback(
    async (rackId: string) => {
      await deactivateRackMutation.mutateAsync(rackId)
    },
    [deactivateRackMutation]
  )

  // Handle SFP device creation: create the SFP device + update parent port
  // Uses api directly (not mutations) to avoid double query invalidation
  const handleCreateSfpDevice = useCallback(
    async (parentDeviceId: string, portName: string, reference: string, name: string, connectorType: string) => {
      if (isDirty && saveNowRef.current) {
        const saved = await saveNowRef.current()
        if (!saved) return // flush failed — don't mutate against unsaved state
      }

      const parentDevice = subDevices?.find((d: Device) => d._id === parentDeviceId)
      if (!parentDevice) return

      try {
        // Create the SFP device
        const { data: sfpDevice } = await api.post(`/tenant/${tenantId}/device`, {
          tenantId,
          locationId,
          floorId: device?.floorId,
          roomId: device?.roomId,
          rackDeviceId: deviceId,
          category: 'rack',
          deviceType: 'sfp-device',
          reference: reference.toUpperCase(),
          name: name || undefined,
          elements: [],
          ...(device?.responsibleUserId ? { responsibleUserId: device.responsibleUserId } : {})
        })
        if (!sfpDevice?.data) return

        // Update parent device port with connectorType and sfpDeviceId
        const updatedElements = (parentDevice.elements || []).map((el: DeviceElement) => {
          if (el.name === portName) {
            return { ...el, connectorType, sfpDeviceId: sfpDevice.data?._id }
          }
          return el
        })
        await api.patch(`/tenant/${tenantId}/device/${parentDeviceId}`, {
          locationId,
          floorId: device?.floorId,
          roomId: device?.roomId,
          rackDeviceId: deviceId,
          elements: updatedElements
        })

        // Invalidate once after both calls complete
        queryClient.invalidateQueries({
          queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
        })
        // toast.success(`${m.device()} ${m.created().toLowerCase()}`)
      } catch {
        // handled by interceptor
      }
    },
    [
      api,
      queryClient,
      subDevices,
      isDirty,
      tenantId,
      locationId,
      deviceId,
      device?.floorId,
      device?.roomId,
      device?.responsibleUserId
    ]
  )

  // Handle SFP device deletion: delete the SFP device + clear sfpDeviceId from parent port
  const handleDeleteSfpDevice = useCallback(
    async (sfpDeviceId: string, parentDeviceId: string, portName: string) => {
      if (isDirty && saveNowRef.current) {
        const saved = await saveNowRef.current()
        if (!saved) return // flush failed — don't mutate against unsaved state
      }

      try {
        // Delete the SFP device
        await api.delete(`/tenant/${tenantId}/device/${sfpDeviceId}`)

        // Clear sfpDeviceId from the parent port element
        const parentDevice = subDevices?.find((d: Device) => d._id === parentDeviceId)
        if (parentDevice) {
          const updatedElements = (parentDevice.elements || []).map((el: DeviceElement) => {
            if (el.name === portName) {
              const { sfpDeviceId: _, ...rest } = el
              return { ...rest, connectorType: '' }
            }
            return el
          })
          await api.patch(`/tenant/${tenantId}/device/${parentDeviceId}`, {
            locationId,
            floorId: device?.floorId,
            roomId: device?.roomId,
            rackDeviceId: deviceId,
            elements: updatedElements
          })
        }

        queryClient.invalidateQueries({
          queryKey: ['sub-devices-and-connections', tenantId, locationId, deviceId]
        })
        // toast.success(`${m.device()} ${m.deleted().toLowerCase()}`)
      } catch {
        // handled by interceptor
      }
    },
    [api, queryClient, subDevices, isDirty, tenantId, locationId, deviceId, device?.floorId, device?.roomId]
  )

  // Block navigation when there are unsaved changes
  useBlocker({
    shouldBlockFn: async ({ current, next }) => {
      // Don't block if only the subDeviceId search param is changing (device selection)
      if (current.pathname === next.pathname) {
        const currentSearch = current.search as RackEditorSearch
        const nextSearch = next.search as RackEditorSearch
        const { subDeviceId: _currentSubDevice, ...currentRest } = currentSearch
        const { subDeviceId: _nextSubDevice, ...nextRest } = nextSearch
        // If only subDeviceId changed, allow the navigation
        if (JSON.stringify(currentRest) === JSON.stringify(nextRest)) {
          return false
        }
      }

      if (!isDirty) return false
      const leave = window.confirm(m.unsaved_changes_confirm())
      if (leave) {
        setIsDirty(false)
        return false
      }
      return true
    },
    enableBeforeUnload: isDirty
  })

  // Navigate to location page if device is not a rack device
  useEffect(() => {
    if (device?.deviceType && device?.deviceType !== 'rack') {
      navigate({
        to: '/app/t/$tenantId/locations/$locationId',
        params: { tenantId, locationId }
      })
    }
  }, [device?.deviceType, navigate, tenantId, locationId])

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (deviceQuery.error) {
    return <ErrorPage error={deviceQuery.error} />
  }

  if (deviceQuery.isPending) {
    return <Loader />
  }

  return (
    <div className="h-full">
      <Editor
        rack={device}
        rackPermissions={devicePermissions}
        rackQueryKey={['rack', tenantId, locationId, deviceId]}
        subDevices={subDevices}
        deviceConnections={subDeviceConnections}
        onRackUpdate={handleRackUpdate}
        onDeleteRack={handleRackDeletion}
        onDeviceUpdate={handleDeviceUpdate}
        onCreateDeviceConnections={handleCreateDeviceConnections}
        onDeleteDeviceConnections={handleDeleteDeviceConnections}
        onUpdateDeviceConnection={handleUpdateDeviceConnection}
        onDeactivateRack={handleDeactivateRack}
        onAutoSave={handleAutoSave}
        isLoading={deviceQuery.isPending}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        onDirtyStateChange={setIsDirty}
        saveNowRef={saveNowRef}
        infoSidebarOpen={infoSidebarOpen}
        setInfoSidebarOpen={setInfoSidebarOpen}
        devicesSidebarOpen={devicesSidebarOpen}
        setDevicesSidebarOpen={setDevicesSidebarOpen}
        connectionsListOpen={connectionsListOpen}
        setConnectionsListOpen={setConnectionsListOpen}
        showHeightUnitIndicators={showHeightUnitIndicators}
        initialSelectedDeviceId={urlSubDeviceId}
        onSelectedDeviceChange={handleSelectedDeviceChange}
        deviceNaming={deviceNaming}
        customRackDevices={customRackDevices}
        onCreateSfpDevice={handleCreateSfpDevice}
        onDeleteSfpDevice={handleDeleteSfpDevice}
        readOnly={billingStatus === 'read_only'}
      />
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
        <span>{m.save_editor_changes()}</span>
        <KeyboardCommand keyValue="S" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.undo()}</span>
        <KeyboardCommand keyValue="Z" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.redo()}</span>
        <KeyboardCommand keyValue="Z" secondModifier={<TbArrowBigUp className="size-3" />} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.duplicate_selected_device()}</span>
        <KeyboardCommand keyValue="D" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.copy_selected_device()}</span>
        <KeyboardCommand keyValue="C" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.paste_selected_device()}</span>
        <KeyboardCommand keyValue="V" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{m.delete_selected_device_or_connection()}</span>
        <KeyboardCommand keyValue={<TbBackspace className="size-3.5" />} modifier={false} />
      </div>
    </div>
  )
}
