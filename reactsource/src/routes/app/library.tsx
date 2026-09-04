import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
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
import { TbPencil, TbSquare, TbPlus, TbTrash, TbLoader2, TbDevices } from 'react-icons/tb'
import { toast } from 'sonner'
import {
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  Input,
  Label,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@patchdocs/ui'
import { useHeader } from '@/hooks/useHeader'
import HelpButton from '@/components/common/HelpButton'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useAppStore } from '@/lib/app-store'
import { STANDARD_DEVICE_TYPES } from '@/lib/device-constants'
import { getValidationSchemas } from '@/lib/schemas'
import UnauthorizedPageAccess from '@/components/common/UnauthorizedPageAccess'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import TablerIcon from '@/components/common/TablerIcon'
import FieldInfo from '@/components/common/FieldInfo'
import FormSubmitButton from '@/components/common/FormSubmitButton'
import DebouncedInput from '@/components/common/DebouncedInput'
import DataTableControlled from '@/components/table/DataTableControlled'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import CustomDeviceTypeDialog from '@/components/device/CustomDeviceTypeDialog'
import RackDeviceEditorDialog from '@/components/editors/rack-device-editor/Dialog'
import ImpactDialog from '@/components/editors/rack-device-editor/components/ImpactDialog'
import DeleteRackDeviceDialog from '@/components/editors/rack-device-editor/components/DeleteRackDeviceDialog'
import UsedInDevicesList from '@/components/editors/rack-device-editor/components/UsedInDevicesList'
import * as m from '@/paraglide/messages'
import type { Customer, CustomDeviceType, CustomRackDevice, DeviceCategory } from '@/types'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<CustomRackDevice> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)
  addMeta({ itemRank })
  return itemRank.passed
}

type LibraryTabs = 'rack-devices' | 'device-types'

export const Route = createFileRoute('/app/library')({
  component: LibraryPage
})

function LibraryPage() {
  useHeader({
    title: m.device_library(),
    buttons: [<HelpButton key="help" docSlug="features/device-library" variant="outline" size="sm-icon" />]
  })
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const user = useAppStore((state) => state.user)
  const billingStatus = useAppStore((state) => state.billingStatus)
  const readOnly = billingStatus === 'read_only'
  const customer = useAppStore((state) => state.customer)
  const setCustomer = useAppStore((state) => state.setCustomer)
  const [activeTab, setActiveTab] = useState<LibraryTabs>('rack-devices')

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [dialogCategory, setDialogCategory] = useState<DeviceCategory>('floor')
  const [editingDeviceType, setEditingDeviceType] = useState<CustomDeviceType | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDeviceType, setDeletingDeviceType] = useState<CustomDeviceType | undefined>()

  // Rack device editor states
  const [rackDeviceDialogOpen, setRackDeviceDialogOpen] = useState(false)
  const [editingRackDevice, setEditingRackDevice] = useState<CustomRackDevice | undefined>()
  const [viewOnlyMode, setViewOnlyMode] = useState(false)
  const [impactDialogOpen, setImpactDialogOpen] = useState(false)
  const [pendingEditDevice, setPendingEditDevice] = useState<CustomRackDevice | undefined>()
  const [deleteRackDeviceDialogOpen, setDeleteRackDeviceDialogOpen] = useState(false)
  const [deletingRackDevice, setDeletingRackDevice] = useState<CustomRackDevice | undefined>()
  const [viewDevicesDialogOpen, setViewDevicesDialogOpen] = useState(false)
  const [viewDevicesTarget, setViewDevicesTarget] = useState<CustomRackDevice | undefined>()
  const [rackDevicePagination, setRackDevicePagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [rackDeviceSorting, setRackDeviceSorting] = useState<SortingState>([])
  const [rackDeviceGlobalFilter, setRackDeviceGlobalFilter] = useState('')

  // Fetch custom rack devices
  const rackDevicesQuery = useQuery({
    queryKey: ['custom-rack-devices', rackDevicePagination, rackDeviceSorting],
    queryFn: () => {
      const sortValue = rackDeviceSorting.length
        ? rackDeviceSorting.map((s) => `${s.desc ? '-' : ''}${s.id}`).join(',')
        : 'name'
      return api
        .get(
          `/custom-rack-device?page=${rackDevicePagination.pageIndex + 1}&limit=${rackDevicePagination.pageSize}&sort=${sortValue}`
        )
        .then((res) => res.data)
    },
    placeholderData: keepPreviousData,
    enabled: billingStatus !== 'blocked'
  })

  const defaultRackDevices = useMemo(() => [], [])

  // Resolve device type label
  const deviceTypeLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of STANDARD_DEVICE_TYPES.rack) map.set(d.id, d.label())
    for (const d of customer?.customDeviceTypes || []) map.set(d._id, d.name)
    return map
  }, [customer?.customDeviceTypes])

  const getDeviceTypeLabel = useCallback(
    (deviceType: string) => deviceTypeLabelMap.get(deviceType) || deviceType || '',
    [deviceTypeLabelMap]
  )

  const handleRackDeviceEdit = useCallback((device: CustomRackDevice) => {
    if (device.usedInDevices && device.usedInDevices.length > 0) {
      setPendingEditDevice(device)
      setImpactDialogOpen(true)
    } else {
      setViewOnlyMode(false)
      setEditingRackDevice(device)
      setRackDeviceDialogOpen(true)
    }
  }, [])

  const handleRackDeviceView = useCallback((device: CustomRackDevice) => {
    setViewOnlyMode(true)
    setEditingRackDevice(device)
    setRackDeviceDialogOpen(true)
  }, [])

  const handleImpactConfirm = useCallback(() => {
    if (!pendingEditDevice) return
    setImpactDialogOpen(false)
    setViewOnlyMode(false)
    setEditingRackDevice(pendingEditDevice)
    setRackDeviceDialogOpen(true)
    setPendingEditDevice(undefined)
  }, [pendingEditDevice])

  const handleRackDeviceDelete = useCallback(
    async (device: CustomRackDevice) => {
      try {
        const res = await api.get(`/custom-rack-device/${device._id}`)
        setDeletingRackDevice(res.data.data)
        setDeleteRackDeviceDialogOpen(true)
      } catch {
        // handled by interceptor
      }
    },
    [api]
  )

  const rackDeviceColumns = useMemo<ColumnDef<CustomRackDevice>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => m.name(),
        cell: ({ row }) => <RackDeviceName device={row.original} onView={handleRackDeviceView} />
      },
      {
        accessorKey: 'manufacturer',
        header: () => m.brand(),
        cell: ({ getValue }) => (getValue() as string) || '–'
      },
      {
        accessorKey: 'deviceType',
        header: () => m.type(),
        cell: ({ getValue }) => getDeviceTypeLabel(getValue() as string)
      },
      {
        accessorKey: 'height',
        header: () => m.rack_units(),
        cell: ({ getValue }) => `${getValue()} RU`,
        enableGlobalFilter: false
      },
      {
        id: 'actions',
        header: () => <div className="w-full text-right">{m.actions()}</div>,
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <RackDeviceActions
            device={row.original}
            readOnly={readOnly}
            onEdit={handleRackDeviceEdit}
            onDelete={handleRackDeviceDelete}
            onViewDevices={(device) => {
              setViewDevicesTarget(device)
              setViewDevicesDialogOpen(true)
            }}
          />
        )
      }
    ],
    [getDeviceTypeLabel, handleRackDeviceEdit, handleRackDeviceDelete, handleRackDeviceView, readOnly]
  )

  const rackDeviceTable = useReactTable({
    data: rackDevicesQuery.data?.data?.docs ?? defaultRackDevices,
    columns: rackDeviceColumns,
    rowCount: rackDevicesQuery.data?.data?.totalDocs,
    filterFns: { fuzzy: fuzzyFilter },
    state: {
      pagination: rackDevicePagination,
      sorting: rackDeviceSorting,
      globalFilter: rackDeviceGlobalFilter
    },
    onPaginationChange: setRackDevicePagination,
    onSortingChange: setRackDeviceSorting,
    onGlobalFilterChange: setRackDeviceGlobalFilter,
    globalFilterFn: 'fuzzy',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true
  })

  const openCreateRackDevice = useCallback(() => {
    setViewOnlyMode(false)
    setEditingRackDevice(undefined)
    setRackDeviceDialogOpen(true)
  }, [])

  const getPrefixDefaultValues = (category: DeviceCategory, customer: Customer | null) => {
    const deviceTypes: Record<string, string> = {}
    for (const device of STANDARD_DEVICE_TYPES[category]) {
      const prefixOverride = customer?.standardDeviceTypePrefixes?.find((p) => p.deviceType === device.id)
      deviceTypes[device.id] = prefixOverride?.prefix || ''
    }
    return { deviceTypes }
  }

  const savePrefixes = async (category: DeviceCategory, values: Record<string, string>): Promise<boolean> => {
    if (!customer?._id) return false

    // Check for duplicates before saving
    for (const device of STANDARD_DEVICE_TYPES[category]) {
      const prefix = values[device.id]
      if (prefix && isPrefixDuplicate(prefix, device.id, category)) {
        toast.error(m.prefix_already_in_use())
        return false
      }
    }

    // Get existing prefixes from other category
    const otherCategory: DeviceCategory = category === 'floor' ? 'rack' : 'floor'
    const existingOtherPrefixes = (customer.standardDeviceTypePrefixes || []).filter((p) =>
      STANDARD_DEVICE_TYPES[otherCategory].some((d) => d.id === p.deviceType)
    )

    // Build new prefixes for this category (only store if different from default)
    const newPrefixes: { deviceType: string; prefix: string }[] = []
    for (const device of STANDARD_DEVICE_TYPES[category]) {
      const prefix = values[device.id]
      // Only store if non-empty and different from default
      if (prefix && prefix !== device.defaultPrefix) {
        newPrefixes.push({ deviceType: device.id, prefix })
      }
    }

    const standardDeviceTypePrefixes = [...existingOtherPrefixes, ...newPrefixes]
    try {
      const res = await api.patch(`/customer/${customer._id}`, { standardDeviceTypePrefixes })
      if (res?.data?.data) {
        queryClient.setQueryData(['customer'], res.data.data)
        setCustomer(res.data.data)
      }
      return true
    } catch {
      // handled by interceptor
      return false
    }
  }

  const floorPrefixForm = useForm({
    defaultValues: getPrefixDefaultValues('floor', customer),
    onSubmit: async ({ value }) => savePrefixes('floor', value.deviceTypes)
  })

  const rackPrefixForm = useForm({
    defaultValues: getPrefixDefaultValues('rack', customer),
    onSubmit: async ({ value }) => savePrefixes('rack', value.deviceTypes)
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset when customer ID changes
  useEffect(() => {
    if (customer) {
      floorPrefixForm.reset(getPrefixDefaultValues('floor', customer))
      rackPrefixForm.reset(getPrefixDefaultValues('rack', customer))
    }
  }, [customer?._id])

  const getEffectivePrefix = (deviceId: string, category: DeviceCategory) => {
    const formValues =
      category === 'floor' ? floorPrefixForm.state.values.deviceTypes : rackPrefixForm.state.values.deviceTypes
    const formValue = formValues[deviceId]
    if (formValue) return formValue
    const device = STANDARD_DEVICE_TYPES[category].find((d) => d.id === deviceId)
    return device?.defaultPrefix || ''
  }

  const isPrefixDuplicate = (prefix: string, excludeDeviceId: string, category: DeviceCategory) => {
    if (!prefix) return false
    for (const device of STANDARD_DEVICE_TYPES[category]) {
      if (device.id !== excludeDeviceId && getEffectivePrefix(device.id, category) === prefix) return true
    }
    for (const dt of customer?.customDeviceTypes || []) {
      if (dt.category === category && dt.prefix === prefix) return true
    }
    return false
  }

  const isPrefixDuplicateForCustom = (prefix: string, category: DeviceCategory, excludeCustomTypeId?: string) => {
    if (!prefix) return false
    for (const device of STANDARD_DEVICE_TYPES[category]) {
      if (getEffectivePrefix(device.id, category) === prefix) return true
    }
    for (const dt of customer?.customDeviceTypes || []) {
      if (dt.category === category && dt._id !== excludeCustomTypeId && dt.prefix === prefix) return true
    }
    return false
  }

  const openCreateDialog = useCallback((category: DeviceCategory) => {
    setDialogMode('create')
    setDialogCategory(category)
    setEditingDeviceType(undefined)
    setDialogOpen(true)
  }, [])

  const openCreateFloor = useCallback(() => openCreateDialog('floor'), [openCreateDialog])
  const openCreateRack = useCallback(() => openCreateDialog('rack'), [openCreateDialog])

  const openEditDialog = useCallback((deviceType: CustomDeviceType) => {
    setDialogMode('edit')
    setDialogCategory(deviceType.category)
    setEditingDeviceType(deviceType)
    setDialogOpen(true)
  }, [])

  const openDeleteDialog = useCallback((deviceType: CustomDeviceType) => {
    setDeletingDeviceType(deviceType)
    setDeleteDialogOpen(true)
  }, [])

  const handleCreateOrEdit = async (data: { name: string; prefix: string; icon?: string }): Promise<boolean> => {
    if (!customer?._id) return false

    // Validate prefix uniqueness
    if (isPrefixDuplicateForCustom(data.prefix, dialogCategory, editingDeviceType?._id)) {
      toast.error(m.prefix_already_in_use())
      return false
    }

    const existingCustomTypes = customer.customDeviceTypes || []

    let updatedCustomTypes: Partial<CustomDeviceType>[]
    if (dialogMode === 'create') {
      updatedCustomTypes = [
        ...existingCustomTypes,
        { category: dialogCategory, name: data.name, prefix: data.prefix, icon: data.icon }
      ]
    } else if (editingDeviceType) {
      updatedCustomTypes = existingCustomTypes.map((dt) =>
        dt._id === editingDeviceType._id ? { ...dt, name: data.name, prefix: data.prefix, icon: data.icon } : dt
      )
    } else {
      return false
    }

    try {
      const res = await api.patch(`/customer/${customer._id}`, { customDeviceTypes: updatedCustomTypes })
      if (res?.data?.data) {
        queryClient.setQueryData(['customer'], res.data.data)
        setCustomer(res.data.data)
      }
      return true
    } catch {
      // handled by interceptor
      return false
    }
  }

  const handleDelete = async () => {
    if (!customer?._id || !deletingDeviceType) return

    const updatedCustomTypes = (customer.customDeviceTypes || []).filter((dt) => dt._id !== deletingDeviceType._id)

    try {
      const res = await api.patch(`/customer/${customer._id}`, { customDeviceTypes: updatedCustomTypes })
      if (res?.data?.data) {
        queryClient.setQueryData(['customer'], res.data.data)
        setCustomer(res.data.data)
      }
    } catch {
      // handled by interceptor
    }
  }

  const { floorCustomTypes, rackCustomTypes } = useMemo(() => {
    const floor: CustomDeviceType[] = []
    const rack: CustomDeviceType[] = []
    for (const dt of customer?.customDeviceTypes || []) {
      if (dt.category === 'floor') floor.push(dt)
      else if (dt.category === 'rack') rack.push(dt)
    }
    return { floorCustomTypes: floor, rackCustomTypes: rack }
  }, [customer?.customDeviceTypes])

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  if (!user?.isCustomerAdmin) {
    return <UnauthorizedPageAccess />
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <Tabs className="gap-0" value={activeTab} onValueChange={(value) => setActiveTab(value as LibraryTabs)}>
          <div className="w-full bg-background border-b border-border">
            <TabsList className="gap-2 h-12 p-2 rounded-none bg-background">
              <TabsTrigger
                value="rack-devices"
                className="font-normal data-[state=active]:font-medium data-[state=active]:bg-sidebar-accent dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-none hover:bg-sidebar-accent dark:hover:bg-sidebar-accent cursor-pointer">
                {m.rack_devices()}
              </TabsTrigger>
              <TabsTrigger
                value="device-types"
                className="font-normal data-[state=active]:font-medium data-[state=active]:bg-sidebar-accent dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-none hover:bg-sidebar-accent dark:hover:bg-sidebar-accent cursor-pointer">
                {m.device_types()}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="rack-devices">
            <div className="p-4">
              <Card className="rounded-lg pt-3 gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-3">
                  <h2 className="text-lg font-semibold leading-none">{m.custom_rack_devices()}</h2>
                  <div className="flex items-center justify-between md:justify-end gap-2">
                    <DebouncedInput
                      value={rackDeviceGlobalFilter ?? ''}
                      onChange={(value) => setRackDeviceGlobalFilter(String(value))}
                      className="h-7 md:h-8 w-50"
                      placeholder={`${m.search()}...`}
                    />
                    <Button size="sm" onClick={openCreateRackDevice} disabled={readOnly}>
                      <TbPlus />
                      {m.create()}
                    </Button>
                  </div>
                </div>
                <DataTableControlled table={rackDeviceTable} />
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="device-types">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
              <Card className="rounded-lg p-4">
                <h2 className="text-lg font-semibold leading-none">{m.floor_device_types()}</h2>
                <StandardDeviceTypesSection
                  devices={STANDARD_DEVICE_TYPES.floor}
                  form={floorPrefixForm}
                  readOnly={readOnly}
                />
                <CustomDeviceTypesSection
                  items={floorCustomTypes}
                  readOnly={readOnly}
                  onAdd={openCreateFloor}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />
              </Card>
              <Card className="rounded-lg p-4">
                <h2 className="text-lg font-semibold leading-none">{m.rack_device_types()}</h2>
                <StandardDeviceTypesSection
                  devices={STANDARD_DEVICE_TYPES.rack}
                  form={rackPrefixForm}
                  readOnly={readOnly}
                />
                <CustomDeviceTypesSection
                  items={rackCustomTypes}
                  readOnly={readOnly}
                  onAdd={openCreateRack}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      <CustomDeviceTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        category={dialogCategory}
        initialData={editingDeviceType}
        onConfirm={handleCreateOrEdit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={m.delete_custom_device_type()}
        description={m.delete_custom_device_type_confirmation({ name: deletingDeviceType?.name || '' })}
        confirmButtonText={m.delete()}
        onConfirm={handleDelete}
        variant="destructive"
      />

      <RackDeviceEditorDialog
        open={rackDeviceDialogOpen}
        onOpenChange={setRackDeviceDialogOpen}
        initialData={editingRackDevice}
        viewOnly={viewOnlyMode}
        forceEditable={!viewOnlyMode && !!editingRackDevice?.usedInDevices?.length}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['custom-rack-devices'] })}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ['custom-rack-devices'] })}
      />

      <ImpactDialog
        open={impactDialogOpen}
        onOpenChange={setImpactDialogOpen}
        customRackDeviceId={pendingEditDevice?._id}
        usedInDevices={pendingEditDevice?.usedInDevices || []}
        onConfirm={handleImpactConfirm}
      />

      <DeleteRackDeviceDialog
        open={deleteRackDeviceDialogOpen}
        onOpenChange={setDeleteRackDeviceDialogOpen}
        device={deletingRackDevice}
      />

      <Dialog open={viewDevicesDialogOpen} onOpenChange={setViewDevicesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewDevicesTarget?.name}</DialogTitle>
            <DialogDescription>{m.custom_rack_device_used_by_devices()}</DialogDescription>
          </DialogHeader>
          {viewDevicesTarget?.usedInDevices?.length ? (
            <UsedInDevicesList devices={viewDevicesTarget.usedInDevices} />
          ) : (
            <p className="text-sm text-muted-foreground">–</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface StandardDeviceTypesSectionProps {
  devices: { id: string; label: () => string; defaultPrefix: string }[]
  // biome-ignore lint/suspicious/noExplicitAny: form typing is complex
  form: any
  readOnly: boolean
}

function StandardDeviceTypesSection({ devices, form, readOnly }: StandardDeviceTypesSectionProps) {
  const schemas = getValidationSchemas()

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="bg-muted/50 border-b border-border p-3">
        <h3 className="text-sm font-medium leading-none">{m.standard_device_types()}</h3>
      </div>
      <div className="px-3 py-5">
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}>
          <div className="md:columns-2 space-y-2.5">
            {devices.map((device) => (
              <form.Field
                key={device.id}
                name={`deviceTypes.${device.id}`}
                validators={{ onChange: schemas.prefix }}
                // biome-ignore lint/suspicious/noExplicitAny: field typing from form
                children={(field: any) => (
                  <div className="flex items-center">
                    <Label htmlFor={field.name} className="text-sm w-36 shrink-0">
                      {device.label()}
                    </Label>
                    <div className="flex-1">
                      <Input
                        type="text"
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        placeholder={device.defaultPrefix}
                        onBlur={field.handleBlur}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          field.handleChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
                        }
                        maxLength={4}
                        className="w-20 uppercase"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                      />
                      <FieldInfo field={field} />
                    </div>
                  </div>
                )}
              />
            ))}
          </div>
          <div className="mt-4">
            <form.Subscribe
              selector={(state: {
                canSubmit: boolean
                isSubmitting: boolean
                isSubmitted: boolean
                isDirty: boolean
              }) => [state.canSubmit, state.isSubmitting, state.isSubmitted, state.isDirty]}
              children={([canSubmit, isSubmitting, isSubmitted, isDirty]: [boolean, boolean, boolean, boolean]) => (
                <FormSubmitButton
                  disabled={!canSubmit || !isDirty || readOnly}
                  isSubmitting={isSubmitting}
                  isSubmitted={isSubmitted}
                  savingText={m.saving()}
                  savedText={m.saved()}
                  defaultText={m.save_changes()}
                />
              )}
            />
          </div>
        </form>
      </div>
    </div>
  )
}

const RackDeviceName = memo(function RackDeviceName({
  device,
  onView
}: {
  device: CustomRackDevice
  onView: (device: CustomRackDevice) => void
}) {
  const api = useAuthenticatedApi()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/custom-rack-device/${device._id}`)
      onView(res.data.data)
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="text-left text-brand-blue hover:underline cursor-pointer disabled:opacity-50"
      onClick={handleClick}
      disabled={loading}>
      {device.name}
    </button>
  )
})

const RackDeviceActions = memo(function RackDeviceActions({
  device,
  readOnly,
  onEdit,
  onDelete,
  onViewDevices
}: {
  device: CustomRackDevice
  readOnly: boolean
  onEdit: (device: CustomRackDevice) => void
  onDelete: (device: CustomRackDevice) => void
  onViewDevices: (device: CustomRackDevice) => void
}) {
  const api = useAuthenticatedApi()
  const [loading, setLoading] = useState(false)
  const [loadingDevices, setLoadingDevices] = useState(false)

  const handleEdit = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/custom-rack-device/${device._id}`)
      onEdit(res.data.data)
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  const handleViewDevices = async () => {
    setLoadingDevices(true)
    try {
      const res = await api.get(`/custom-rack-device/${device._id}`)
      onViewDevices(res.data.data)
    } catch {
      // handled by interceptor
    } finally {
      setLoadingDevices(false)
    }
  }

  return (
    <div className="flex gap-1 justify-end">
      <Button
        variant="ghost"
        size="xs-icon"
        className="hover:text-primary"
        onClick={handleViewDevices}
        disabled={loadingDevices}>
        {loadingDevices ? <TbLoader2 className="animate-spin" /> : <TbDevices />}
      </Button>
      <Button
        variant="ghost"
        size="xs-icon"
        className="hover:text-primary"
        onClick={handleEdit}
        disabled={loading || readOnly}>
        {loading ? <TbLoader2 className="animate-spin" /> : <TbPencil />}
      </Button>
      <Button
        variant="ghost"
        size="xs-icon"
        className="text-destructive-foreground hover:text-destructive-foreground"
        onClick={() => onDelete(device)}
        disabled={readOnly}>
        <TbTrash />
      </Button>
    </div>
  )
})

interface CustomDeviceTypesSectionProps {
  items: CustomDeviceType[]
  readOnly: boolean
  onAdd: () => void
  onEdit: (dt: CustomDeviceType) => void
  onDelete: (dt: CustomDeviceType) => void
}

const CustomDeviceTypesSection = memo(function CustomDeviceTypesSection({
  items,
  readOnly,
  onAdd,
  onEdit,
  onDelete
}: CustomDeviceTypesSectionProps) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-muted/50 border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium leading-none">{m.custom_device_types()}</h3>
        <Button variant="outline" size="xs" onClick={onAdd} disabled={readOnly}>
          <TbPlus />
          {m.add()}
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-5 text-center">
          <p className="text-sm text-muted-foreground">{m.no_custom_device_types()}</p>
        </div>
      ) : (
        <div className="px-3 py-5 space-y-2.5">
          {items.map((dt) => (
            <div key={dt._id} className="flex items-center justify-between py-1.5 px-3 border border-border rounded-md">
              <div className="flex items-center gap-3">
                {dt.category === 'floor' && (
                  <span className="flex items-center justify-center">
                    {dt.icon ? (
                      <TablerIcon name={dt.icon} size={20} />
                    ) : (
                      <TbSquare className="size-5 text-muted-foreground/50" />
                    )}
                  </span>
                )}
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{dt.prefix}</span>
                <span className="text-sm font-medium">{dt.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm-icon"
                  className="hover:text-primary"
                  onClick={() => onEdit(dt)}
                  disabled={readOnly}>
                  <TbPencil />
                </Button>
                <Button
                  variant="ghost"
                  size="sm-icon"
                  className="hover:text-destructive-foreground"
                  onClick={() => onDelete(dt)}
                  disabled={readOnly}>
                  <TbTrash />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
