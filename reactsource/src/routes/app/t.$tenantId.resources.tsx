import { lazy, Suspense } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger } from '@patchdocs/ui'
import { useHeader } from '@/hooks/useHeader'
import HelpButton from '@/components/common/HelpButton'
import { useAppStore } from '@/lib/app-store'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import Loader from '@/components/common/Loader'
import * as m from '@/paraglide/messages'

const ResourceLocationsTab = lazy(() => import('@/components/resources/ResourceLocationsTab'))
const ResourceFloorsTab = lazy(() => import('@/components/resources/ResourceFloorsTab'))
const ResourceRoomsTab = lazy(() => import('@/components/resources/ResourceRoomsTab'))
const ResourceDevicesTab = lazy(() => import('@/components/resources/ResourceDevicesTab'))
const ResourceDevicePortsTab = lazy(() => import('@/components/resources/ResourceDevicePortsTab'))
const ResourceDeviceConnectionsTab = lazy(() => import('@/components/resources/ResourceDeviceConnectionsTab'))

type ResourcesTab = 'locations' | 'floors' | 'rooms' | 'devices' | 'device-ports' | 'device-connections'

const resourcesTabs: ResourcesTab[] = ['locations', 'floors', 'rooms', 'devices', 'device-ports', 'device-connections']

export const Route = createFileRoute('/app/t/$tenantId/resources')({
  component: ResourcesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: resourcesTabs.includes(search.tab as ResourcesTab) ? (search.tab as ResourcesTab) : 'locations'
  })
})

function ResourcesPage() {
  useHeader({
    title: m.resources(),
    buttons: [<HelpButton key="help" docSlug="features/resources" variant="outline" size="sm-icon" />]
  })
  const { tenantId } = Route.useParams()
  const { tab: activeTab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const billingStatus = useAppStore((state) => state.billingStatus)

  const setActiveTab = (tab: ResourcesTab) => navigate({ search: { tab }, replace: true })

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  const tabTriggerClassName =
    'font-normal data-[state=active]:font-medium data-[state=active]:bg-sidebar-accent dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-none hover:bg-sidebar-accent dark:hover:bg-sidebar-accent cursor-pointer'

  return (
    <Tabs
      className="h-[calc(100svh-var(--header-height))] flex flex-col gap-0"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as ResourcesTab)}>
      <div className="w-full bg-background border-b border-border overflow-x-auto shrink-0 scrollbar-styled">
        <TabsList className="gap-2 h-12 p-2 rounded-none bg-background w-max">
          <TabsTrigger value="locations" className={tabTriggerClassName}>
            {m.locations()}
          </TabsTrigger>
          <TabsTrigger value="floors" className={tabTriggerClassName}>
            {m.floors()}
          </TabsTrigger>
          <TabsTrigger value="rooms" className={tabTriggerClassName}>
            {m.rooms()}
          </TabsTrigger>
          <TabsTrigger value="devices" className={tabTriggerClassName}>
            {m.devices()}
          </TabsTrigger>
          <TabsTrigger value="device-ports" className={tabTriggerClassName}>
            {m.ports()}
          </TabsTrigger>
          <TabsTrigger value="device-connections" className={tabTriggerClassName}>
            {m.connections()}
          </TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <TabsContent value="locations">
          <div className="p-4">
            <Suspense fallback={<Loader />}>
              <ResourceLocationsTab tenantId={tenantId} />
            </Suspense>
          </div>
        </TabsContent>
        <TabsContent value="floors">
          <div className="p-4">
            <Suspense fallback={<Loader />}>
              <ResourceFloorsTab tenantId={tenantId} />
            </Suspense>
          </div>
        </TabsContent>
        <TabsContent value="rooms">
          <div className="p-4">
            <Suspense fallback={<Loader />}>
              <ResourceRoomsTab tenantId={tenantId} />
            </Suspense>
          </div>
        </TabsContent>
        <TabsContent value="devices">
          <div className="p-4">
            <Suspense fallback={<Loader />}>
              <ResourceDevicesTab tenantId={tenantId} />
            </Suspense>
          </div>
        </TabsContent>
        <TabsContent value="device-ports">
          <div className="p-4">
            <Suspense fallback={<Loader />}>
              <ResourceDevicePortsTab tenantId={tenantId} />
            </Suspense>
          </div>
        </TabsContent>
        <TabsContent value="device-connections">
          <div className="p-4">
            <Suspense fallback={<Loader />}>
              <ResourceDeviceConnectionsTab tenantId={tenantId} />
            </Suspense>
          </div>
        </TabsContent>
      </ScrollArea>
    </Tabs>
  )
}
