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
import { ScrollArea, Card, Button } from '@patchdocs/ui'
import { TbPlus, TbEdit, TbTrash, TbLoader2 } from 'react-icons/tb'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAppStore } from '@/lib/app-store'
import { formatDateTime } from '@/lib/utils'
import DataTableControlled from '@/components/table/DataTableControlled'
import HelpButton from '@/components/common/HelpButton'
import DebouncedInput from '@/components/common/DebouncedInput'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import UnauthorizedPageAccess from '@/components/common/UnauthorizedPageAccess'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import TenantCreateDialog from '@/components/tenant/TenantCreateDialog'
import TenantEditDialog from '@/components/tenant/TenantEditDialog'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import * as m from '@/paraglide/messages'
import type { Tenant, CreateTenantFormData } from '@/types'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<Tenant> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

export const Route = createFileRoute('/app/tenants')({
  component: TenantsPage
})

function TenantsPage() {
  const { setConfig } = useHeaderConfig()
  const api = useAuthenticatedApi()
  const posthog = usePostHog()
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const user = useAppStore((state) => state.user)
  const customer = useAppStore((state) => state.customer)
  const billingStatus = useAppStore((state) => state.billingStatus)
  const setTenants = useAppStore((state) => state.setTenants)
  const setActiveTenant = useAppStore((state) => state.setActiveTenant)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)

  useEffect(() => {
    setConfig({
      title: m.tenants(),
      buttons: [
        ...(user?.isCustomerAdmin && billingStatus !== 'blocked'
          ? [
              <Button
                key="add"
                size={isMobile ? 'sm-icon' : 'sm'}
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={billingStatus === 'read_only'}>
                <TbPlus />
                <span className="hidden md:inline">{m.add_tenant()}</span>
              </Button>
            ]
          : []),
        <HelpButton key="help" docSlug="administration/tenant-management" variant="outline" size="sm-icon" />
      ]
    })
    return () => setConfig(null)
  }, [setConfig, user?.isCustomerAdmin, billingStatus, isMobile])

  const tenantsQuery = useQuery({
    queryKey: ['tenants', pagination, sorting],
    queryFn: () => {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : 'createdAt'
      return api
        .get(`/tenant?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&sort=${sortValue}`)
        .then((res) => {
          return res.data
        })
    },
    placeholderData: keepPreviousData,
    enabled: billingStatus !== 'blocked'
  })

  const createTenantMutation = useMutation({
    mutationFn: async (tenantData: CreateTenantFormData) => {
      const response = await api.post('/tenant', tenantData)
      return response.data.data
    },
    onSuccess: (newTenant) => {
      setIsCreateDialogOpen(false)
      setTenants([...useAppStore.getState().tenants, newTenant])
      setActiveTenant(newTenant)
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success(`${m.tenant()} ${m.created().toLowerCase()}`)
      posthog?.capture('tenant:tenant_switch', { tenantId: newTenant._id })
    }
  })

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateTenantFormData }) => {
      const response = await api.patch(`/tenant/${id}`, data)
      return response.data.data
    },
    onSuccess: (updatedTenant) => {
      setTenants(useAppStore.getState().tenants.map((t) => (t._id === updatedTenant._id ? updatedTenant : t)))
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setIsEditDialogOpen(false)
      setSelectedTenant(null)
      toast.success(`${m.tenant()} ${m.updated().toLowerCase()}`)
    }
  })

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await api.delete(`/tenant/${tenantId}`)
      return tenantId
    },
    onSuccess: (deletedTenantId) => {
      setIsDeleteDialogOpen(false)
      const remainingTenants = useAppStore.getState().tenants.filter((t) => t._id !== deletedTenantId)
      setTenants(remainingTenants)
      setTenantToDelete(null)
      queryClient.invalidateQueries()
      toast.success(`${m.tenant()} ${m.deleted().toLowerCase()}`)
      if (remainingTenants[0]) {
        setActiveTenant(remainingTenants[0])
        posthog?.capture('tenant:tenant_switch', { tenantId: remainingTenants[0]._id })
      }
    }
  })

  const handleEditTenant = useCallback((fullTenant: Tenant) => {
    setSelectedTenant(fullTenant)
    setIsEditDialogOpen(true)
  }, [])

  const handleDeleteTenant = useCallback((tenant: Tenant) => {
    setTenantToDelete(tenant)
    setIsDeleteDialogOpen(true)
  }, [])

  const columns = useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: () => m.id(),
        footer: (props) => props.column.id
      },
      {
        accessorKey: 'name',
        header: () => m.name(),
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
          <TenantActionsCell
            tenant={row.original}
            totalDocs={tenantsQuery.data?.data?.totalDocs ?? 0}
            readOnly={billingStatus === 'read_only'}
            onEdit={handleEditTenant}
            onDelete={handleDeleteTenant}
          />
        )
      }
    ],
    [handleEditTenant, handleDeleteTenant, tenantsQuery.data?.data?.totalDocs, billingStatus]
  )

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: tenantsQuery.data?.data?.docs ?? defaultData,
    columns,
    rowCount: tenantsQuery.data?.data?.totalDocs,
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

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (!user?.isCustomerAdmin || customer?.accountType !== 'systemIntegrator') {
    return <UnauthorizedPageAccess />
  }

  if (tenantsQuery.error) {
    return <ErrorPage error={tenantsQuery.error} />
  }

  if (tenantsQuery.isPending) {
    return <Loader />
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <div className="p-4">
          <Card className="rounded-lg pt-3 gap-3">
            <div className="flex justify-end px-3">
              <DebouncedInput
                value={globalFilter ?? ''}
                onChange={(value) => setGlobalFilter(String(value))}
                className="w-50"
                placeholder={`${m.search()}...`}
              />
            </div>
            <DataTableControlled table={table} />
          </Card>
        </div>
      </ScrollArea>

      <TenantCreateDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={async (data) => {
          try {
            await createTenantMutation.mutateAsync(data)
            return true
          } catch (_error) {
            return false
          }
        }}
      />

      <TenantEditDialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedTenant(null)
        }}
        onSave={async (id, data) => {
          try {
            await updateTenantMutation.mutateAsync({ id, data })
            return true
          } catch (_error) {
            return false
          }
        }}
        tenant={selectedTenant}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={m.delete_tenant()}
        description={m.delete_tenant_confirmation({ reference: tenantToDelete?.reference ?? '-' })}
        confirmButtonText={m.delete()}
        onConfirm={async () => {
          if (tenantToDelete) {
            await deleteTenantMutation.mutateAsync(tenantToDelete._id)
          }
        }}
        variant="destructive"
        addedVerification={tenantToDelete?.reference}
      />
    </div>
  )
}

function TenantActionsCell({
  tenant,
  totalDocs,
  readOnly,
  onEdit,
  onDelete
}: {
  tenant: Tenant
  totalDocs: number
  readOnly: boolean
  onEdit: (tenant: Tenant) => void
  onDelete: (tenant: Tenant) => void
}) {
  const [loading, setLoading] = useState(false)
  const api = useAuthenticatedApi()

  const handleEdit = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/tenant/${tenant._id}`)
      onEdit(response.data.data)
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-1 justify-end">
      <Button
        variant="ghost"
        size="xs-icon"
        className="hover:text-primary"
        onClick={handleEdit}
        title={m.edit_tenant()}
        disabled={loading || readOnly}>
        {loading ? <TbLoader2 className="animate-spin" /> : <TbEdit />}
      </Button>
      {totalDocs > 1 ? (
        <Button
          variant="ghost"
          size="xs-icon"
          className="text-destructive-foreground hover:text-destructive-foreground"
          onClick={() => onDelete(tenant)}
          title={m.delete_tenant()}
          disabled={readOnly}>
          <TbTrash />
        </Button>
      ) : null}
    </div>
  )
}
