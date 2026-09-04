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
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@patchdocs/ui'
import { TbPlus, TbEdit, TbTrash, TbLoader2, TbFileDownload, TbDotsVertical, TbUserStar } from 'react-icons/tb'
import { mkConfig, generateCsv, download } from 'export-to-csv'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import { useHeaderConfig } from '@/contexts/HeaderContext'
import HelpButton from '@/components/common/HelpButton'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAppStore } from '@/lib/app-store'
import { isUserAdminOfCurrentTenant, formatDateTime } from '@/lib/utils'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import UnauthorizedPageAccess from '@/components/common/UnauthorizedPageAccess'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import DataTableControlled from '@/components/table/DataTableControlled'
import DebouncedInput from '@/components/common/DebouncedInput'
import UserCreateDialog from '@/components/user/UserCreateDialog'
import UserEditDialog from '@/components/user/UserEditDialog'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import type { User } from '@/types'
import type { CreateUserFormData } from '@/components/user/UserForm'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<User> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

const formatUserForCsv = (user: User) => ({
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  createdAt: new Date(user.createdAt).toISOString(),
  updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : ''
})

export const Route = createFileRoute('/app/users')({
  component: UsersPage
})

function UsersPage() {
  const { setConfig } = useHeaderConfig()
  const posthog = usePostHog()
  const locale = getLocale()
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const customer = useAppStore((state) => state.customer)
  const user = useAppStore((state) => state.user)
  const billingStatus = useAppStore((state) => state.billingStatus)
  const readOnly = billingStatus === 'read_only'
  const activeTenant = useAppStore((state) => state.activeTenant)
  const isTenantAdmin = isUserAdminOfCurrentTenant(user, activeTenant)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [userToTransferTo, setUserToTransferTo] = useState<User | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to rerender when locale changes
  const csvColumnHeaders = useMemo(
    () => [
      { key: 'email', displayLabel: m.email() },
      { key: 'firstName', displayLabel: m.first_name() },
      { key: 'lastName', displayLabel: m.last_name() },
      { key: 'createdAt', displayLabel: m.created_at() },
      { key: 'updatedAt', displayLabel: m.updated_at() }
    ],
    [locale]
  )

  useEffect(() => {
    setConfig({
      title: m.users_permissions(),
      buttons: [
        ...(isTenantAdmin && billingStatus !== 'blocked'
          ? [
              <Button
                key="add"
                size={isMobile ? 'sm-icon' : 'sm'}
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={billingStatus === 'read_only'}>
                <TbPlus />
                <span className="hidden md:inline">{m.add_user()}</span>
              </Button>
            ]
          : []),
        <HelpButton key="help" docSlug="administration/user-management" variant="outline" size="sm-icon" />
      ]
    })
    return () => setConfig(null)
  }, [setConfig, isTenantAdmin, billingStatus, isMobile])

  const usersQuery = useQuery({
    queryKey: ['users', pagination, sorting],
    queryFn: () => {
      const sortValue = sorting.length ? sorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',') : 'createdAt'
      return api
        .get(
          `/user?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&sort=${sortValue}${customer?.accountType === 'systemIntegrator' && !user?.isCustomerAdmin ? `&tenantId=${activeTenant?._id}` : ''}`
        )
        .then((res) => {
          // console.log(res.data)
          return res.data
        })
    },
    enabled: isTenantAdmin && billingStatus !== 'blocked',
    placeholderData: keepPreviousData
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserFormData) => {
      const response = await api.post('/user', userData)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-users', activeTenant?._id] })
      setIsCreateDialogOpen(false)
      toast.success(`${m.user()} ${m.created().toLowerCase()}`)
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateUserFormData }) => {
      const response = await api.patch(`/user/${id}`, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-users', activeTenant?._id] })
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      toast.success(`${m.user()} ${m.updated().toLowerCase()}`)
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/user/${userId}`)
      return userId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-users', activeTenant?._id] })
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      toast.success(`${m.user()} ${m.deleted().toLowerCase()}`)
    }
  })

  const transferOwnershipMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.patch(`/customer/${customer?._id}/owner`, { userId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUserToTransferTo(null)
      toast.success(m.ownership_transferred())
    }
  })

  const handleEditUser = useCallback((fullUser: User) => {
    setSelectedUser(fullUser)
    setIsEditDialogOpen(true)
  }, [])

  const handleDeleteUser = useCallback((user: User) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleTransferOwnership = useCallback((user: User) => setUserToTransferTo(user), [])

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'email',
        header: () => m.email(),
        footer: (props) => props.column.id,
        cell: ({ row }) => {
          const tableUser = row.original
          const permissionsCount = tableUser.permissionsCount ?? 0
          return (
            <div className="flex items-center gap-2">
              <span>{tableUser.email}</span>
              {tableUser._id === user?._id ? (
                <Badge variant="outline" className="text-xs">
                  {m.you()}
                </Badge>
              ) : null}
              {tableUser._id === customer?.ownerId ? (
                <Badge variant="outline" className="text-xs">
                  {m.owner()}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={`text-xs ${permissionsCount === 0 ? 'text-orange-500 border-orange-500' : ''}`}>
                {permissionsCount === 0 ? m.no_permissions() : m.n_permissions({ count: permissionsCount })}
              </Badge>
            </div>
          )
        }
      },
      {
        accessorKey: 'firstName',
        header: () => m.first_name(),
        footer: (props) => props.column.id
      },
      {
        accessorKey: 'lastName',
        header: () => m.last_name(),
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
          <UserActionsCell
            tableUser={row.original}
            currentUserId={user?._id}
            ownerUserId={customer?.ownerId}
            readOnly={billingStatus === 'read_only'}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onTransferOwnership={user?._id === customer?.ownerId ? handleTransferOwnership : undefined}
          />
        )
      }
    ],
    [handleEditUser, handleDeleteUser, handleTransferOwnership, user, customer, billingStatus]
  )

  const defaultData = useMemo(() => [], [])

  const table = useReactTable({
    data: usersQuery.data?.data?.docs ?? defaultData,
    columns,
    rowCount: usersQuery.data?.data?.totalDocs,
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
        filename: `patchdocs_export_users_currentpage_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = table.getRowModel().rows.map((row) => formatUserForCsv(row.original))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_page', { resourceType: 'user' })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'user' })
    }
  }, [table, csvColumnHeaders, posthog])

  const handleExportAll = useCallback(async () => {
    try {
      const response = await api.get(
        `/user?limit=10000&sort=createdAt${customer?.accountType === 'systemIntegrator' && !user?.isCustomerAdmin ? `&tenantId=${activeTenant?._id}` : ''}`
      )
      const allUsers = response.data.data.docs
      const csvConfig = mkConfig({
        fieldSeparator: ',',
        filename: `patchdocs_export_users_all_${new Date().toISOString().split('T')[0]}`,
        useKeysAsHeaders: false,
        columnHeaders: csvColumnHeaders
      })
      const rows = allUsers.map((user: User) => formatUserForCsv(user))
      const csv = generateCsv(csvConfig)(rows)
      download(csvConfig)(csv)
      posthog?.capture('export:export_csv_all', { resourceType: 'user' })
    } catch {
      // handled by interceptor
      toast.error(m.export_as_csv_error())
      posthog?.capture('export:export_csv_error', { resourceType: 'user' })
    }
  }, [api, customer, user, activeTenant, csvColumnHeaders, posthog])

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (!isTenantAdmin) {
    return <UnauthorizedPageAccess />
  }

  if (usersQuery.error) {
    return <ErrorPage error={usersQuery.error} />
  }

  if (usersQuery.isPending) {
    return <Loader />
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <div className="p-4">
          <Card className="rounded-lg pt-3 gap-3">
            <div className="flex justify-end px-3">
              <div className="flex items-center gap-3">
                <DropdownMenu key="more">
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
                <DebouncedInput
                  value={globalFilter ?? ''}
                  onChange={(value) => setGlobalFilter(String(value))}
                  className="w-50"
                  placeholder={`${m.search()}...`}
                />
              </div>
            </div>
            <DataTableControlled table={table} />
          </Card>
        </div>
      </ScrollArea>

      <UserCreateDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={async (data) => {
          try {
            await createUserMutation.mutateAsync(data)
            return true
          } catch (_error) {
            return false
          }
        }}
      />

      <UserEditDialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedUser(null)
        }}
        onSave={async (id, data) => {
          try {
            await updateUserMutation.mutateAsync({ id, data })
            return true
          } catch (_error) {
            return false
          }
        }}
        user={selectedUser}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={m.delete_user()}
        description={m.delete_user_confirmation({ email: userToDelete?.email ?? '-' })}
        confirmButtonText={m.delete()}
        onConfirm={async () => {
          if (userToDelete) {
            await deleteUserMutation.mutateAsync(userToDelete._id)
          }
        }}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!userToTransferTo}
        onOpenChange={(open) => !open && setUserToTransferTo(null)}
        title={m.transfer_ownership()}
        description={m.transfer_ownership_confirmation({ email: userToTransferTo?.email ?? '-' })}
        confirmButtonText={m.transfer_ownership()}
        onConfirm={async () => {
          if (userToTransferTo) {
            await transferOwnershipMutation.mutateAsync(userToTransferTo._id)
          }
        }}
      />
    </div>
  )
}

function UserActionsCell({
  tableUser,
  currentUserId,
  ownerUserId,
  readOnly,
  onEdit,
  onDelete,
  onTransferOwnership
}: {
  tableUser: User
  currentUserId?: string
  ownerUserId?: string
  readOnly: boolean
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onTransferOwnership?: (user: User) => void
}) {
  const [loading, setLoading] = useState(false)
  const api = useAuthenticatedApi()

  const handleEdit = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/user/${tableUser._id}`)
      onEdit(response.data.data)
    } catch (_error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  // Hide actions for self, the owner, and users the caller is not authorized to manage (out of tenant-admin scope).
  if (tableUser._id === currentUserId || tableUser._id === ownerUserId || tableUser.manageable === false) {
    return null
  }

  return (
    <div className="flex gap-1 justify-end">
      <Button
        variant="ghost"
        size="xs-icon"
        className="hover:text-primary"
        onClick={handleEdit}
        title={m.edit_user()}
        disabled={loading || readOnly}>
        {loading ? <TbLoader2 className="animate-spin" /> : <TbEdit />}
      </Button>
      <Button
        variant="ghost"
        size="xs-icon"
        className="text-destructive-foreground hover:text-destructive-foreground"
        onClick={() => onDelete(tableUser)}
        title={m.delete_user()}
        disabled={loading || readOnly}>
        <TbTrash />
      </Button>
      {onTransferOwnership && tableUser.isCustomerAdmin ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="xs-icon" disabled={loading || readOnly}>
              <TbDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs cursor-pointer py-1" onClick={() => onTransferOwnership(tableUser)}>
              <TbUserStar className="size-3" />
              {m.transfer_ownership()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
