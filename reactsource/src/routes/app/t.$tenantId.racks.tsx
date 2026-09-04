import { useMemo, useState, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type CellContext,
  type PaginationState,
  type SortingState,
  type FilterFn
} from '@tanstack/react-table'
import { type RankingInfo, rankItem } from '@tanstack/match-sorter-utils'
import {
  ScrollArea,
  Card,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@patchdocs/ui'
import { TbFileDownload } from 'react-icons/tb'
import { mkConfig, generateCsv, download } from 'export-to-csv'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeader } from '@/hooks/useHeader'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import DataTableControlled from '@/components/table/DataTableControlled'
import DebouncedInput from '@/components/common/DebouncedInput'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import { useAppStore } from '@/lib/app-store'
import { formatDateTime, getResourceNavigation } from '@/lib/utils'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import type { Device, Location, Floor, Room } from '@/types'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<Device> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

export const Route = createFileRoute('/app/t/$tenantId/racks')({
  component: RacksPage
})

function RacksPage() {
  useHeader({ title: m.racks() })
  const { tenantId } = Route.useParams()
  const api = useAuthenticatedApi()
  const posthog = usePostHog()
  const locale = getLocale()
  const billingStatus = useAppStore((state) => state.billingStatus)
  const readOnly = billingStatus === 'read_only'
  const enabled = billingStatus !== 'blocked'
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const locationsQuery = useQuery({
    queryKey: ['rack-locations', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenant/${tenantId}/location?limit=1000&select=_id,fullReference,name`)
      return (res.data?.data?.docs ?? []) as Pick<Location, '_id' | 'fullReference' | 'name'>[]
    },
    enabled
  })

  const floorsQuery = useQuery({
    queryKey: ['rack-floors', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenant/${tenantId}/floor?limit=10000&select=_id,fullReference,name,locationId`)
      return (res.data?.data?.docs ?? []) as Pick<Floor, '_id' | 'fullReference' | 'name' | 'locationId'>[]
    },
    enabled
  })

  const roomsQuery = useQuery({
    queryKey: ['rack-rooms', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenant/${tenantId}/room?limit=10000&select=_id,fullReference,name,locationId,floorId`)
      return (res.data?.data?.docs ?? []) as Pick<Room, '_id' | 'fullReference' | 'name' | 'locationId' | 'floorId'>[]
    },
    enabled
  })

  const locationMap = useMemo(() => new Map((locationsQuery.data ?? []).map((l) => [l._id, l])), [locationsQuery.data])
  const floorMap = useMemo(() => new Map((floorsQuery.data ?? []).map((f) => [f._id, f])), [floorsQuery.data])
  const roomMap = useMemo(() => new Map((roomsQuery.data ?? []).map((r) => [r._id, r])), [roomsQuery.data])

  const racksQuery = useQuery({
    queryKey: ['racks', tenantId, pagination, sorting],
    queryFn: () => {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : '-createdAt'
      return api
        .get(
          `/tenant/${tenantId}/device?deviceType=rack&deletedAt=null&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&sort=${sortValue}`
        )
        .then((res) => res.data)
    },
    placeholderData: keepPreviousData,
    enabled
  })

  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      {
        accessorKey: 'fullReference',
        header: () => m.id(),
        cell: ({ row }: CellContext<Device, unknown>) => {
          const rack = row.original
          const nav = getResourceNavigation(
            { type: 'device', _id: rack._id, locationId: rack.locationId, deviceType: 'rack' },
            tenantId
          )
          if (!nav) return rack.fullReference || '-'
          return (
            <Link to={nav.to} params={nav.params as Record<string, string>} className="text-primary hover:underline">
              {rack.fullReference || '-'}
            </Link>
          )
        }
      },
      {
        accessorKey: 'name',
        header: () => m.name(),
        cell: ({ getValue }: CellContext<Device, unknown>) => (getValue() as string) || '-'
      },
      {
        id: 'locationId',
        accessorFn: (row) => locationMap.get(row.locationId)?.fullReference ?? '',
        header: () => m.location(),
        enableSorting: false,
        cell: ({ row, getValue }: CellContext<Device, unknown>) => {
          const label = getValue() as string
          if (!label) return '-'
          const nav = getResourceNavigation({ type: 'location', _id: row.original.locationId }, tenantId)
          if (!nav) return label
          return (
            <Link to={nav.to} params={nav.params as Record<string, string>} className="text-primary hover:underline">
              {label}
            </Link>
          )
        }
      },
      {
        id: 'floorId',
        accessorFn: (row) => floorMap.get(row.floorId)?.fullReference ?? '',
        header: () => m.floor(),
        enableSorting: false,
        cell: ({ row, getValue }: CellContext<Device, unknown>) => {
          const floor = floorMap.get(row.original.floorId)
          if (!floor) return '-'
          const label = (getValue() as string) || '-'
          const nav = getResourceNavigation({ type: 'floor', _id: floor._id, locationId: floor.locationId }, tenantId)
          if (!nav) return label
          return (
            <Link
              to={nav.to}
              params={nav.params as Record<string, string>}
              search={'search' in nav ? (nav.search as unknown as Record<string, string>) : undefined}
              className="text-primary hover:underline">
              {label}
            </Link>
          )
        }
      },
      {
        id: 'roomId',
        accessorFn: (row) => roomMap.get(row.roomId)?.fullReference ?? '',
        header: () => m.room(),
        enableSorting: false,
        cell: ({ row, getValue }: CellContext<Device, unknown>) => {
          const room = roomMap.get(row.original.roomId)
          if (!room) return '-'
          const label = (getValue() as string) || '-'
          const nav = getResourceNavigation(
            { type: 'room', _id: room._id, locationId: room.locationId, floorId: room.floorId },
            tenantId
          )
          if (!nav) return label
          return (
            <Link
              to={nav.to}
              params={nav.params as Record<string, string>}
              search={'search' in nav ? (nav.search as unknown as Record<string, string>) : undefined}
              className="text-primary hover:underline">
              {label}
            </Link>
          )
        }
      },
      {
        accessorKey: 'rackUnitsCount',
        header: () => m.rack_units(),
        enableSorting: false,
        cell: ({ getValue }: CellContext<Device, unknown>) => {
          const val = getValue() as number | undefined
          return val !== undefined && val !== null ? val : '-'
        }
      },
      {
        accessorKey: 'createdAt',
        header: () => m.created_at(),
        cell: ({ getValue }: CellContext<Device, unknown>) => formatDateTime(getValue() as Date | string)
      },
      {
        accessorKey: 'updatedAt',
        header: () => m.updated_at(),
        cell: ({ getValue }: CellContext<Device, unknown>) => formatDateTime(getValue() as Date | string)
      }
    ],
    [tenantId, locationMap, floorMap, roomMap]
  )

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: racksQuery.data?.data?.docs ?? defaultData,
    columns,
    rowCount: racksQuery.data?.data?.totalDocs,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      pagination,
      sorting,
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'fuzzy',
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    manualPagination: true
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to rerender when locale changes
  const csvColumnHeaders = useMemo(
    () => [
      { key: 'fullReference', displayLabel: m.id() },
      { key: 'name', displayLabel: m.name() },
      { key: 'location', displayLabel: m.location() },
      { key: 'floor', displayLabel: m.floor() },
      { key: 'room', displayLabel: m.room() },
      { key: 'rackUnitsCount', displayLabel: m.rack_units() },
      { key: 'createdAt', displayLabel: m.created_at() },
      { key: 'updatedAt', displayLabel: m.updated_at() }
    ],
    [locale]
  )

  const formatRackForCsv = useCallback(
    (rack: Device) => ({
      fullReference: rack.fullReference ?? '',
      name: rack.name ?? '',
      location: locationMap.get(rack.locationId)?.fullReference ?? '',
      floor: floorMap.get(rack.floorId)?.fullReference ?? '',
      room: roomMap.get(rack.roomId)?.fullReference ?? '',
      rackUnitsCount: rack.rackUnitsCount ?? '',
      createdAt: new Date(rack.createdAt).toISOString(),
      updatedAt: rack.updatedAt ? new Date(rack.updatedAt).toISOString() : ''
    }),
    [locationMap, floorMap, roomMap]
  )

  const handleExportPage = useCallback(() => {
    try {
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_racks_currentpage_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = table.getRowModel().rows.map((row) => formatRackForCsv(row.original))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_page', { resourceType: 'rack', tenantId })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'rack', tenantId })
    }
  }, [table, csvColumnHeaders, formatRackForCsv, posthog, tenantId])

  const handleExportAll = useCallback(async () => {
    try {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : '-createdAt'
      const response = await api.get(
        `/tenant/${tenantId}/device?deviceType=rack&deletedAt=null&limit=10000&sort=${sortValue}`
      )
      const allRacks = (response.data?.data?.docs ?? []) as Device[]
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_racks_all_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const csv = generateCsv(csvConfig)(allRacks.map(formatRackForCsv))
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_all', { resourceType: 'rack', tenantId })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'rack', tenantId })
    }
  }, [api, tenantId, sorting, csvColumnHeaders, formatRackForCsv, posthog])

  if (billingStatus === 'blocked') return <BlockedPageAccess />
  if (racksQuery.error) return <ErrorPage error={racksQuery.error} />
  // maps must be loaded before rows are built: TanStack caches accessorFn values per row
  if (racksQuery.isPending || locationsQuery.isPending || floorsQuery.isPending || roomsQuery.isPending)
    return <Loader />

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <div className="p-4">
          <Card className="rounded-lg pt-3 gap-3">
            <div className="flex justify-end px-3">
              <div className="flex items-center gap-3">
                {(racksQuery.data.data?.totalDocs ?? 0) > 0 ? (
                  <DropdownMenu key="export">
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm-icon" disabled={readOnly}>
                        <TbFileDownload />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-36">
                      <DropdownMenuItem className="text-[13px] cursor-pointer" onClick={handleExportPage}>
                        {m.export_page_as_csv()}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-[13px] cursor-pointer" onClick={handleExportAll}>
                        {m.export_all_as_csv()}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <DebouncedInput
                  value={globalFilter ?? ''}
                  onChange={(value) => setGlobalFilter(String(value))}
                  className="h-7 md:h-9 w-40 md:w-50"
                  placeholder={`${m.search()}...`}
                />
              </div>
            </div>
            <DataTableControlled table={table} />
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
