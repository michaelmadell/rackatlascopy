import { useEffect, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  ScrollArea
} from '@/patchdocs-ui'
import { TbLoader2 } from 'react-icons/tb'
import { toast } from 'sonner'
import type { SearchBoxFeatureSuggestion } from '@mapbox/search-js-core'
import FieldInfo from '@/components/common/FieldInfo'
import AddressSearch from '@/components/map/AddressSearch'
import Combobox from '@/components/common/Combobox'
import CountrySelect from '@/components/common/CountrySelect'
import { useResponsibleUserOptions } from '@/hooks/useResponsibleUserOptions'
import { getValidationSchemas } from '@/lib/schemas'
import { getCoordinatesFromAddress } from '@/lib/utils'
import * as m from '@/paraglide/messages'
import type { Location, PermissionsCheckResult } from '@/types'

interface EditLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: Location | null
  permissions?: PermissionsCheckResult
  readOnly?: boolean
  onSave: (id: string, data: Partial<Location>) => Promise<boolean>
}

/** The Save button sits in the footer, outside the scrolling form, and submits it via the `form` attribute. */
const FORM_ID = 'edit-location-form'

const getFormValues = (location: Location | null) => ({
  reference: location?.reference || '',
  name: location?.name || '',
  responsibleUserId: location?.responsibleUserId ?? '',
  address: {
    line1: location?.address?.line1 || '',
    line2: location?.address?.line2 || '',
    city: location?.address?.city || '',
    state: location?.address?.state || '',
    postalCode: location?.address?.postalCode || '',
    countryCode: location?.address?.countryCode || ''
  },
  contactPerson: {
    firstName: location?.contactPerson?.firstName || '',
    lastName: location?.contactPerson?.lastName || '',
    email: location?.contactPerson?.email || '',
    phone: location?.contactPerson?.phone || '',
    jobTitle: location?.contactPerson?.jobTitle || '',
    department: location?.contactPerson?.department || ''
  }
})

const EditLocationDialog = ({
  open,
  onOpenChange,
  location,
  readOnly,
  onSave
}: EditLocationDialogProps) => {
  // No permissions system on this backend (crud-factory never returns a
  // `permissions` object) — readOnly (billing-status-derived, computed by
  // the caller) is the only real write gate here.
  const canWrite = !readOnly
  const validationSchemas = getValidationSchemas()
  const userOptions = useResponsibleUserOptions()
  // Coordinates picked from the address search; they win over geocoding the typed-in fields.
  const searchedCoords = useRef<{ latitude: number; longitude: number } | null>(null)

  const form = useForm({
    defaultValues: getFormValues(location),
    onSubmit: async ({ value }) => {
      if (!location) return

      const data: Partial<Location> = {
        reference: value.reference.trim(),
        name: value.name.trim(),
        responsibleUserId: value.responsibleUserId ? value.responsibleUserId : null,
        address: {
          line1: value.address.line1.trim(),
          line2: value.address.line2.trim(),
          city: value.address.city.trim(),
          state: value.address.state.trim(),
          postalCode: value.address.postalCode.trim(),
          countryCode: value.address.countryCode
        },
        contactPerson: {
          firstName: value.contactPerson.firstName.trim(),
          lastName: value.contactPerson.lastName.trim(),
          email: value.contactPerson.email.trim(),
          phone: value.contactPerson.phone.trim(),
          jobTitle: value.contactPerson.jobTitle.trim(),
          department: value.contactPerson.department.trim()
        }
      }

      const addressChanged =
        value.address.line1.trim() !== (location.address?.line1 || '') ||
        value.address.city.trim() !== (location.address?.city || '') ||
        value.address.postalCode.trim() !== (location.address?.postalCode || '') ||
        value.address.countryCode !== (location.address?.countryCode || '')

      if (searchedCoords.current) {
        data.latitude = searchedCoords.current.latitude
        data.longitude = searchedCoords.current.longitude
      } else if (addressChanged) {
        const coordinates = await getCoordinatesFromAddress(value.address)
        if (coordinates) {
          data.latitude = coordinates.latitude
          data.longitude = coordinates.longitude
        } else {
          // The marker keeps its old position — say so instead of letting it drift silently.
          toast.warning(m.location_geocoding_failed())
        }
      }

      const success = await onSave(location._id, data)
      if (success) onOpenChange(false)
    }
  })

  // Reset when opening, or when switching to another location
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on open / location change
  useEffect(() => {
    searchedCoords.current = null
    form.reset(getFormValues(location))
  }, [location?._id, open])

  const handleAddressSelect = (feature: SearchBoxFeatureSuggestion) => {
    if (feature?.geometry?.coordinates) {
      const [lng, lat] = feature.geometry.coordinates
      searchedCoords.current = { latitude: lat, longitude: lng }
    }
    form.setFieldValue('address', {
      line1: feature?.properties?.address || '',
      line2: '',
      city: feature?.properties?.context?.place?.name || '',
      state: feature?.properties?.context?.region?.name || '',
      postalCode: feature?.properties?.context?.postcode?.name || '',
      countryCode: feature?.properties?.context?.country?.country_code || ''
    })
  }

  if (!location) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{m.edit_resource({ resource: m.location() })}</DialogTitle>
          <DialogDescription>{m.location_edit_dialog_description()}</DialogDescription>
        </DialogHeader>
        {/* Reserve more below the fold on mobile: the footer stacks its buttons there, so it's a row taller. */}
        <ScrollArea className="-mx-1 max-h-[calc(90vh-14.5rem)] sm:max-h-[calc(90vh-11rem)] w-0 min-w-[calc(100%+0.5rem)]">
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}>
            <div className="grid gap-4 pt-1 pb-2 pl-1 pr-3.5">
              <div className="flex gap-3">
                <form.Field
                  name="reference"
                  validators={{ onChange: validationSchemas.reference }}
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>{m.id()} *</Label>
                      <Input
                        id={field.name}
                        type="text"
                        className="uppercase"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        disabled={!canWrite}
                      />
                      <FieldInfo field={field} />
                    </div>
                  )}
                />
                <form.Field
                  name="name"
                  validators={{ onChange: validationSchemas.stringRequiredMax100 }}
                  children={(field) => (
                    <div className="space-y-2 w-2/3">
                      <Label htmlFor={field.name}>{m.name()} *</Label>
                      <Input
                        id={field.name}
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        disabled={!canWrite}
                      />
                      <FieldInfo field={field} />
                    </div>
                  )}
                />
              </div>

              <form.Field
                name="responsibleUserId"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>{m.responsible_person()}</Label>
                    <Combobox
                      options={userOptions}
                      value={field.state.value}
                      onChange={field.handleChange}
                      disabled={!canWrite}
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              />

              {/* Address Section */}
              <div className="space-y-3 border-t border-border pt-2">
                <h3 className="text-sm font-semibold mb-4">{m.address()}</h3>
                <div className="grid gap-3">
                  {canWrite && (
                    <div className="space-y-2">
                      <AddressSearch
                        onSelect={handleAddressSelect}
                        placeholder={m.location_create_dialog_address_placeholder()}
                        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                      />
                      <p className="text-sm text-muted-foreground">{m.location_edit_dialog_address_search_hint()}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="address.line1"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.address_line1()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            placeholder={m.address_line1_placeholder()}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                    <form.Field
                      name="address.line2"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.address_line2()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            placeholder={m.address_line2_placeholder()}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="address.city"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.address_city()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            placeholder={m.address_city_placeholder()}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                    <form.Field
                      name="address.state"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.address_state()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            placeholder={m.address_state_placeholder()}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="address.postalCode"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.address_postalCode()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            placeholder={m.address_postalCode_placeholder()}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                    <form.Field
                      name="address.countryCode"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.address_country()}</Label>
                          <CountrySelect
                            value={field.state.value}
                            onChange={field.handleChange}
                            placeholder={m.country_select_placeholder()}
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Person Section */}
              <div className="space-y-3 border-t border-border pt-2">
                <h3 className="text-sm font-semibold mb-4">{m.contact_person()}</h3>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="contactPerson.firstName"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.first_name()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            placeholder={m.first_name_placeholder()}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                    <form.Field
                      name="contactPerson.lastName"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.last_name()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            placeholder={m.last_name_placeholder()}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                  </div>
                  <form.Field
                    name="contactPerson.email"
                    validators={{ onChange: validationSchemas.emailOptional }}
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>{m.email()}</Label>
                        <Input
                          id={field.name}
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          autoComplete="off"
                          disabled={!canWrite}
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  />
                  <form.Field
                    name="contactPerson.phone"
                    validators={{ onChange: validationSchemas.phoneOptional }}
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>{m.phone()}</Label>
                        <Input
                          id={field.name}
                          type="text"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          autoComplete="off"
                          disabled={!canWrite}
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field
                      name="contactPerson.jobTitle"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.job_title()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                    <form.Field
                      name="contactPerson.department"
                      validators={{ onChange: validationSchemas.stringMax100 }}
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>{m.department()}</Label>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            autoComplete="off"
                            disabled={!canWrite}
                          />
                          <FieldInfo field={field} />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {m.cancel()}
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button type="submit" form={FORM_ID} disabled={!canSubmit || isSubmitting || !canWrite}>
                {isSubmitting ? (
                  <>
                    <TbLoader2 className="animate-spin" /> {m.saving()}&hellip;
                  </>
                ) : (
                  m.save_changes()
                )}
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditLocationDialog
