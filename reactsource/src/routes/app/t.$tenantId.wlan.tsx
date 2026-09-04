import { useEffect, useState, useMemo, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
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
  DropdownMenuItem,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@patchdocs/ui'
import { TbPlus, TbEdit, TbTrash, TbLoader2, TbFileDownload, TbEyeOff, TbDevices, TbNotes } from 'react-icons/tb'
import { mkConfig, generateCsv, download } from 'export-to-csv'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import HelpButton from '@/components/common/HelpButton'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAppStore } from '@/lib/app-store'
import { isUserAdminOfCurrentTenant, formatDateTime } from '@/lib/utils'
import DataTableControlled from '@/components/table/DataTableControlled'
import DebouncedInput from '@/components/common/DebouncedInput'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import WlanCreateDialog from '@/components/wlan/WlanCreateDialog'
import WlanEditDialog from '@/components/wlan/WlanEditDialog'
import WlanDevicesDialog from '@/components/wlan/WlanDevicesDialog'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import NoteEditorDialogMdx from '@/components/dialogs/NoteEditorDialogMdx'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import type { Wlan } from '@/types'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<Wlan> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const formatWlanForCsv = (wlan: Wlan) => ({
  ssid: wlan.ssid,
  description: wlan.description || '',
  vlan: wlan.vlan?.networkNumber ? `${wlan.vlan.networkNumber} - ${wlan.vlan.name}` : '',
  hidden: wlan.hidden ? 'Yes' : 'No',
  createdAt: new Date(wlan.createdAt).toISOString(),
  updatedAt: wlan.updatedAt ? new Date(wlan.updatedAt).toISOString() : ''
})

export const Route = createFileRoute('/app/t/$tenantId/wlan')({
  component: WlansPage
})

function WlansPage() {
  const { setConfig } = useHeaderConfig()
  const { tenantId } = Route.useParams()
  const posthog = usePostHog()
  const locale = getLocale()
  const api = useAuthenticatedApi()
  const billingStatus = useAppStore((state) => state.billingStatus)
  const readOnly = billingStatus === 'read_only'
  const user = useAppStore((state) => state.user)
  const activeTenant = useAppStore((state) => state.activeTenant)
  const isTenantAdmin = isUserAdminOfCurrentTenant(user, activeTenant)
  const canWrite = isTenantAdmin && !readOnly
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedWlan, setSelectedWlan] = useState<Wlan | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [wlanToDelete, setWlanToDelete] = useState<Wlan | null>(null)
  const [isDevicesDialogOpen, setIsDevicesDialogOpen] = useState(false)
  const [wlanForDevices, setWlanForDevices] = useState<Wlan | null>(null)
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [wlanForNotes, setWlanForNotes] = useState<Wlan | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to rerender when locale changes
  const csvColumnHeaders = useMemo(
    () => [
      { key: 'ssid', displayLabel: 'SSID' },
      { key: 'description', displayLabel: m.description() },
      { key: 'vlan', displayLabel: m.vlan() },
      { key: 'hidden', displayLabel: m.hidden() },
      { key: 'createdAt', displayLabel: m.created_at() },
      { key: 'updatedAt', displayLabel: m.updated_at() }
    ],
    [locale]
  )

  useEffect(() => {
    setConfig({
      title: m.wlan(),
      buttons: [
        ...(isTenantAdmin && billingStatus !== 'blocked'
          ? [
              <Button
                key="add"
                size={isMobile ? 'sm-icon' : 'sm'}
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={!canWrite}>
                <TbPlus />
                <span className="hidden md:inline">{m.add_wlan()}</span>
              </Button>
            ]
          : []),
        <HelpButton key="help" docSlug="features/networks#wlans" variant="outline" size="sm-icon" />
      ]
    })
    return () => setConfig(null)
  }, [setConfig, isTenantAdmin, billingStatus, canWrite, isMobile])

  const wlansQuery = useQuery({
    queryKey: ['wlans', tenantId, pagination, sorting],
    queryFn: () => {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : 'createdAt'
      return api
        .get(`/tenant/${tenantId}/wlan?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&sort=${sortValue}`)
        .then((res) => {
          return res.data
        })
    },
    placeholderData: keepPreviousData,
    enabled: billingStatus !== 'blocked'
  })

  const createWlanMutation = useMutation({
    mutationFn: async (wlanData: { ssid: string; description?: string; vlanId?: string; hidden: boolean }) => {
      const response = await api.post(`/tenant/${tenantId}/wlan`, wlanData)
      return response.data.data
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['wlans', tenantId] })
      toast.success(`${m.wlan()} ${m.created().toLowerCase()}`)
    }
  })

  const updateWlanMutation = useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string
      data: { ssid: string; description?: string; vlanId?: string; hidden: boolean }
    }) => {
      const response = await api.patch(`/tenant/${tenantId}/wlan/${id}`, data)
      return response.data.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wlans', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['wlan', tenantId, variables.id] })
      setIsEditDialogOpen(false)
      setSelectedWlan(null)
      toast.success(`${m.wlan()} ${m.updated().toLowerCase()}`)
    }
  })

  const deleteWlanMutation = useMutation({
    mutationFn: async (wlanId: string) => {
      await api.delete(`/tenant/${tenantId}/wlan/${wlanId}`)
      return wlanId
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false)
      setWlanToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['wlans', tenantId] })
      toast.success(`${m.wlan()} ${m.deleted().toLowerCase()}`)
    }
  })

  const handleEditWlan = useCallback((fullWlan: Wlan) => {
    setSelectedWlan(fullWlan)
    setIsEditDialogOpen(true)
  }, [])

  const handleDeleteWlan = useCallback((wlan: Wlan) => {
    setWlanToDelete(wlan)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleShowDevices = useCallback((wlan: Wlan) => {
    setWlanForDevices(wlan)
    setIsDevicesDialogOpen(true)
  }, [])

  const handleViewNotes = useCallback((fullWlan: Wlan) => {
    setWlanForNotes(fullWlan)
    setIsNotesDialogOpen(true)
  }, [])

  const handleSaveNotes = useCallback(
    async (content: string) => {
      if (!wlanForNotes) return
      try {
        await api.patch(`/tenant/${tenantId}/wlan/${wlanForNotes._id}`, { notes: content })
        queryClient.invalidateQueries({ queryKey: ['wlans', tenantId] })
        queryClient.invalidateQueries({ queryKey: ['wlan', tenantId, wlanForNotes._id] })
        toast.success(`${m.wlan()} ${m.updated().toLowerCase()}`)
      } catch (_error) {
        // Error handled silently
      }
    },
    [api, tenantId, wlanForNotes, queryClient]
  )

  const columns = useMemo<ColumnDef<Wlan>[]>(
    () => [
      {
        accessorKey: 'ssid',
        header: () => 'SSID',
        footer: (props) => props.column.id,
        cell: ({ row }) => {
          const wlan = row.original
          return (
            <div className="flex items-center gap-2">
              <span>{wlan.ssid}</span>
              {wlan.hidden ? <TbEyeOff className="text-muted-foreground" title={m.hidden()} /> : null}
            </div>
          )
        }
      },
      {
        accessorKey: 'vlan',
        header: () => m.vlan(),
        footer: (props) => props.column.id,
        cell: ({ row }) => {
          const wlan = row.original
          if (!wlan.vlan) return '-'
          return (
            <Badge variant="outline">
              {wlan.vlan.networkNumber} - {wlan.vlan.name}
            </Badge>
          )
        }
      },
      {
        accessorKey: 'createdAt',
        header: () => m.created_at(),
        footer: (props) => props.column.id,
        sortType: 'datetime',
        cell: ({ getValue }) => formatDateTime(getValue() as Date | string)
      },
      {
        accessorKey: 'updatedAt',
        header: () => m.updated_at(),
        footer: (props) => props.column.id,
        sortType: 'datetime',
        cell: ({ getValue }) => formatDateTime(getValue() as Date | string)
      },
      {
        id: 'actions',
        header: () => <div className="w-full text-right">{m.actions()}</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <WlanActionsCell
            wlan={row.original}
            tenantId={tenantId}
            canWrite={canWrite}
            onEdit={handleEditWlan}
            onDelete={handleDeleteWlan}
            onShowDevices={handleShowDevices}
            onViewNotes={handleViewNotes}
          />
        )
      }
    ],
    [tenantId, canWrite, handleEditWlan, handleDeleteWlan, handleShowDevices, handleViewNotes]
  )

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: wlansQuery.data?.data?.docs ?? defaultData,
    columns,
    rowCount: wlansQuery.data?.data?.totalDocs,
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

  const handleExportPage = useCallback(() => {
    try {
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_wlans_currentpage_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = table.getRowModel().rows.map((row) => formatWlanForCsv(row.original))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_page', { resourceType: 'wlan', tenantId })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'wlan', tenantId })
    }
  }, [table, csvColumnHeaders, posthog, tenantId])

  const handleExportAll = useCallback(async () => {
    try {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : 'createdAt'
      const response = await api.get(`/tenant/${tenantId}/wlan?limit=10000&sort=${sortValue}`)
      const allWlans = response.data.data.docs
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_wlans_all_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = allWlans.map((wlan: Wlan) => formatWlanForCsv(wlan))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_all', { resourceType: 'wlan', tenantId })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'wlan', tenantId })
    }
  }, [api, tenantId, sorting, csvColumnHeaders, posthog])

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (wlansQuery.error) {
    return <ErrorPage error={wlansQuery.error} />
  }

  if (wlansQuery.isPending) {
    return <Loader />
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <div className="p-4">
          <Card className="rounded-lg pt-3 gap-3">
            <div className="flex justify-end px-3">
              <div className="flex items-center gap-3">
                {(wlansQuery.data.data?.totalDocs ?? 0) > 0 ? (
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

      <WlanCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onConfirm={async (data) => {
          try {
            await createWlanMutation.mutateAsync(data)
          } catch (_error) {
            // Error handled by mutation
          }
        }}
      />

      <WlanEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onConfirm={async (id, data) => {
          try {
            await updateWlanMutation.mutateAsync({ id, data })
          } catch (_error) {
            // Error handled by mutation
          }
        }}
        wlan={selectedWlan}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={m.delete_wlan()}
        description={m.delete_wlan_confirmation({ name: wlanToDelete?.ssid ?? '-' })}
        confirmButtonText={m.delete()}
        onConfirm={async () => {
          if (wlanToDelete) {
            await deleteWlanMutation.mutateAsync(wlanToDelete._id)
          }
        }}
        variant="destructive"
        addedVerification={wlanToDelete?.ssid}
      />

      <WlanDevicesDialog
        open={isDevicesDialogOpen}
        onClose={() => setIsDevicesDialogOpen(false)}
        wlanId={wlanForDevices?._id ?? ''}
        wlanSsid={wlanForDevices?.ssid}
      />

      <NoteEditorDialogMdx
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        initialContent={wlanForNotes?.notes || ''}
        onSave={handleSaveNotes}
        canEdit={true}
        resourceName={wlanForNotes?.ssid || ''}
      />
    </div>
  )
}

function WlanActionsCell({
  wlan,
  tenantId,
  canWrite,
  onEdit,
  onDelete,
  onShowDevices,
  onViewNotes
}: {
  wlan: Wlan
  tenantId: string
  canWrite: boolean
  onEdit: (wlan: Wlan) => void
  onDelete: (wlan: Wlan) => void
  onShowDevices: (wlan: Wlan) => void
  onViewNotes: (wlan: Wlan) => void
}) {
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()

  const fetchWlan = async () => {
    return queryClient.fetchQuery({
      queryKey: ['wlan', tenantId, wlan._id],
      queryFn: () => api.get(`/tenant/${tenantId}/wlan/${wlan._id}`).then((res) => res.data.data)
    })
  }

  const handleEdit = async () => {
    setLoadingEdit(true)
    try {
      const data = await fetchWlan()
      onEdit(data)
    } catch (_error) {
      // silently fail
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleNotes = async () => {
    setLoadingNotes(true)
    try {
      const data = await fetchWlan()
      onViewNotes(data)
    } catch (_error) {
      // silently fail
    } finally {
      setLoadingNotes(false)
    }
  }

  return (
    <div className="flex gap-1 justify-end">
      <Button variant="ghost" size="xs-icon" onClick={() => onShowDevices(wlan)} title={m.devices_in_wlan()}>
        <TbDevices />
      </Button>
      {wlan.notesExcerpt ? (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs-icon"
              onClick={handleNotes}
              className="text-yellow-600 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-400"
              disabled={loadingNotes || !canWrite}>
              {loadingNotes ? <TbLoader2 className="animate-spin" /> : <TbNotes />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64">
            <p>{wlan.notesExcerpt}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          size="xs-icon"
          onClick={handleNotes}
          title={m.notes()}
          disabled={loadingNotes || !canWrite}>
          {loadingNotes ? <TbLoader2 className="animate-spin" /> : <TbNotes />}
        </Button>
      )}
      <Button
        variant="ghost"
        size="xs-icon"
        onClick={handleEdit}
        title={m.edit_wlan()}
        disabled={loadingEdit || !canWrite}>
        {loadingEdit ? <TbLoader2 className="animate-spin" /> : <TbEdit />}
      </Button>
      <Button
        variant="ghost"
        size="xs-icon"
        onClick={() => onDelete(wlan)}
        className="text-destructive-foreground hover:text-destructive-foreground"
        title={m.delete_wlan()}
        disabled={!canWrite}>
        <TbTrash />
      </Button>
    </div>
  )
}
