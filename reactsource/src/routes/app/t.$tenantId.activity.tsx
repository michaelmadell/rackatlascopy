import { useMemo, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useReactTable, getCoreRowModel, getSortedRowModel, type FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  ScrollArea,
  Card,
  MultiSelect,
  Label,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@patchdocs/ui'
import { TbFileDownload } from 'react-icons/tb'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { useHeader } from '@/hooks/useHeader'
import HelpButton from '@/components/common/HelpButton'
import { useActivityLogs } from '@/hooks/useActivityLogs.tsx'
import { useAppStore } from '@/lib/app-store'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import DataTableControlled from '@/components/table/DataTableControlled'
import DateFilter from '@/components/common/DateFilter'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import type { EnrichedLogListItem } from '@/types'

// Dummy fuzzy filter (required by module augmentation but not used)
const fuzzyFilter: FilterFn<EnrichedLogListItem> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const formatLogForCsv = (log: EnrichedLogListItem) => {
  let resource = ''

  // Handle device-connection special case
  if (log.resource === 'device-connection') {
    const device1Ref = log.resourceData?.device1FullReference || '-'
    const device2Ref = log.resourceData?.device2FullReference || '-'
    resource = `${device1Ref} - ${device2Ref}`
  } else {
    resource =
      log.resourceData?.fullReference || log.resourceData?.reference || log.resourceData?.name || log.resourceId || '-'
  }

  return {
    createdAt: new Date(log.createdAt).toISOString(),
    action: log.action,
    resource: log.resource,
    resourceId: resource,
    userId: log.userId?.email || '-'
  }
}

export const Route = createFileRoute('/app/t/$tenantId/activity')({
  component: ActivityPage
})

function ActivityPage() {
  useHeader({
    title: m.activity_log(),
    buttons: [<HelpButton key="help" docSlug="features/activity-log" variant="outline" size="sm-icon" />]
  })
  const { tenantId } = Route.useParams()
  const billingStatus = useAppStore((state) => state.billingStatus)
  const posthog = usePostHog()
  const locale = getLocale()

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to rerender when locale changes
  const csvColumnHeaders = useMemo(
    () => [
      { key: 'createdAt', displayLabel: m.date_time() },
      { key: 'action', displayLabel: m.action() },
      { key: 'resource', displayLabel: m.resource_type() },
      { key: 'resourceId', displayLabel: m.resource() },
      { key: 'userId', displayLabel: m.user() }
    ],
    [locale]
  )

  const {
    logsQuery,
    fetchAllLogs,
    pagination,
    setPagination,
    sorting,
    setSorting,
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
    actionOptions,
    resourceTypeOptions,
    resourceOptions,
    userOptions,
    columns
  } = useActivityLogs({
    tenantId,
    enableResourceFilters: true,
    enabled: billingStatus !== 'blocked'
  })

  const handleDateFromChange = useCallback(
    (date: Date | undefined) => {
      setDateRange((prev) => ({ ...prev, from: date }))
      if (date) posthog?.capture('activity_log:filtered_by_date_from', { source: 'tenant_activity_log_page' })
    },
    [setDateRange, posthog]
  )

  const handleDateToChange = useCallback(
    (date: Date | undefined) => {
      setDateRange((prev) => ({ ...prev, to: date }))
      if (date) posthog?.capture('activity_log:filtered_by_date_to', { source: 'tenant_activity_log_page' })
    },
    [setDateRange, posthog]
  )

  const makeFilterHandler = useCallback(
    (setter: (v: string[]) => void, eventName: string) => (value: string[]) => {
      setter(value)
      if (value.length > 0) posthog?.capture(eventName, { source: 'tenant_activity_log_page' })
    },
    [posthog]
  )

  const handleActionFilterChange = useMemo(
    () => makeFilterHandler(setActionFilter, 'activity_log:filtered_by_action'),
    [makeFilterHandler, setActionFilter]
  )
  const handleResourceTypeFilterChange = useMemo(
    () => makeFilterHandler(setResourceTypeFilter, 'activity_log:filtered_by_resource_type'),
    [makeFilterHandler, setResourceTypeFilter]
  )
  const handleResourceFilterChange = useMemo(
    () => makeFilterHandler(setResourceFilter, 'activity_log:filtered_by_resource'),
    [makeFilterHandler, setResourceFilter]
  )
  const handleUserFilterChange = useMemo(
    () => makeFilterHandler(setUserFilter, 'activity_log:filtered_by_user'),
    [makeFilterHandler, setUserFilter]
  )

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: logsQuery.data?.docs ?? defaultData,
    columns,
    rowCount: logsQuery.data?.totalDocs,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      pagination,
      sorting
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    manualPagination: true
  })

  const handleExportPage = useCallback(async () => {
    try {
      const { mkConfig, generateCsv, download } = await import('export-to-csv')
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_activity_log_currentpage_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = table.getRowModel().rows.map((row) => formatLogForCsv(row.original))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_page', { resourceType: 'activity_log' })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'activity_log' })
    }
  }, [table, csvColumnHeaders, posthog])

  const handleExportAll = useCallback(async () => {
    try {
      const [allLogs, { mkConfig, generateCsv, download }] = await Promise.all([
        fetchAllLogs(),
        import('export-to-csv')
      ])
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_activity_log_all_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = allLogs.map((log: EnrichedLogListItem) => formatLogForCsv(log))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_all', { resourceType: 'activity_log' })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'activity_log' })
    }
  }, [fetchAllLogs, csvColumnHeaders, posthog])

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (logsQuery.error) {
    return <ErrorPage error={logsQuery.error} />
  }

  if (logsQuery.isPending) {
    return <Loader />
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <div className="p-4">
          <Card className="rounded-lg pt-3 gap-3">
            <div className="flex items-end justify-between gap-3 px-3">
              <div className="flex gap-2 sm:gap-4 flex-wrap">
                <div className="min-w-32 sm:min-w-40 space-y-1">
                  <Label className="text-xs font-semibold">{m.date_from()}</Label>
                  <DateFilter
                    selected={dateRange.from}
                    onSelect={handleDateFromChange}
                    disabled={(date) => (dateRange.to ? date > dateRange.to : false)}
                  />
                </div>

                <div className="min-w-32 sm:min-w-40 space-y-1">
                  <Label className="text-xs font-semibold">{m.date_to()}</Label>
                  <DateFilter
                    selected={dateRange.to}
                    onSelect={handleDateToChange}
                    disabled={(date) => (dateRange.from ? date < dateRange.from : false)}
                  />
                </div>

                <div className="min-w-32 sm:min-w-40 space-y-1">
                  <Label htmlFor="action" className="text-xs font-semibold">
                    {m.action()}
                  </Label>
                  <MultiSelect
                    options={actionOptions}
                    value={actionFilter}
                    onValueChange={handleActionFilterChange}
                    placeholder={m.select_filter()}
                    emptyIndicator={m.command_no_results()}
                    commandInputPlaceholder={m.combobox_search_placeholder()}
                    selectAllLabel={m.select_all()}
                    clearLabel={m.clear()}
                    closeLabel={m.close()}
                    hideSelectAll={true}
                    responsive={true}
                    minWidth="160px"
                    maxCount={1}
                  />
                </div>

                <div className="min-w-32 sm:min-w-40 space-y-1">
                  <Label htmlFor="resourceType" className="text-xs font-semibold">
                    {m.resource_type()}
                  </Label>
                  <MultiSelect
                    options={resourceTypeOptions}
                    value={resourceTypeFilter}
                    onValueChange={handleResourceTypeFilterChange}
                    placeholder={m.select_filter()}
                    emptyIndicator={m.command_no_results()}
                    commandInputPlaceholder={m.combobox_search_placeholder()}
                    selectAllLabel={m.select_all()}
                    clearLabel={m.clear()}
                    closeLabel={m.close()}
                    hideSelectAll={true}
                    responsive={true}
                    minWidth="160px"
                    maxCount={1}
                  />
                </div>

                <div className="min-w-60 space-y-1">
                  <Label htmlFor="resource" className="text-xs font-semibold">
                    {m.resource()}
                  </Label>
                  <MultiSelect
                    options={resourceOptions}
                    value={resourceFilter}
                    onValueChange={handleResourceFilterChange}
                    placeholder={m.select_filter()}
                    emptyIndicator={m.command_no_results()}
                    commandInputPlaceholder={m.combobox_search_placeholder()}
                    selectAllLabel={m.select_all()}
                    clearLabel={m.clear()}
                    closeLabel={m.close()}
                    hideSelectAll={true}
                    responsive={true}
                    maxCount={1}
                  />
                </div>

                <div className="min-w-60 space-y-1">
                  <Label htmlFor="user" className="text-xs font-semibold">
                    {m.user()}
                  </Label>
                  <MultiSelect
                    options={userOptions}
                    value={userFilter}
                    onValueChange={handleUserFilterChange}
                    placeholder={m.select_filter()}
                    emptyIndicator={m.command_no_results()}
                    commandInputPlaceholder={m.combobox_search_placeholder()}
                    selectAllLabel={m.select_all()}
                    clearLabel={m.clear()}
                    closeLabel={m.close()}
                    hideSelectAll={true}
                    responsive={true}
                    maxCount={1}
                  />
                </div>
              </div>
              <DropdownMenu key="more">
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm-icon" disabled={billingStatus === 'read_only'}>
                    <TbFileDownload />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-36">
                  <DropdownMenuItem className="text-[13px] cursor-pointer" onClick={handleExportPage}>
                    {m.export_page_as_csv()}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[13px] cursor-pointer" onClick={handleExportAll}>
                    {m.export_all_10k_as_csv()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DataTableControlled table={table} />
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
