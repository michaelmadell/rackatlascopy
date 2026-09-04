import { useEffect, useState, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import * as Sentry from '@sentry/react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  ScrollArea,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@patchdocs/ui'
import { TbPlus, TbMapPinCog, TbDotsVertical, TbFileDownload } from 'react-icons/tb'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import HelpButton from '@/components/common/HelpButton'
import { useExport } from '@/contexts/ExportContext'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAppStore } from '@/lib/app-store'
import { getAddressString } from '@/lib/utils'
import { isUserAdminOfCurrentTenant } from '@/lib/utils'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import Loader from '@/components/common/Loader'
import ErrorPage from '@/components/common/ErrorPage'
import CreateLocationDialog from '@/components/location/CreateLocationDialog'
import EditLocationDialog from '@/components/location/EditLocationDialog'
import LocationCard, { type LocationListItem } from '@/components/location/LocationCard'
import MapMarker from '@/components/map/MapMarker'
import MapPopup from '@/components/map/MapPopup'
import ButtonWithTooltip from '@/components/common/ButtonWithTooltip'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import ActivityLogDialog from '@/components/activity/ActivityLogDialog'
import NoteEditorDialogMdx from '@/components/dialogs/NoteEditorDialogMdx'
import MoveResourceDialog from '@/components/dialogs/MoveResourceDialog'
import * as m from '@/paraglide/messages'
import type { Location, Address, PermissionsCheckResult } from '@/types'

export const Route = createFileRoute('/app/t/$tenantId/locations_/')({
  component: LocationsPage
})

function LocationsPage() {
  const { setConfig } = useHeaderConfig()
  const { tenantId } = Route.useParams()
  const posthog = usePostHog()
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const markerClickedRef = useRef(false)
  const [activeLocation, setActiveLocation] = useState<Location | null>(null)
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null)
  const [isEditingMarkers, setIsEditingMarkers] = useState(false)
  const billingStatus = useAppStore((state) => state.billingStatus)
  const readOnly = billingStatus === 'read_only'
  const user = useAppStore((state) => state.user)
  const activeTenant = useAppStore((state) => state.activeTenant)
  const isTenantAdmin = isUserAdminOfCurrentTenant(user, activeTenant)
  const canWrite = isTenantAdmin && !readOnly
  const tenants = useAppStore((state) => state.tenants)
  const tenant = tenants.find((t) => t._id === tenantId)
  const theme = useAppStore((state) => state.theme)
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 767px)')
  // Map disabling kept as a toggle (e.g. for unsupported browsers); no condition currently disables it
  const mapDisabled = false
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionsCheckResult | undefined>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [activityLogDialogOpen, setActivityLogDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showAddressUpdateDialog, setShowAddressUpdateDialog] = useState(false)
  const [pendingLocationUpdate, setPendingLocationUpdate] = useState<{
    location: Location
    newCoords: { lat: number; lng: number }
    newAddress: Address | null
  } | null>(null)
  const { triggerExport } = useExport()

  const locationsQuery = useQuery({
    queryKey: ['locations', tenantId],
    queryFn: () => api.get(`/tenant/${tenantId}/location?sort=name&limit=1000`).then((res) => res.data),
    enabled: billingStatus !== 'blocked'
  })

  // Handle marker click
  const handleMarkerClick = (location: Location) => {
    // Set flag to prevent map click from closing popup
    markerClickedRef.current = true
    // Toggle popup - close if clicking the same marker, open otherwise
    setActiveLocation((current) => (current?._id === location._id ? null : location))
  }

  // Handle marker drag end
  const handleMarkerDragEnd = async (location: Location, newCoords: { lat: number; lng: number }) => {
    if (!tenantId) return

    try {
      // Use Mapbox reverse geocoding to get address from coordinates
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${newCoords.lng},${newCoords.lat}.json`,
        {
          params: {
            access_token: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
            types: 'address'
          }
        }
      )

      let newAddress: Address | null = null
      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0]
        const context = feature.context || []

        // Extract address components
        const postcode = context.find((c: { id: string }) => c.id.startsWith('postcode'))?.text
        const place = context.find((c: { id: string }) => c.id.startsWith('place'))?.text
        const country = context.find((c: { id: string }) => c.id.startsWith('country'))?.short_code?.toUpperCase()

        newAddress = {
          line1: feature.place_name.split(',')[0] || '',
          line2: '',
          city: place || '',
          postalCode: postcode || '',
          countryCode: country || ''
        }
      }

      // Store pending update and show dialog
      setPendingLocationUpdate({
        location,
        newCoords,
        newAddress
      })
      setShowAddressUpdateDialog(true)
    } catch (_error) {
      // If reverse geocoding fails, just update coordinates
      try {
        await api.patch(`/tenant/${tenantId}/location/${location._id}`, {
          latitude: newCoords.lat,
          longitude: newCoords.lng
        })
        toast.success(m.location_coordinates_updated())
      } catch (_updateError) {
        // handled by interceptor
      } finally {
        setIsEditingMarkers(false)
        await locationsQuery.refetch()
      }
    }
  }

  // Handle confirming address update (update both coordinates and address)
  const handleConfirmAddressUpdate = async () => {
    if (!tenantId || !pendingLocationUpdate) return

    try {
      const updateData: { latitude: number; longitude: number; address?: Address } = {
        latitude: pendingLocationUpdate.newCoords.lat,
        longitude: pendingLocationUpdate.newCoords.lng
      }

      if (pendingLocationUpdate.newAddress) {
        updateData.address = pendingLocationUpdate.newAddress
      }

      await api.patch(`/tenant/${tenantId}/location/${pendingLocationUpdate.location._id}`, updateData)
      toast.success(
        pendingLocationUpdate.newAddress ? m.location_coordinates_updated() : m.location_coordinates_updated()
      )
    } catch (_error) {
      // handled by interceptor
    } finally {
      setShowAddressUpdateDialog(false)
      setPendingLocationUpdate(null)
      setIsEditingMarkers(false)
      await locationsQuery.refetch()
      queryClient.invalidateQueries({ queryKey: ['location', tenantId, pendingLocationUpdate.location._id] })
    }
  }

  // Handle declining address update (update coordinates only)
  const handleDeclineAddressUpdate = async () => {
    if (!tenantId || !pendingLocationUpdate) return

    try {
      await api.patch(`/tenant/${tenantId}/location/${pendingLocationUpdate.location._id}`, {
        latitude: pendingLocationUpdate.newCoords.lat,
        longitude: pendingLocationUpdate.newCoords.lng
      })
      toast.success(m.location_coordinates_updated())
    } catch (_error) {
      // handled by interceptor
    } finally {
      setShowAddressUpdateDialog(false)
      setPendingLocationUpdate(null)
      setIsEditingMarkers(false)
      await locationsQuery.refetch()
      queryClient.invalidateQueries({ queryKey: ['location', tenantId, pendingLocationUpdate.location._id] })
    }
  }

  // Handle location creation
  const handleCreateLocation = async (data: {
    name: string
    reference: string
    responsibleUserId?: string | null
    address: Address
    latitude: number
    longitude: number
  }) => {
    if (!tenantId) return false

    try {
      await api.post(`/tenant/${tenantId}/location`, {
        name: data.name,
        reference: data.reference,
        ...(data.responsibleUserId ? { responsibleUserId: data.responsibleUserId } : {}),
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude
      })

      toast.success(m.location_created())
      setCreateDialogOpen(false)
      await locationsQuery.refetch()
      return true
    } catch (_error) {
      // handled by interceptor
      return false
    }
  }

  /**
   * A rename rewrites `fullReference` across the whole subtree server-side (`lib/move.ts`), staling devices,
   * connections and rack children that carry those paths. No shared key prefix targets them, so refetch
   * everything — same rule as the location editor and `MoveResourceDialog`. Don't narrow it back.
   */
  const handleUpdateLocation = async (id: string, data: Partial<Location>): Promise<boolean> => {
    const current = (locationsQuery.data?.data.docs as Location[] | undefined)?.find((l) => l._id === id)
    const renamed = !!data.reference && data.reference.toUpperCase() !== current?.reference?.toUpperCase()
    try {
      await api.patch(`/tenant/${tenantId}/location/${id}`, data)
      toast.success(`${m.location()} ${m.updated().toLowerCase()}`)
      if (renamed) await queryClient.invalidateQueries()
      else {
        await queryClient.invalidateQueries({ queryKey: ['locations'] })
        await queryClient.invalidateQueries({ queryKey: ['location', tenantId, id] })
      }
      return true
    } catch (_error) {
      // handled by interceptor
      return false
    }
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return
    try {
      await api.delete(`/tenant/${tenantId}/location/${selectedLocation._id}`)
      toast.success(`${m.location()} ${m.deleted().toLowerCase()}`)
      setDeleteDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['locations'] })
    } catch (_error) {
      // handled by interceptor
    }
  }

  const handleSaveNotes = async (content: string) => {
    if (!selectedLocation) return
    await handleUpdateLocation(selectedLocation._id, { notes: content })
  }

  const selectLocation = (location: Location, permissions?: PermissionsCheckResult) => {
    setSelectedLocation(location)
    setSelectedPermissions(permissions)
  }

  const checkWebGLSupport = (): boolean => {
    try {
      const canvas = document.createElement('canvas')
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
    } catch (_error) {
      return false
    }
  }

  const handleExportPdf = useCallback(async () => {
    if (!tenantId) return
    await triggerExport('tenant', tenantId)
  }, [tenantId, triggerExport])

  useEffect(() => {
    const buttons = []
    if (isTenantAdmin && billingStatus !== 'blocked') {
      buttons.push(
        <Button
          key="add"
          size={isMobile ? 'sm-icon' : 'sm'}
          onClick={() => setCreateDialogOpen(true)}
          disabled={!canWrite}>
          <TbPlus />
          <span className="hidden md:inline">{m.location_add()}</span>
        </Button>
      )
    }
    buttons.push(<HelpButton key="help" docSlug="features/map-view" variant="outline" size="sm-icon" />)
    buttons.push(
      <DropdownMenu key="export">
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm-icon" disabled={readOnly}>
            <TbDotsVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="text-xs cursor-pointer py-1" onClick={handleExportPdf}>
            <TbFileDownload className="size-3" />
            {m.export_as_pdf()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    setConfig({
      title: m.locations(),
      buttons
    })
    return () => setConfig(null)
  }, [setConfig, isTenantAdmin, billingStatus, canWrite, readOnly, isMobile, handleExportPdf])

  // biome-ignore lint/correctness/useExhaustiveDependencies: tenant excluded - separate effect handles tenant changes
  useEffect(() => {
    if (mapDisabled || !mapContainerRef.current || locationsQuery.isPending || locationsQuery.error) {
      return
    }

    // Check WebGL support before attempting to create map
    if (!checkWebGLSupport()) {
      toast.warning(m.webgl_not_supported())
      Sentry.logger.warn('checkWebGLSupport - WebGL not supported')
      posthog?.capture('app:no_webgl_support')
      return
    }

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
        center: tenant?.latitude && tenant?.longitude ? [tenant.longitude, tenant.latitude] : [16.378, 48.207], // Vienna coordinates [lng, lat]
        zoom: 12,
        maxTileCacheSize: 50
      })

      // Log WebGL context loss for evidence — Mapbox handles recovery internally
      map.getCanvas().addEventListener('webglcontextlost', () => {
        Sentry.logger.warn('[mapbox] webgl context lost')
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-left')
      // map.addControl(new mapboxgl.FullscreenControl(), 'top-left')

      map.on('error', (e) => {
        // Wrap so the message doesn't match Sentry ignoreErrors filters (e.g. NetworkError)
        const originalMessage = e.error?.message || String(e.error) || 'unknown'
        const wrapped = new Error(`[mapbox] ${originalMessage}`)
        Sentry.withScope((scope) => {
          scope.setTag('action', 'mapbox_map_error')
          scope.setExtra('mapbox_error_status', (e.error as { status?: number })?.status)
          scope.setExtra('mapbox_error_url', (e.error as { url?: string })?.url)
          scope.setExtra('mapbox_error_original', originalMessage)
          Sentry.captureException(wrapped)
        })
      })

      // Close popup when clicking on the map (but not on markers)
      map.on('click', () => {
        // If a marker was just clicked, don't close the popup
        if (markerClickedRef.current) {
          markerClickedRef.current = false
          return
        }
        setActiveLocation(null)
      })

      mapRef.current = map

      // Set map instance immediately and also on load
      setMapInstance(map)

      // Also ensure it's set after load
      map.once('load', () => {
        // console.log('Map loaded')
        setMapInstance(map)
      })
    } catch (error) {
      toast.error(m.map_initialization_failed())
      Sentry.withScope((scope) => {
        scope.setTag('action', 'mapbox_init')
        Sentry.captureException(error)
      })
    }

    return () => {
      setMapInstance(null)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [locationsQuery.isPending, locationsQuery.error, theme])

  // Update map center when tenant changes (if no locations to fit bounds to)
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger when tenant changes
  useEffect(() => {
    if (!mapRef.current?.loaded()) return

    const locations = (locationsQuery.data?.data.docs as Location[]) ?? []
    const locationsWithCoords = locations.filter((l) => l.latitude && l.longitude)

    // Only center on tenant if there are no location markers
    if (locationsWithCoords.length === 0 && tenant?.latitude && tenant?.longitude) {
      mapRef.current.flyTo({
        center: [tenant.longitude, tenant.latitude],
        zoom: 12
      })
    }
  }, [tenantId, locationsQuery.data, tenant?.latitude, tenant?.longitude])

  // Fit map to show all locations when data is loaded
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger when theme changes as well
  useEffect(() => {
    if (!mapRef.current || !locationsQuery.data) return

    const locations = (locationsQuery.data?.data.docs as Location[]) ?? []
    const locationsWithCoords = locations.filter((l) => l.latitude && l.longitude)

    if (locationsWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      for (const location of locationsWithCoords) {
        bounds.extend([location.longitude, location.latitude])
      }

      // Wait for map to be loaded before fitting bounds
      if (mapRef.current.loaded()) {
        mapRef.current.fitBounds(bounds, { padding: 100, maxZoom: 14 })
      } else {
        mapRef.current.on('load', () => {
          mapRef.current?.fitBounds(bounds, { padding: 100, maxZoom: 14 })
        })
      }
    }
  }, [locationsQuery.data, theme])

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (locationsQuery.error) {
    return <ErrorPage error={locationsQuery.error} />
  }

  if (locationsQuery.isPending) {
    return <Loader />
  }

  const locations = (locationsQuery.data?.data.docs as LocationListItem[]) ?? []

  return (
    <>
      <div className="h-full">
        <ScrollArea className="h-[calc(100svh-var(--header-height))]">
          <div className="p-4 flex flex-col gap-4">
            {!mapDisabled && (
              <div className="relative">
                <div id="map-container" ref={mapContainerRef} className="h-[50vh] min-h-100 rounded-lg shadow-sm" />
                {/* Markers */}
                {mapInstance &&
                  locations.map(
                    (location) =>
                      location.latitude &&
                      location.longitude && (
                        <MapMarker
                          key={location._id}
                          map={mapInstance}
                          location={location}
                          isActive={activeLocation?._id === location._id}
                          onClick={handleMarkerClick}
                          draggable={isEditingMarkers && canWrite}
                          onDragEnd={handleMarkerDragEnd}
                        />
                      )
                  )}
                {/* Popup */}
                {mapInstance && (
                  <MapPopup map={mapInstance} activeLocation={activeLocation} onClose={() => setActiveLocation(null)}>
                    {activeLocation && (
                      <Link
                        to="/app/t/$tenantId/locations/$locationId"
                        params={{ tenantId, locationId: activeLocation._id ?? '' }}
                        className="text-background hover:text-brand-blue text-sm font-medium no-underline">
                        {activeLocation.name || activeLocation.reference}
                      </Link>
                    )}
                  </MapPopup>
                )}
                {/* Edit markers button */}
                {mapInstance && canWrite && (
                  <ButtonWithTooltip
                    size="sm-icon"
                    variant={isEditingMarkers ? 'default' : 'outline'}
                    onClick={() => setIsEditingMarkers(!isEditingMarkers)}
                    className="absolute has-[>svg]:px-2 dark:bg-sidebar dark:hover:bg-sidebar"
                    style={{ top: isMobile ? '104px' : '118px', left: '10px' }}
                    tooltip={m.location_edit_markers_tooltip()}>
                    <TbMapPinCog className="size-4" />
                  </ButtonWithTooltip>
                )}
              </div>
            )}

            {/* Grid view with cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {locations.map((location) => (
                <LocationCard
                  key={location._id}
                  location={location}
                  tenantId={tenantId}
                  readOnly={readOnly}
                  onEdit={(loc, permissions) => {
                    selectLocation(loc, permissions)
                    setEditDialogOpen(true)
                  }}
                  onNotes={(loc, permissions) => {
                    selectLocation(loc, permissions)
                    setNotesDialogOpen(true)
                  }}
                  onMove={(loc) => {
                    selectLocation(loc)
                    setMoveDialogOpen(true)
                  }}
                  onDelete={(loc) => {
                    selectLocation(loc)
                    setDeleteDialogOpen(true)
                  }}
                  onActivityLog={(loc) => {
                    selectLocation(loc)
                    setActivityLogDialogOpen(true)
                  }}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      <CreateLocationDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreateLocation}
      />

      <EditLocationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        location={selectedLocation}
        permissions={selectedPermissions}
        readOnly={readOnly}
        onSave={handleUpdateLocation}
      />

      <NoteEditorDialogMdx
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        initialContent={selectedLocation?.notes || ''}
        onSave={handleSaveNotes}
        canEdit={!readOnly && !!selectedPermissions?.canWrite}
        resourceName={selectedLocation?.fullReference || selectedLocation?.reference || ''}
      />

      {selectedLocation && (
        <MoveResourceDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          type="location"
          resource={selectedLocation}
        />
      )}

      {selectedLocation && (
        <ActivityLogDialog
          open={activityLogDialogOpen}
          onClose={() => setActivityLogDialogOpen(false)}
          tenantId={tenantId}
          resourceId={selectedLocation._id}
          resourceType="location"
          resourceReference={selectedLocation.fullReference || selectedLocation.reference}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={m.delete_resource({ resource: m.location() })}
        description={m.delete_location_confirmation()}
        confirmButtonText={m.delete()}
        cancelButtonText={m.cancel()}
        onConfirm={handleDeleteLocation}
        variant="destructive"
        addedVerification={selectedLocation?.reference}
      />

      <ConfirmDialog
        open={showAddressUpdateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddressUpdateDialog(false)
            setPendingLocationUpdate(null)
            setIsEditingMarkers(false)
          }
        }}
        title={m.location_update_address_title()}
        description={m.location_update_address_description({
          address: getAddressString(pendingLocationUpdate?.newAddress) || '-'
        })}
        confirmButtonText={m.location_update_address_confirm()}
        cancelButtonText={m.location_update_address_cancel()}
        onConfirm={handleConfirmAddressUpdate}
        onCancel={handleDeclineAddressUpdate}
      />
    </>
  )
}
