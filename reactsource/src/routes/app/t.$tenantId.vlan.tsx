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
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@patchdocs/ui'
import { TbPlus, TbEdit, TbTrash, TbLoader2, TbSitemap, TbFileDownload, TbNotes } from 'react-icons/tb'
import { mkConfig, generateCsv, download } from 'export-to-csv'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import HelpButton from '@/components/common/HelpButton'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { isUserAdminOfCurrentTenant, formatDateTime } from '@/lib/utils'
import DataTableControlled from '@/components/table/DataTableControlled'
import DebouncedInput from '@/components/common/DebouncedInput'
import { useAppStore } from '@/lib/app-store'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import VlanCreateDialog from '@/components/vlan/VlanCreateDialog'
import VlanEditDialog from '@/components/vlan/VlanEditDialog'
import VlanPortsDialog from '@/components/vlan/VlanPortsDialog'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import NoteEditorDialogMdx from '@/components/dialogs/NoteEditorDialogMdx'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import type { Vlan } from '@/types'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<Vlan> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const formatVlanForCsv = (vlan: Vlan) => ({
  name: vlan.name,
  networkNumber: vlan.networkNumber,
  createdAt: new Date(vlan.createdAt).toISOString(),
  updatedAt: vlan.updatedAt ? new Date(vlan.updatedAt).toISOString() : ''
})

export const Route = createFileRoute('/app/t/$tenantId/vlan')({
  component: VlansPage
})

function VlansPage() {
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
  const [selectedVlan, setSelectedVlan] = useState<Vlan | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [vlanToDelete, setVlanToDelete] = useState<Vlan | null>(null)
  const [isPortsDialogOpen, setIsPortsDialogOpen] = useState(false)
  const [vlanForPorts, setVlanForPorts] = useState<Vlan | null>(null)
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [vlanForNotes, setVlanForNotes] = useState<Vlan | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to rerender when locale changes
  const csvColumnHeaders = useMemo(
    () => [
      { key: 'name', displayLabel: m.name() },
      { key: 'networkNumber', displayLabel: m.network_number() },
      { key: 'createdAt', displayLabel: m.created_at() },
      { key: 'updatedAt', displayLabel: m.updated_at() }
    ],
    [locale]
  )

  useEffect(() => {
    setConfig({
      title: m.vlan(),
      buttons: [
        ...(isTenantAdmin && billingStatus !== 'blocked'
          ? [
              <Button
                key="add"
                size={isMobile ? 'sm-icon' : 'sm'}
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={!canWrite}>
                <TbPlus />
                <span className="hidden md:inline">{m.add_vlan()}</span>
              </Button>
            ]
          : []),
        <HelpButton key="help" docSlug="features/networks#vlans" variant="outline" size="sm-icon" />
      ]
    })
    return () => setConfig(null)
  }, [setConfig, isTenantAdmin, billingStatus, canWrite, isMobile])

  const vlansQuery = useQuery({
    queryKey: ['vlans', tenantId, pagination, sorting],
    queryFn: () => {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : 'createdAt'
      return api
        .get(`/tenant/${tenantId}/vlan?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&sort=${sortValue}`)
        .then((res) => {
          return res.data
        })
    },
    placeholderData: keepPreviousData,
    enabled: billingStatus !== 'blocked'
  })

  const createVlanMutation = useMutation({
    mutationFn: async (vlanData: { name: string; networkNumber: number }) => {
      const response = await api.post(`/tenant/${tenantId}/vlan`, vlanData)
      return response.data.data
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['vlans', tenantId] })
      toast.success(`${m.vlan()} ${m.created().toLowerCase()}`)
    }
  })

  const updateVlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; networkNumber: number } }) => {
      const response = await api.patch(`/tenant/${tenantId}/vlan/${id}`, data)
      return response.data.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vlans', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['vlan', tenantId, variables.id] })
      setIsEditDialogOpen(false)
      setSelectedVlan(null)
      toast.success(`${m.vlan()} ${m.updated().toLowerCase()}`)
    }
  })

  const deleteVlanMutation = useMutation({
    mutationFn: async (vlanId: string) => {
      await api.delete(`/tenant/${tenantId}/vlan/${vlanId}`)
      return vlanId
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false)
      setVlanToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['vlans', tenantId] })
      toast.success(`${m.vlan()} ${m.deleted().toLowerCase()}`)
    }
  })

  const handleEditVlan = useCallback((fullVlan: Vlan) => {
    setSelectedVlan(fullVlan)
    setIsEditDialogOpen(true)
  }, [])

  const handleDeleteVlan = useCallback((vlan: Vlan) => {
    setVlanToDelete(vlan)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleViewPorts = useCallback((vlan: Vlan) => {
    setVlanForPorts(vlan)
    setIsPortsDialogOpen(true)
  }, [])

  const handleViewNotes = useCallback((fullVlan: Vlan) => {
    setVlanForNotes(fullVlan)
    setIsNotesDialogOpen(true)
  }, [])

  const handleSaveNotes = useCallback(
    async (content: string) => {
      if (!vlanForNotes) return
      try {
        await api.patch(`/tenant/${tenantId}/vlan/${vlanForNotes._id}`, { notes: content })
        queryClient.invalidateQueries({ queryKey: ['vlans', tenantId] })
        queryClient.invalidateQueries({ queryKey: ['vlan', tenantId, vlanForNotes._id] })
        toast.success(`${m.vlan()} ${m.updated().toLowerCase()}`)
      } catch {
        // handled by interceptor
      }
    },
    [api, tenantId, vlanForNotes, queryClient]
  )

  const columns = useMemo<ColumnDef<Vlan>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => m.name(),
        footer: (props) => props.column.id
      },
      {
        accessorKey: 'networkNumber',
        header: () => m.network_number(),
        footer: (props) => props.column.id
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
          <VlanActionsCell
            vlan={row.original}
            tenantId={tenantId}
            canWrite={canWrite}
            onEdit={handleEditVlan}
            onDelete={handleDeleteVlan}
            onViewPorts={handleViewPorts}
            onViewNotes={handleViewNotes}
          />
        )
      }
    ],
    [tenantId, canWrite, handleEditVlan, handleDeleteVlan, handleViewPorts, handleViewNotes]
  )

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: vlansQuery.data?.data?.docs ?? defaultData,
    columns,
    rowCount: vlansQuery.data?.data?.totalDocs,
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
        filename: `patchdocs_export_vlans_currentpage_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = table.getRowModel().rows.map((row) => formatVlanForCsv(row.original))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_page', { resourceType: 'vlan', tenantId })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'vlan', tenantId })
    }
  }, [table, csvColumnHeaders, posthog, tenantId])

  const handleExportAll = useCallback(async () => {
    try {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : 'createdAt'
      const response = await api.get(`/tenant/${tenantId}/vlan?limit=10000&sort=${sortValue}`)
      const allVlans = response.data.data.docs
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_vlans_all_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = allVlans.map((vlan: Vlan) => formatVlanForCsv(vlan))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_all', { resourceType: 'vlan', tenantId })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'vlan', tenantId })
    }
  }, [api, tenantId, sorting, csvColumnHeaders, posthog])

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (vlansQuery.error) {
    return <ErrorPage error={vlansQuery.error} />
  }

  if (vlansQuery.isPending) {
    return <Loader />
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <div className="p-4">
          <Card className="rounded-lg pt-3 gap-3">
            <div className="flex justify-end px-3">
              <div className="flex items-center gap-3">
                {(vlansQuery.data.data?.totalDocs ?? 0) > 0 ? (
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

      <VlanCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onConfirm={async (data) => {
          try {
            await createVlanMutation.mutateAsync(data)
          } catch (_error) {
            // Error handled by mutation
          }
        }}
      />

      <VlanEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onConfirm={async (id, data) => {
          try {
            await updateVlanMutation.mutateAsync({ id, data })
          } catch (_error) {
            // Error handled by mutation
          }
        }}
        vlan={selectedVlan}
      />

      <VlanPortsDialog
        open={isPortsDialogOpen}
        onClose={() => {
          setIsPortsDialogOpen(false)
          setVlanForPorts(null)
        }}
        vlanId={vlanForPorts?._id ?? ''}
        vlanName={vlanForPorts?.name}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={m.delete_vlan()}
        description={m.delete_vlan_confirmation({ name: vlanToDelete?.name ?? '-' })}
        confirmButtonText={m.delete()}
        onConfirm={async () => {
          if (vlanToDelete) {
            await deleteVlanMutation.mutateAsync(vlanToDelete._id)
          }
        }}
        variant="destructive"
        addedVerification={vlanToDelete?.name}
      />

      {/* Mounted only while open — see the same guard on the locations list
          page for why this editor can't be mounted unconditionally. */}
      {isNotesDialogOpen && (
        <NoteEditorDialogMdx
          open={isNotesDialogOpen}
          onOpenChange={setIsNotesDialogOpen}
          initialContent={vlanForNotes?.notes || ''}
          onSave={handleSaveNotes}
          canEdit={true}
          resourceName={vlanForNotes?.name || ''}
        />
      )}
    </div>
  )
}

function VlanActionsCell({
  vlan,
  tenantId,
  canWrite,
  onEdit,
  onDelete,
  onViewPorts,
  onViewNotes
}: {
  vlan: Vlan
  tenantId: string
  canWrite: boolean
  onEdit: (vlan: Vlan) => void
  onDelete: (vlan: Vlan) => void
  onViewPorts: (vlan: Vlan) => void
  onViewNotes: (vlan: Vlan) => void
}) {
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()

  const fetchVlan = async () => {
    return queryClient.fetchQuery({
      queryKey: ['vlan', tenantId, vlan._id],
      queryFn: () => api.get(`/tenant/${tenantId}/vlan/${vlan._id}`).then((res) => res.data.data)
    })
  }

  const handleEdit = async () => {
    setLoadingEdit(true)
    try {
      const data = await fetchVlan()
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
      const data = await fetchVlan()
      onViewNotes(data)
    } catch (_error) {
      // silently fail
    } finally {
      setLoadingNotes(false)
    }
  }

  return (
    <div className="flex gap-1 justify-end">
      <Button variant="ghost" size="xs-icon" onClick={() => onViewPorts(vlan)} title={m.ports_in_vlan()}>
        <TbSitemap />
      </Button>
      {vlan.notesExcerpt ? (
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
            <p>{vlan.notesExcerpt}</p>
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
        title={m.edit_vlan()}
        disabled={loadingEdit || !canWrite}>
        {loadingEdit ? <TbLoader2 className="animate-spin" /> : <TbEdit />}
      </Button>
      <Button
        variant="ghost"
        size="xs-icon"
        onClick={() => onDelete(vlan)}
        className="text-destructive-foreground hover:text-destructive-foreground"
        title={m.delete_vlan()}
        disabled={!canWrite}>
        <TbTrash />
      </Button>
    </div>
  )
}
