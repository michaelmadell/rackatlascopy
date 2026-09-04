import { useMemo, useCallback } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, type FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { usePostHog } from 'posthog-js/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  MultiSelect,
  Label,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@patchdocs/ui'
import { TbFileDownload } from 'react-icons/tb'
import { mkConfig, generateCsv, download } from 'export-to-csv'
import { useActivityLogs } from '@/hooks/useActivityLogs.tsx'
import DataTableControlled from '@/components/table/DataTableControlled'
import DateFilter from '@/components/common/DateFilter'
import Loader from '@/components/common/Loader'
import ErrorPage from '@/components/common/ErrorPage'
import { toast } from 'sonner'
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

interface ActivityLogDialogProps {
  open: boolean
  onClose: () => void
  tenantId: string
  resourceId: string
  resourceType: string
  resourceReference?: string
}

const ActivityLogDialog = ({
  open,
  onClose,
  tenantId,
  resourceId,
  resourceType,
  resourceReference
}: ActivityLogDialogProps) => {
  const posthog = usePostHog()

  const csvColumnHeaders = useMemo(
    () => [
      { key: 'createdAt', displayLabel: m.date_time() },
      { key: 'action', displayLabel: m.action() },
      { key: 'resource', displayLabel: m.resource_type() },
      { key: 'resourceId', displayLabel: m.resource() },
      { key: 'userId', displayLabel: m.user() }
    ],
    []
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
    userFilter,
    setUserFilter,
    actionOptions,
    userOptions,
    columns
  } = useActivityLogs({
    tenantId,
    resourceId,
    resourceType,
    availableActions: ['DB_CREATE', 'DB_UPDATE', 'DB_DELETE'],
    enabled: open
  })

  const handleDateFromChange = (date: Date | undefined) => {
    setDateRange({ ...dateRange, from: date })
    if (date) {
      posthog?.capture('activity_log:filtered_by_date_from', {
        source: 'resource_dialog',
        resource_type: resourceType
      })
    }
  }

  const handleDateToChange = (date: Date | undefined) => {
    setDateRange({ ...dateRange, to: date })
    if (date) {
      posthog?.capture('activity_log:filtered_by_date_to', {
        source: 'resource_dialog',
        resource_type: resourceType
      })
    }
  }

  const handleActionFilterChange = (value: string[]) => {
    setActionFilter(value)
    if (value.length > 0) {
      posthog?.capture('activity_log:filtered_by_action', {
        source: 'resource_dialog',
        resource_type: resourceType
      })
    }
  }

  const handleUserFilterChange = (value: string[]) => {
    setUserFilter(value)
    if (value.length > 0) {
      posthog?.capture('activity_log:filtered_by_user', {
        source: 'resource_dialog',
        resource_type: resourceType
      })
    }
  }

  const defaultData: EnrichedLogListItem[] = []

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

  const handleExportPage = useCallback(() => {
    try {
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
      const allLogs = await fetchAllLogs()
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

  const dialogTitle = resourceReference ? `${m.activity_log()}: ${resourceReference}` : m.activity_log()

  if (logsQuery.error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-5xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription className="sr-only">Activity log for this resource</DialogDescription>
          </DialogHeader>
          <ErrorPage error={logsQuery.error} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="sr-only">Activity log for this resource</DialogDescription>
        </DialogHeader>

        {logsQuery.isPending ? (
          <Loader />
        ) : (
          <div className="flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
            <div className="flex items-end justify-between gap-3 pt-2">
              <div className="flex gap-3 md:gap-4 flex-wrap">
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
                    maxCount={1}
                    minWidth="160px"
                  />
                </div>

                <div className="min-w-48 sm:min-w-60 space-y-1">
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
                  <Button variant="outline" size="sm-icon">
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

            <div className="overflow-auto flex-1 min-h-0">
              <DataTableControlled table={table} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ActivityLogDialog
