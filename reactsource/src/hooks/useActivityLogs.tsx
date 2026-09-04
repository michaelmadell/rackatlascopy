import { useState, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { PaginationState, SortingState, ColumnDef, CellContext, HeaderContext, Row } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useAppStore } from '@/lib/app-store'
import { formatDateTime, getResourceNavigation, resourceTypeIcons, resourceTypeLabel } from '@/lib/utils'
import * as m from '@/paraglide/messages'
import type { EnrichedLogListItem, User } from '@/types'

const DEFAULT_ACTIONS = ['DB_CREATE', 'DB_UPDATE', 'DB_DELETE']

const RESOURCE_TYPE_KEYS: Record<string, string> = {
  tenant: 'tenants',
  location: 'locations',
  floor: 'floors',
  room: 'rooms',
  device: 'devices',
  vlan: 'vlans',
  wlan: 'wlans'
}

function formatAction(action: string): string {
  switch (action) {
    case 'DB_CREATE':
      return m.create()
    case 'DB_UPDATE':
      return m.update()
    case 'DB_DELETE':
      return m.delete()
    case 'AUTH_LOGIN':
      return m.auth_login()
    case 'AUTH_UPDATE':
      return m.auth_update()
    case 'AUTH_UPDATE_PW':
      return m.auth_update_pw()
    case 'AUTH_RESET_PW':
      return m.auth_reset_pw()
    default:
      return action
  }
}

interface UseActivityLogsOptions {
  logType?: 'tenantResources' | 'tenantAdmin' | 'customerAdmin'
  tenantId: string | undefined
  resourceId?: string
  resourceType?: string
  resourceTypes?: string[] // Array of resource types to filter by
  enableResourceFilters?: boolean // Enable resource type and specific resource filters
  availableActions?: string[] // Custom list of available actions
  enabled?: boolean // Control whether queries should run
}

export function useActivityLogs({
  logType = 'tenantResources',
  tenantId,
  resourceId,
  resourceType,
  resourceTypes,
  enableResourceFilters = false,
  availableActions,
  enabled = true
}: UseActivityLogsOptions) {
  const api = useAuthenticatedApi()
  const customer = useAppStore((state) => state.customer)
  const user = useAppStore((state) => state.user)
  const tenantUsers = useAppStore((state) => state.tenantUsers)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [actionFilter, setActionFilter] = useState<string[]>([])
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string[]>([])
  const [resourceFilter, setResourceFilter] = useState<string[]>([])
  const [userFilter, setUserFilter] = useState<string[]>([])

  const resourcesQuery = useQuery({
    queryKey: ['customer-resources-filtered-by-tenant', customer?._id, tenantId],
    queryFn: async () => {
      return api.get(`/customer/${customer?._id || '-'}/resources?tenantId=${tenantId || '-'}`).then((res) => {
        return res.data?.data
      })
    },
    enabled: enabled && enableResourceFilters && !!customer?._id && !!tenantId,
    staleTime: 0
  })

  const buildQueryParams = (page: number, limit: number, sort: string) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort
    })

    if (logType !== 'customerAdmin') {
      params.append('tenantId', tenantId || '')
    }

    if (resourceId) {
      params.append('resourceId', resourceId)
    }

    if (resourceType) {
      if (resourceType === 'device') {
        params.append('resource', '$in:device,device-connection')
      } else {
        params.append('resource', resourceType)
      }
    } else if (resourceTypes && resourceTypes.length > 0) {
      params.append('resource', `$in:${resourceTypes.join(',')}`)
    }

    if (dateRange.from && dateRange.to) {
      // Both dates: use date range
      const fromDate = new Date(dateRange.from)
      fromDate.setHours(0, 0, 0, 0)
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      params.append('createdAt', `$dateRange:${fromDate.toISOString()}_${toDate.toISOString()}`)
    } else if (dateRange.from) {
      // Only from date: use dateFrom
      const fromDate = new Date(dateRange.from)
      fromDate.setHours(0, 0, 0, 0)
      params.append('createdAt', `$dateFrom:${fromDate.toISOString()}`)
    } else if (dateRange.to) {
      // Only to date: use dateTo
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      params.append('createdAt', `$dateTo:${toDate.toISOString()}`)
    }

    if (actionFilter.length > 0) {
      params.append('action', `$in:${actionFilter.join(',')}`)
    } else if (availableActions && availableActions.length > 0) {
      params.append('action', `$in:${availableActions.join(',')}`)
    }

    if (resourceTypeFilter.length > 0) {
      params.append('resource', `$in:${resourceTypeFilter.join(',')}`)
    }

    if (resourceFilter.length > 0) {
      params.append('resourceId', `$in:${resourceFilter.join(',')}`)
    }

    if (userFilter.length > 0) {
      params.append('userId', `$in:${userFilter.join(',')}`)
    }

    return params
  }

  // Only createdAt sorting is server-side; other columns sort client-side via sortingFn
  const serverSort = useMemo(() => {
    const createdAtSort = sorting.find((s) => s.id === 'createdAt')
    return createdAtSort ? `${createdAtSort.desc ? '-' : ''}createdAt` : '-createdAt'
  }, [sorting])

  const logsQuery = useQuery({
    queryKey: [
      'logs',
      tenantId,
      resourceId,
      resourceType,
      resourceTypes,
      pagination,
      serverSort,
      dateRange,
      actionFilter,
      resourceTypeFilter,
      resourceFilter,
      userFilter
    ],
    queryFn: async () => {
      const params = buildQueryParams(pagination.pageIndex + 1, pagination.pageSize, serverSort)

      return api.get(`/log?${params.toString()}`).then((res) => {
        return res.data?.data
      })
    },
    enabled: enabled && !!tenantId,
    placeholderData: keepPreviousData,
    staleTime: 0
  })

  const fetchAllLogs = async () => {
    const params = buildQueryParams(1, 10000, serverSort)
    const response = await api.get(`/log?${params.toString()}`)
    return response.data.data.docs
  }

  const columns = useMemo<ColumnDef<EnrichedLogListItem>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: () => m.date_time(),
        footer: (props) => props.column.id,
        sortType: 'datetime',
        cell: ({ getValue }) => formatDateTime(getValue() as Date | string)
      },
      {
        accessorKey: 'action',
        header: () => m.action(),
        footer: (props) => props.column.id,
        cell: ({ getValue }) => formatAction(getValue() as string),
        sortingFn: (rowA, rowB) => {
          const a = formatAction(rowA.original.action)
          const b = formatAction(rowB.original.action)
          return a.localeCompare(b)
        }
      },
      ...(resourceId && resourceType !== 'device'
        ? []
        : [
            {
              accessorKey: 'resource' as const,
              header: () => m.resource_type(),
              footer: (props: HeaderContext<EnrichedLogListItem, unknown>) => props.column.id,
              cell: ({ getValue }: CellContext<EnrichedLogListItem, unknown>) => {
                const resourceType = getValue() as string
                return resourceTypeLabel(resourceType)
              },
              sortingFn: (rowA: Row<EnrichedLogListItem>, rowB: Row<EnrichedLogListItem>) => {
                const a = resourceTypeLabel(rowA.original.resource)
                const b = resourceTypeLabel(rowB.original.resource)
                return a.localeCompare(b)
              }
            },
            {
              accessorKey: 'resourceId' as const,
              header: () => m.resource(),
              footer: (props: HeaderContext<EnrichedLogListItem, unknown>) => props.column.id,
              sortingFn: (rowA: Row<EnrichedLogListItem>, rowB: Row<EnrichedLogListItem>) => {
                const getDisplay = (log: EnrichedLogListItem) => {
                  if (log.resource === 'device-connection') {
                    const d1 = log.resourceData?.device1FullReference || '-'
                    const d2 = log.resourceData?.device2FullReference || '-'
                    return `${d1} - ${d2}`
                  }
                  if (log.resource === 'wlan') return log.resourceData?.ssid || log.resourceId || '-'
                  return (
                    log.resourceData?.fullReference ||
                    log.resourceData?.reference ||
                    log.resourceData?.name ||
                    log.resourceId ||
                    '-'
                  )
                }
                return getDisplay(rowA.original).localeCompare(getDisplay(rowB.original))
              },
              cell: ({ row }: CellContext<EnrichedLogListItem, unknown>) => {
                const log = row.original
                const Icon = resourceTypeIcons[log.resource]

                // Special handling for device-connection
                if (log.resource === 'device-connection') {
                  const device1Ref = log.resourceData?.device1FullReference || '-'
                  const device2Ref = log.resourceData?.device2FullReference || '-'

                  // Check if each device is deleted
                  const device1Id = log.resourceData?.device1Id
                  const device2Id = log.resourceData?.device2Id
                  const device1Deleted = !device1Id || log.resourceData?.device1Data?.deletedAt
                  const device2Deleted = !device2Id || log.resourceData?.device2Data?.deletedAt

                  // If both devices are deleted or missing, show as plain text
                  if (device1Deleted && device2Deleted) {
                    return `${device1Ref} - ${device2Ref}`
                  }

                  // Create navigation for device 1 if not deleted
                  let device1Nav = null
                  if (!device1Deleted) {
                    device1Nav = getResourceNavigation(
                      {
                        type: 'device',
                        _id: device1Id,
                        locationId: log.resourceData?.device1Data?.locationId || undefined,
                        floorId: log.resourceData?.device1Data?.floorId || undefined,
                        rackDeviceId: log.resourceData?.device1Data?.rackDeviceId || undefined,
                        deviceType: log.resourceData?.device1Data?.deviceType || undefined
                      },
                      tenantId
                    )
                  }

                  // Create navigation for device 2 if not deleted
                  let device2Nav = null
                  if (!device2Deleted) {
                    device2Nav = getResourceNavigation(
                      {
                        type: 'device',
                        _id: device2Id,
                        locationId: log.resourceData?.device2Data?.locationId || undefined,
                        floorId: log.resourceData?.device2Data?.floorId || undefined,
                        rackDeviceId: log.resourceData?.device2Data?.rackDeviceId || undefined,
                        deviceType: log.resourceData?.device2Data?.deviceType || undefined
                      },
                      tenantId
                    )
                  }

                  // Render device 1
                  const device1Element = device1Nav ? (
                    <Link
                      to={device1Nav.to}
                      params={device1Nav.params as Record<string, string>}
                      search={
                        'search' in device1Nav ? (device1Nav.search as unknown as Record<string, string>) : undefined
                      }
                      className="text-primary hover:underline">
                      {device1Ref}
                    </Link>
                  ) : (
                    device1Ref
                  )

                  // Render device 2
                  const device2Element = device2Nav ? (
                    <Link
                      to={device2Nav.to}
                      params={device2Nav.params as Record<string, string>}
                      search={
                        'search' in device2Nav ? (device2Nav.search as unknown as Record<string, string>) : undefined
                      }
                      className="text-primary hover:underline">
                      {device2Ref}
                    </Link>
                  ) : (
                    device2Ref
                  )

                  return (
                    <>
                      {device1Element}
                      {' - '}
                      {device2Element}
                    </>
                  )
                }

                let displayValue =
                  log.resourceData?.fullReference ||
                  log.resourceData?.reference ||
                  log.resourceData?.name ||
                  log.resourceId ||
                  '-'

                if (log.resource === 'wlan') {
                  displayValue = log.resourceData?.ssid || log.resourceId || '-'
                }

                if (
                  !log.resourceData ||
                  log.resourceData?.deletedAt ||
                  ['user', 'tenant'].includes(log.resource) ||
                  log.action === 'DB_DELETE'
                ) {
                  return (
                    <span className="inline-flex items-center gap-1.5">
                      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                      {displayValue}
                    </span>
                  )
                }

                const navigation = getResourceNavigation(
                  {
                    type: log.resource,
                    _id: log.resourceId,
                    locationId: log.resourceData?.locationId || undefined,
                    floorId: log.resourceData?.floorId || undefined,
                    rackDeviceId: log.resourceData?.rackDeviceId || undefined,
                    deviceType: log.resourceData?.deviceType || undefined
                  },
                  tenantId
                )

                if (!navigation) {
                  return (
                    <span className="inline-flex items-center gap-1.5">
                      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                      {displayValue}
                    </span>
                  )
                }

                return (
                  <span className="inline-flex items-center gap-1.5">
                    {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                    <Link
                      to={navigation.to}
                      params={navigation.params as Record<string, string>}
                      search={
                        'search' in navigation ? (navigation.search as unknown as Record<string, string>) : undefined
                      }
                      className="text-primary hover:underline">
                      {displayValue}
                    </Link>
                  </span>
                )
              }
            }
          ]),
      {
        accessorKey: 'userId',
        header: () => m.user(),
        footer: (props) => props.column.id,
        cell: ({ getValue }) => {
          const userId = getValue() as {
            _id: string
            email: string
          }
          return userId?.email || '-'
        },
        sortingFn: (rowA, rowB) => {
          const a = (rowA.original.userId as { email?: string })?.email || '-'
          const b = (rowB.original.userId as { email?: string })?.email || '-'
          return a.localeCompare(b)
        }
      }
    ],
    [tenantId, resourceId, resourceType]
  )

  const actionOptions = useMemo(
    () =>
      (availableActions || DEFAULT_ACTIONS).map((action) => ({
        label: formatAction(action),
        value: action
      })),
    [availableActions]
  )

  const userOptions = useMemo(
    () =>
      (tenantUsers || [])
        .filter((u: Partial<User>) => u.email && u._id)
        .map((u: Partial<User>) => ({
          label: u.email as string,
          value: u._id as string
        })),
    [tenantUsers]
  )

  const resourceTypeOptions = useMemo(() => {
    if (!enableResourceFilters) return []

    const AVAILABLE_RESOURCE_TYPES = [
      'tenant',
      'location',
      'floor',
      'room',
      'device',
      'device-connection',
      'vlan',
      'wlan'
    ]
    const isTenantAdmin =
      user?.permissions?.some(
        (permission) =>
          permission.resourceType === 'customer' &&
          permission.resourceId === customer?._id &&
          permission.role === 'admin'
      ) ||
      user?.permissions?.some(
        (permission) =>
          permission.resourceType === 'tenant' && permission.role === 'admin' && permission.resourceId === tenantId
      )

    return AVAILABLE_RESOURCE_TYPES.filter((type) => type !== 'tenant' || isTenantAdmin).map((type) => ({
      label: resourceTypeLabel(type),
      value: type
    }))
  }, [enableResourceFilters, user, customer, tenantId])

  const resourceOptions = useMemo(() => {
    if (!enableResourceFilters || !resourcesQuery.data) return []

    const resources = resourcesQuery.data

    // Flatten all resources (server already filtered by tenantId)
    const flatResources: Array<{ _id: string; displayName: string; type: string }> = []

    for (const [type, key] of Object.entries(RESOURCE_TYPE_KEYS)) {
      if (resources[key]) {
        for (const resource of resources[key]) {
          let displayName = resource.fullReference || resource.reference
          if (type === 'vlan') displayName = resource.name
          if (type === 'wlan') displayName = resource.ssid

          flatResources.push({
            _id: resource._id,
            displayName,
            type
          })
        }
      }
    }

    // Sort alphabetically by displayName
    flatResources.sort((a, b) => a.displayName.localeCompare(b.displayName))

    // Map to options
    return flatResources.map((resource) => ({
      label: resource.displayName,
      value: resource._id,
      icon: resourceTypeIcons[resource.type]
    }))
  }, [enableResourceFilters, resourcesQuery.data])

  return {
    // Data
    logsQuery,
    resourcesQuery,
    fetchAllLogs,

    // Table state
    pagination,
    setPagination,
    sorting,
    setSorting,

    // Filters
    dateRange,
    setDateRange,
    actionFilter,
    setActionFilter,
    resourceTypeFilter,
    setResourceTypeFilter,
    resourceFilter,
    setResourceFilter,
    userFilter,
    setUserFilter,

    // Options
    actionOptions,
    userOptions,
    resourceTypeOptions,
    resourceOptions,

    // Columns
    columns
  }
}
