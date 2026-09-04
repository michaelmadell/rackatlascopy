import { useState, useEffect, memo, lazy, Suspense } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger, Card, Input, Label } from '@patchdocs/ui'
import { useHeader } from '@/hooks/useHeader'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useAppStore } from '@/lib/app-store'
import { isUserAdminOfCurrentTenant } from '@/lib/utils'
import { getValidationSchemas } from '@/lib/schemas'
import UnauthorizedPageAccess from '@/components/common/UnauthorizedPageAccess'
import BlockedPageAccess from '@/components/common/BlockedPageAccess'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import FieldInfo from '@/components/common/FieldInfo'
import CountrySelect from '@/components/common/CountrySelect'
import FormSubmitButton from '@/components/common/FormSubmitButton'
import * as m from '@/paraglide/messages'
import type { Tenant } from '@/types'

type TenantSettingsTabs = 'general' | 'log'

const AdminActivityLog = lazy(() => import('@/components/activity/AdminActivityLog'))

const getAddressDefaultValues = (tenant: Tenant | null | undefined) => ({
  address: {
    line1: tenant?.address?.line1 || '',
    line2: tenant?.address?.line2 || '',
    city: tenant?.address?.city || '',
    state: tenant?.address?.state || '',
    postalCode: tenant?.address?.postalCode || '',
    countryCode: tenant?.address?.countryCode || ''
  }
})

const getContactPersonDefaultValues = (tenant: Tenant | null | undefined) => ({
  contactPerson: {
    firstName: tenant?.contactPerson?.firstName || '',
    lastName: tenant?.contactPerson?.lastName || '',
    email: tenant?.contactPerson?.email || '',
    phone: tenant?.contactPerson?.phone || '',
    jobTitle: tenant?.contactPerson?.jobTitle || '',
    department: tenant?.contactPerson?.department || ''
  }
})

export const Route = createFileRoute('/app/t/$tenantId/settings')({
  component: TenantSettingsPage
})

function TenantSettingsPage() {
  useHeader({ title: m.tenant_settings() })
  const { tenantId } = Route.useParams()
  const navigate = useNavigate()
  const api = useAuthenticatedApi()
  const user = useAppStore((state) => state.user)
  const billingStatus = useAppStore((state) => state.billingStatus)
  const readOnly = billingStatus === 'read_only'
  const customer = useAppStore((state) => state.customer)
  const [activeTab, setActiveTab] = useState<TenantSettingsTabs>('general')

  const {
    data: tenant,
    error: tenantError,
    isPending
  } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const response = await api.get(`/tenant/${tenantId}`)
      return response.data.data as Tenant
    }
  })

  useEffect(() => {
    if (customer?.accountType !== 'systemIntegrator' || user?.isCustomerAdmin) {
      navigate({ to: '/app/settings', search: { tab: 'general' } })
    }
  }, [navigate, customer?.accountType, user?.isCustomerAdmin])

  if (tenantError) {
    return <ErrorPage error={tenantError} />
  }

  if (isPending) {
    return <Loader />
  }

  if (billingStatus === 'blocked') {
    return <BlockedPageAccess />
  }

  const isTenantAdmin = isUserAdminOfCurrentTenant(user, tenant ?? null)
  if (!isTenantAdmin) {
    return <UnauthorizedPageAccess />
  }

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <Tabs className="gap-0" value={activeTab} onValueChange={(value) => setActiveTab(value as TenantSettingsTabs)}>
          <div className="w-full bg-background border-b border-border">
            <TabsList className="gap-2 h-12 p-2 rounded-none bg-background">
              <TabsTrigger
                value="general"
                className="font-normal data-[state=active]:font-medium data-[state=active]:bg-sidebar-accent dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-none cursor-pointer">
                {m.general()}
              </TabsTrigger>
              {!user?.isCustomerAdmin && (
                <TabsTrigger
                  value="log"
                  className="font-normal data-[state=active]:font-medium data-[state=active]:bg-sidebar-accent dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-none cursor-pointer">
                  {m.admin_log()}
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <TabsContent value="general">
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 p-4">
              <AddressFormCard tenant={tenant} tenantId={tenantId} readOnly={readOnly} />
              <ContactPersonFormCard tenant={tenant} tenantId={tenantId} readOnly={readOnly} />
            </div>
          </TabsContent>
          <TabsContent value="log">
            <div className="p-4">
              <Suspense fallback={<Loader />}>
                <AdminActivityLog level="tenant" tenantId={tenantId} />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  )
}

const AddressFormCard = memo(function AddressFormCard({
  tenant,
  tenantId,
  readOnly
}: {
  tenant: Tenant
  tenantId: string
  readOnly: boolean
}) {
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const validationSchemas = getValidationSchemas()

  const addressForm = useForm({
    defaultValues: getAddressDefaultValues(tenant),
    onSubmit: async ({ value }) => {
      const updateData = {
        address: {
          line1: value.address.line1.trim(),
          line2: value.address.line2.trim(),
          city: value.address.city.trim(),
          state: value.address.state.trim(),
          postalCode: value.address.postalCode.trim(),
          countryCode: value.address.countryCode
        }
      }
      try {
        const res = await api.patch(`/tenant/${tenant._id}`, updateData)
        if (res?.data?.data) {
          queryClient.setQueryData(['tenant', tenantId], res.data.data)
        }
      } catch {
        // handled by interceptor
      }
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset when tenant ID changes
  useEffect(() => {
    addressForm.reset(getAddressDefaultValues(tenant))
  }, [tenant._id])

  return (
    <Card className="rounded-lg p-4">
      <h2 className="text-lg font-semibold leading-none mb-2 md:mb-4">{m.address()}</h2>
      <form
        className="grid grid-cols-2 gap-2 md:gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          addressForm.handleSubmit()
        }}>
        <addressForm.Field
          name="address.line1"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.address_line1()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <addressForm.Field
          name="address.line2"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.address_line2()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <addressForm.Field
          name="address.city"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.address_city()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <addressForm.Field
          name="address.state"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.address_state()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <addressForm.Field
          name="address.postalCode"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.address_postalCode()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <addressForm.Field
          name="address.countryCode"
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.address_country()}
              </Label>
              <CountrySelect value={field.state.value} onChange={field.handleChange} />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <div className="col-span-2 pt-4">
          <addressForm.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting, state.isSubmitted, state.isDirty]}
            children={([canSubmit, isSubmitting, isSubmitted, isDirty]) => (
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
    </Card>
  )
})

const ContactPersonFormCard = memo(function ContactPersonFormCard({
  tenant,
  tenantId,
  readOnly
}: {
  tenant: Tenant
  tenantId: string
  readOnly: boolean
}) {
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const validationSchemas = getValidationSchemas()

  const contactPersonForm = useForm({
    defaultValues: getContactPersonDefaultValues(tenant),
    onSubmit: async ({ value }) => {
      const updateData = {
        contactPerson: {
          firstName: value.contactPerson.firstName.trim(),
          lastName: value.contactPerson.lastName.trim(),
          email: value.contactPerson.email.trim(),
          phone: value.contactPerson.phone.trim(),
          jobTitle: value.contactPerson.jobTitle.trim(),
          department: value.contactPerson.department.trim()
        }
      }
      try {
        const res = await api.patch(`/tenant/${tenant._id}`, updateData)
        if (res?.data?.data) {
          queryClient.setQueryData(['tenant', tenantId], res.data.data)
        }
      } catch {
        // handled by interceptor
      }
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset when tenant ID changes
  useEffect(() => {
    contactPersonForm.reset(getContactPersonDefaultValues(tenant))
  }, [tenant._id])

  return (
    <Card className="rounded-lg p-4">
      <h2 className="text-lg font-semibold leading-none mb-2 md:mb-4">{m.contact_person()}</h2>
      <form
        className="grid grid-cols-2 gap-2 md:gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          contactPersonForm.handleSubmit()
        }}>
        <contactPersonForm.Field
          name="contactPerson.firstName"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.first_name()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <contactPersonForm.Field
          name="contactPerson.lastName"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.last_name()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <contactPersonForm.Field
          name="contactPerson.email"
          validators={{ onChange: validationSchemas.emailOptional }}
          children={(field) => (
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.email()}
              </Label>
              <Input
                type="email"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <contactPersonForm.Field
          name="contactPerson.phone"
          validators={{ onChange: validationSchemas.phoneOptional }}
          children={(field) => (
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.phone()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <contactPersonForm.Field
          name="contactPerson.jobTitle"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.job_title()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <contactPersonForm.Field
          name="contactPerson.department"
          validators={{ onChange: validationSchemas.stringMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.department()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <div className="col-span-2 pt-4">
          <contactPersonForm.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting, state.isSubmitted, state.isDirty]}
            children={([canSubmit, isSubmitting, isSubmitted, isDirty]) => (
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
    </Card>
  )
})
