import { useState, useEffect, memo, lazy, Suspense } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import {
  Alert,
  AlertDescription,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  Input,
  Label,
  Button,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@patchdocs/ui'
import {
  TbAlertTriangle,
  TbChevronDown,
  TbCircleCheck,
  TbClock,
  TbAlertCircle,
  TbExclamationCircle
} from 'react-icons/tb'
import { checkVAT } from 'jsvat'
import { useAuth0 } from '@auth0/auth0-react'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { useHeader } from '@/hooks/useHeader'
import HelpButton from '@/components/common/HelpButton'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useActiveRacks } from '@/hooks/useActiveRacks'
import { useAppStore } from '@/lib/app-store'
import { cn, isEuCountry, getTaxIdTypesForCountry, jsvatEuCountries } from '@/lib/utils'
import { getValidationSchemas } from '@/lib/schemas'
import { computeBillingStatus, isActiveBillingStatus } from '@/components/billing/billing-utils'
import { getStripePromise } from '@/lib/stripe'
import { firePurchaseEvent } from '@/lib/gtm'
import SubscriptionCard from '@/components/billing/SubscriptionCard'
const SubscribeDialog = lazy(() => import('@/components/billing/SubscribeDialog'))
import BillingDetailsCard from '@/components/billing/BillingDetailsCard'
import PaymentMethodCard from '@/components/billing/PaymentMethodCard'
import BillingHistoryCard from '@/components/billing/BillingHistoryCard'
import SystemIntegratorCard from '@/components/billing/SystemIntegratorCard'
import UnauthorizedPageAccess from '@/components/common/UnauthorizedPageAccess'
import ErrorPage from '@/components/common/ErrorPage'
import Loader from '@/components/common/Loader'
import FieldInfo from '@/components/common/FieldInfo'
import CountrySelect from '@/components/common/CountrySelect'
import FormSubmitButton from '@/components/common/FormSubmitButton'
import DeleteOrganisationDialog from '@/components/dialogs/DeleteOrganisationDialog'
import * as m from '@/paraglide/messages'
import type { Customer } from '@/types'
import type { ActiveRack } from '@/components/billing/billing-utils'

const EMPTY_RACKS: ActiveRack[] = []

type SettingsTab = 'general' | 'billing' | 'log'

const AdminActivityLog = lazy(() => import('@/components/activity/AdminActivityLog'))

const getAddressDefaultValues = (customer: Customer | null | undefined) => ({
  name: customer?.name || '',
  address: {
    line1: customer?.address?.line1 || '',
    line2: customer?.address?.line2 || '',
    city: customer?.address?.city || '',
    state: customer?.address?.state || '',
    postalCode: customer?.address?.postalCode || '',
    countryCode: customer?.address?.countryCode || ''
  },
  taxId: customer?.tax?.taxId || '',
  taxIdType: customer?.tax?.taxIdType || ''
})

const getContactPersonDefaultValues = (customer: Customer | null | undefined) => ({
  contactPerson: {
    firstName: customer?.contactPerson?.firstName || '',
    lastName: customer?.contactPerson?.lastName || '',
    email: customer?.contactPerson?.email || '',
    phone: customer?.contactPerson?.phone || '',
    jobTitle: customer?.contactPerson?.jobTitle || '',
    department: customer?.contactPerson?.department || ''
  }
})

const settingsTabs = ['general', 'billing', 'log'] as const

export const Route = createFileRoute('/app/settings')({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: settingsTabs.includes(search.tab as SettingsTab) ? (search.tab as SettingsTab) : 'general'
  })
})

function SettingsPage() {
  useHeader({
    title: m.settings(),
    buttons: [<HelpButton key="help" docSlug="administration/subscription-billing" variant="outline" size="sm-icon" />]
  })
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { logout } = useAuth0()
  const user = useAppStore((state) => state.user)
  const customer = useAppStore((state) => state.customer)
  const activeTenant = useAppStore((state) => state.activeTenant)
  const navigate = useNavigate({ from: Route.fullPath })
  const { tab: activeTab } = Route.useSearch()
  const setActiveTab = (tab: SettingsTab) => navigate({ search: { tab }, replace: true })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const { data: activeRacks, error: racksError, isLoading: racksLoading } = useActiveRacks()

  // Handle Stripe redirect (3DS / payment confirmation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setupIntentId = params.get('setup_intent')
    const redirectStatus = params.get('redirect_status')
    const flow = params.get('flow')

    if (setupIntentId && redirectStatus === 'succeeded') {
      if (flow === 'subscribe' && customer?._id) {
        // Subscribe flow redirect — confirm the subscription
        api
          .post(`/customer/${customer._id}/billing/subscribe/confirm`, { setupIntentId })
          .then((res) => {
            toast.success(m.billing_subscribe_success())
            queryClient.invalidateQueries({ queryKey: ['customer'] })
            const data = res?.data?.data as { invoiceId?: string | null; currency?: string } | undefined
            if (user?.email) {
              void firePurchaseEvent({
                email: user.email,
                invoiceId: data?.invoiceId ?? null,
                currency: data?.currency ?? 'eur'
              })
            }
          })
          .catch(() => {
            toast.error(m.billing_subscribe_error())
          })
      } else if (flow === 'update-payment-method' && customer?._id) {
        // PM update redirect — retrieve SetupIntent to get paymentMethodId, then set as default
        const clientSecret = params.get('setup_intent_client_secret')
        if (clientSecret) {
          getStripePromise().then((stripe) => {
            if (!stripe) return
            stripe.retrieveSetupIntent(clientSecret).then(({ setupIntent: si }) => {
              if (si?.payment_method) {
                api
                  .post(`/customer/${customer._id}/billing/set-default-payment-method`, {
                    paymentMethodId: si.payment_method
                  })
                  .then(() => {
                    toast.success(m.billing_update_payment_method_success())
                    queryClient.invalidateQueries({ queryKey: ['customer'] })
                    queryClient.invalidateQueries({ queryKey: ['payment-method'] })
                  })
                  .catch(() => {
                    toast.error(m.billing_update_payment_method_error())
                  })
              }
            })
          })
        }
      } else {
        toast.success(m.billing_payment_success())
        queryClient.invalidateQueries({ queryKey: ['customer'] })
      }
      navigate({ search: { tab: 'billing' }, replace: true })
    }
  }, [api, customer?._id, queryClient, navigate, user?.email])

  const handleDeleteCustomer = async (reason: string, feedback: string) => {
    if (!customer?._id) return
    setIsDeleting(true)
    try {
      await api.delete(`/customer/${customer._id}`, {
        data: { reason: reason || undefined, feedback: feedback || undefined }
      })
      posthog?.reset()
      logout({ logoutParams: { returnTo: import.meta.env.VITE_LOGOUT_URL } })
    } catch (error) {
      // handled by interceptor
      setIsDeleting(false)
      throw error
    }
  }

  if (!user?.isCustomerAdmin) {
    return <UnauthorizedPageAccess />
  }

  if (racksError) {
    return <ErrorPage error={racksError as Error} />
  }

  if (racksLoading || !customer) {
    return <Loader />
  }

  const billingStatus = computeBillingStatus(customer.billing)
  const showBilling = billingStatus !== 'exempt'
  const effectiveTab = !showBilling && activeTab === 'billing' ? 'general' : activeTab

  const tabTriggerClassName =
    'font-normal data-[state=active]:font-medium data-[state=active]:bg-sidebar-accent dark:data-[state=active]:bg-sidebar-accent data-[state=active]:shadow-none hover:bg-sidebar-accent dark:hover:bg-sidebar-accent cursor-pointer'

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <Tabs className="gap-0" value={effectiveTab} onValueChange={(value) => setActiveTab(value as SettingsTab)}>
          <div className="w-full bg-background border-b border-border">
            <TabsList className="gap-2 h-12 p-2 rounded-none bg-background">
              <TabsTrigger value="general" className={tabTriggerClassName}>
                {m.general()}
              </TabsTrigger>
              {showBilling && (
                <TabsTrigger value="billing" className={tabTriggerClassName}>
                  {m.billing()}
                </TabsTrigger>
              )}
              <TabsTrigger value="log" className={tabTriggerClassName}>
                {m.admin_log()}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="general">
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 p-4">
              <AddressFormCard customerData={customer} />
              <ContactPersonFormCard customerData={customer} />
              <SystemIntegratorCard customer={customer} />
            </div>
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 p-4 mt-6">
              <Card className="rounded-lg ring-destructive/20 p-0 gap-0">
                <div className="p-3 border-b border-destructive/20">
                  <h2 className="text-base font-semibold text-destructive-foreground">{m.danger_zone()}</h2>
                </div>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 transition-colors [&[data-state=open]>svg]:rotate-180 cursor-pointer">
                    <span className="text-sm font-medium">{m.delete_organisation()}</span>
                    <TbChevronDown className="h-4 w-4 transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3">
                      {isActiveBillingStatus(billingStatus) ? (
                        <p className="text-sm text-muted-foreground">{m.delete_organisation_active_subscription()}</p>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">{m.delete_organisation_description()}</p>
                          <Button
                            variant="destructive"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            disabled={isDeleting}>
                            {m.delete_organisation()}
                          </Button>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          </TabsContent>
          {showBilling && (
            <TabsContent value="billing">
              <div className="flex flex-col gap-4 p-4">
                <div className="grid grid-cols-4 gap-4 items-start">
                  <div className="flex flex-col gap-4 col-span-4 3xl:col-span-2">
                    <SubscriptionCard
                      customer={customer}
                      billingStatus={billingStatus}
                      activeRacks={activeRacks ?? EMPTY_RACKS}
                      onSubscribeClick={() => setSubscribeOpen(true)}
                    />
                    <BillingHistoryCard customer={customer} />
                  </div>
                  <BillingDetailsCard customer={customer} />
                  <PaymentMethodCard customer={customer} />
                </div>
              </div>
            </TabsContent>
          )}
          <TabsContent value="log">
            <div className="p-4">
              <Suspense fallback={<Loader />}>
                <AdminActivityLog level="customer" tenantId={activeTenant?._id} />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      <DeleteOrganisationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteCustomer}
      />

      {showBilling && subscribeOpen && (
        <Suspense fallback={null}>
          <SubscribeDialog
            open={subscribeOpen}
            onOpenChange={setSubscribeOpen}
            customer={customer}
            activeRacks={activeRacks ?? EMPTY_RACKS}
          />
        </Suspense>
      )}
    </div>
  )
}

interface VatStatusInfo {
  color: string
  textColor: string
  icon: React.ReactNode
  tooltip: string
}

function getVatStatusInfo(customer: Customer): VatStatusInfo | null {
  const status = customer.tax?.vatValidation?.status
  const nameMatch = customer.tax?.vatValidation?.nameMatch

  // Don't show status when there's no taxId saved (e.g. invalid attempt was rejected)
  if (!customer.tax?.taxId && status !== 'pending') return null

  switch (status) {
    case 'verified':
      return nameMatch === false
        ? {
            color: 'yellow-500',
            textColor: 'yellow-700 dark:text-yellow-400',
            icon: <TbAlertTriangle />,
            tooltip: m.billing_vat_name_mismatch()
          }
        : {
            color: 'green-500',
            textColor: 'green-600 dark:text-green-400',
            icon: <TbCircleCheck />,
            tooltip: m.billing_vat_status_verified()
          }
    case 'pending':
      return {
        color: 'yellow-500',
        textColor: 'yellow-700 dark:text-yellow-400',
        icon: <TbClock />,
        tooltip: m.billing_vat_status_pending()
      }
    case 'invalid':
      return {
        color: 'red-500',
        textColor: 'red-600 dark:text-red-400',
        icon: <TbExclamationCircle />,
        tooltip: m.billing_vat_status_invalid()
      }
    case 'unavailable':
      return {
        color: 'orange-500',
        textColor: 'orange-600 dark:text-orange-400',
        icon: <TbAlertCircle />,
        tooltip: m.billing_vat_status_unavailable()
      }
    default:
      return null
  }
}

function VatStatusIcon({ customer }: { customer: Customer }) {
  const info = getVatStatusInfo(customer)
  if (!info) return null

  return <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-base text-${info.color}`}>{info.icon}</span>
}

const AddressFormCard = memo(function AddressFormCard({ customerData }: { customerData: Customer }) {
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const validationSchemas = getValidationSchemas()

  const addressForm = useForm({
    defaultValues: getAddressDefaultValues(customerData),
    onSubmit: async ({ value }) => {
      const countryCode = value.address.countryCode
      const taxIdTypes = getTaxIdTypesForCountry(countryCode)
      const updateData: Record<string, unknown> = {
        name: value.name.trim(),
        address: {
          line1: value.address.line1.trim(),
          line2: value.address.line2.trim(),
          city: value.address.city.trim(),
          state: value.address.state.trim(),
          postalCode: value.address.postalCode.trim(),
          countryCode
        },
        tax: {
          taxId: value.taxId.trim(),
          taxIdType: isEuCountry(countryCode)
            ? 'eu_vat'
            : value.taxIdType || (taxIdTypes.length === 1 ? taxIdTypes[0].type : undefined)
        }
      }
      try {
        const response = await api.patch(`/customer/${customerData._id}`, updateData)
        const warnings = (response?.data as Record<string, unknown>)?.warnings as string[] | undefined
        if (warnings?.length) {
          for (const w of warnings) {
            if (w === 'vat_pending') toast.info(m.billing_vat_status_pending())
            else if (w === 'vat_invalid') toast.error(m.billing_vat_status_invalid())
          }
          if (warnings.includes('vat_invalid')) {
            addressForm.setFieldValue('taxId', customerData.tax?.taxId || '')
            queryClient.invalidateQueries({ queryKey: ['customer'] })
            throw new Error('vat_invalid') // prevent green "Saved!" flicker
          }
        }
        queryClient.invalidateQueries({ queryKey: ['customer'] })
      } catch (err) {
        // 400 (e.g. invalid VAT) — interceptor already toasted; reset taxId so form matches server state
        addressForm.setFieldValue('taxId', customerData.tax?.taxId || '')
        throw err // re-throw so tanstack-form doesn't flip isSubmitted → green "Saved!" state
      }
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset when customer ID changes
  useEffect(() => {
    addressForm.reset(getAddressDefaultValues(customerData))
  }, [customerData._id])

  const vatStatus = customerData.tax?.vatValidation?.status
  const vatPending = vatStatus === 'pending'
  const addr = customerData.address
  const missingAddress = !(addr?.line1 && addr?.city && addr?.postalCode)

  return (
    <Card className="rounded-lg p-4">
      <h2 className="text-lg font-semibold leading-none mb-2 md:mb-4">{m.address()}</h2>
      {missingAddress && (
        <Alert className="mb-2 border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {m.billing_address_incomplete()}
          </AlertDescription>
        </Alert>
      )}
      {vatStatus === 'pending' && (
        <Alert className="mb-2 border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <TbClock className="h-4 w-4" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {m.billing_vat_status_pending()}
          </AlertDescription>
        </Alert>
      )}
      <form
        className="grid grid-cols-2 gap-2 md:gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          addressForm.handleSubmit().catch(() => {
            // intentional re-throw inside onSubmit; handled by interceptor
          })
        }}>
        <addressForm.Field
          name="name"
          validators={{ onChange: validationSchemas.stringRequiredMax100 }}
          children={(field) => (
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor={field.name} className="text-xs font-semibold">
                {m.company_name()}
              </Label>
              <Input
                type="text"
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                disabled={vatPending}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
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
                disabled={vatPending}
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
                disabled={vatPending}
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
                disabled={vatPending}
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
                disabled={vatPending}
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
                disabled={vatPending}
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
              <CountrySelect
                value={field.state.value}
                onChange={(value) => {
                  field.handleChange(value)
                  addressForm.setFieldValue('taxId', '')
                  addressForm.setFieldValue('taxIdType', '')
                }}
                disabled={vatPending}
              />
              <FieldInfo field={field} />
            </div>
          )}
        />
        <addressForm.Subscribe
          selector={(state) => [state.values.address.countryCode, state.values.taxIdType]}
          children={([countryCode, selectedTaxIdType]) => {
            const isEu = isEuCountry(countryCode as string)
            const taxIdTypes = getTaxIdTypesForCountry(countryCode as string)
            const showDropdown = !isEu && taxIdTypes.length > 1

            return (
              <>
                {showDropdown && (
                  <addressForm.Field
                    name="taxIdType"
                    validators={{
                      onSubmit: ({ value, fieldApi }) => {
                        const currentCountry = fieldApi.form.getFieldValue('address.countryCode')
                        if (isEuCountry(currentCountry)) return undefined
                        const taxId = fieldApi.form.getFieldValue('taxId')
                        if (taxId && !value) return m.field_required()
                        return undefined
                      }
                    }}
                    children={(field) => (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={field.name} className="text-xs font-semibold">
                          {m.billing_tax_id_type()}
                        </Label>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value)}
                          disabled={vatPending}>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {taxIdTypes.map((t) => (
                              <SelectItem key={t.type} value={t.type}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldInfo field={field} />
                      </div>
                    )}
                  />
                )}
                <addressForm.Field
                  name="taxId"
                  validators={(() => {
                    const jsvatCountry = jsvatEuCountries.filter((c) => c.codes[0] === countryCode)
                    const validate = ({ value }: { value: string }) => {
                      if (!value) return isEu ? m.field_required() : undefined
                      if (isEu && value.trim()) {
                        const result = checkVAT(value.trim(), jsvatCountry)
                        if (!result.isValid) return m.billing_vat_status_invalid()
                      }
                      return undefined
                    }
                    return { onBlur: validate, onSubmit: validate }
                  })()}
                  children={(field) => {
                    const vatInfo = getVatStatusInfo(customerData)
                    return (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={field.name} className="text-xs font-semibold">
                          {m.billing_tax_id()}
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={vatPending}
                            className={cn(
                              'pr-8',
                              vatInfo && vatInfo.color !== 'green-500' && `border-${vatInfo.color}`
                            )}
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                          />
                          <VatStatusIcon customer={customerData} />
                        </div>
                        {vatInfo && vatInfo.color !== 'green-500' ? (
                          <p className={`text-xs text-${vatInfo.textColor}`}>{vatInfo.tooltip}</p>
                        ) : (
                          !vatInfo &&
                          (() => {
                            const example = isEu
                              ? taxIdTypes.find((t) => t.type === 'eu_vat')?.example
                              : taxIdTypes.find((t) => t.type === selectedTaxIdType)?.example ||
                                (taxIdTypes.length === 1 ? taxIdTypes[0].example : undefined)
                            return example ? (
                              <p className="text-xs text-muted-foreground">
                                {m.billing_tax_id_placeholder_example({ example })}
                              </p>
                            ) : null
                          })()
                        )}
                        <FieldInfo field={field} />
                      </div>
                    )
                  }}
                />
              </>
            )
          }}
        />
        <div className="col-span-2 pt-4">
          <addressForm.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting, state.isSubmitted, state.isDirty]}
            children={([canSubmit, isSubmitting, isSubmitted, isDirty]) => (
              <FormSubmitButton
                disabled={!canSubmit || !isDirty || vatPending}
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

const ContactPersonFormCard = memo(function ContactPersonFormCard({ customerData }: { customerData: Customer }) {
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const validationSchemas = getValidationSchemas()

  const contactPersonForm = useForm({
    defaultValues: getContactPersonDefaultValues(customerData),
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
        await api.patch(`/customer/${customerData._id}`, updateData)
        queryClient.invalidateQueries({ queryKey: ['customer'] })
      } catch {
        // handled by interceptor
      }
    }
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset when customer ID changes
  useEffect(() => {
    contactPersonForm.reset(getContactPersonDefaultValues(customerData))
  }, [customerData._id])

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
                disabled={!canSubmit || !isDirty}
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
