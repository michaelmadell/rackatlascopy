import { useState } from 'react'
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
  Label
} from '@patchdocs/ui'
import { TbLoader2 } from 'react-icons/tb'
import type { SearchBoxFeatureSuggestion } from '@mapbox/search-js-core'
import FieldInfo from '@/components/common/FieldInfo'
import AddressSearch from '@/components/map/AddressSearch'
import Combobox from '@/components/common/Combobox'
import { useResponsibleUserOptions } from '@/hooks/useResponsibleUserOptions'
import { useAppStore } from '@/lib/app-store'
import { getValidationSchemas } from '@/lib/schemas'
import * as m from '@/paraglide/messages'
import type { Address } from '@/types'

interface LocationFormData {
  name: string
  reference: string
  responsibleUserId?: string | null
  address: Address
  latitude: number
  longitude: number
}

interface CreateLocationDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: LocationFormData) => Promise<boolean> | boolean
}

const getInitialFormValues = (userId?: string) => ({
  reference: '',
  name: '',
  responsibleUserId: userId || '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    countryCode: ''
  },
  latitude: 0,
  longitude: 0
})

const CreateLocationDialog = ({ open, onClose, onSave }: CreateLocationDialogProps) => {
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false)
  const validationSchemas = getValidationSchemas()
  const user = useAppStore((state) => state.user)
  const userOptions = useResponsibleUserOptions()

  const form = useForm({
    defaultValues: getInitialFormValues(user?._id),
    onSubmit: async ({ value }) => {
      if (!value.latitude || !value.longitude) return

      const data: LocationFormData = {
        name: value.name.trim(),
        reference: value.reference.trim(),
        responsibleUserId: value.responsibleUserId ? value.responsibleUserId : null,
        address: value.address,
        latitude: value.latitude,
        longitude: value.longitude
      }
      const success = await onSave(data)
      if (success) {
        form.reset(getInitialFormValues(user?._id))
        setHasSelectedLocation(false)
      }
    }
  })

  const handleClose = () => {
    form.reset(getInitialFormValues(user?._id))
    setHasSelectedLocation(false)
    onClose()
  }

  const handleAddressSelect = (feature: SearchBoxFeatureSuggestion) => {
    if (feature?.geometry?.coordinates) {
      const [lng, lat] = feature.geometry.coordinates
      form.setFieldValue('latitude', lat)
      form.setFieldValue('longitude', lng)
      setHasSelectedLocation(true)
    }

    form.setFieldValue('address', {
      line1: feature?.properties?.address,
      line2: '',
      city: feature?.properties?.context?.place?.name || '',
      state: feature?.properties?.context?.region?.name || '',
      postalCode: feature?.properties?.context?.postcode?.name || '',
      country: feature?.properties?.context?.country?.name || '',
      countryCode: feature?.properties?.context?.country?.country_code || ''
    })

    // Auto-fill name if empty
    // if (!form.state.values.name) {
    //   const placeName = feature?.properties?.name || ''
    //   form.setFieldValue('name', placeName)
    // }
  }

  const handleAddressClear = () => {
    // Clear location data when address is cleared
    form.setFieldValue('latitude', 0)
    form.setFieldValue('longitude', 0)
    form.setFieldValue('address', {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      countryCode: ''
    })
    setHasSelectedLocation(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{m.create_resource({ resource: m.location() })}</DialogTitle>
          <DialogDescription>{m.location_create_dialog_description()}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}>
          <div className="grid gap-4 pt-3 pb-8">
            <div className="space-y-2">
              <Label htmlFor="address">{m.address()}</Label>
              <AddressSearch
                onSelect={handleAddressSelect}
                onClear={handleAddressClear}
                placeholder={m.location_create_dialog_address_placeholder()}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
              />
              {!hasSelectedLocation && (
                <p className="text-sm text-muted-foreground">
                  {m.location_create_dialog_address_suggestions_placeholder()}
                </p>
              )}
            </div>
            <form.Field
              name="reference"
              validators={{ onChange: validationSchemas.reference }}
              children={(field) => (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={field.name}>{m.id()} *</Label>
                  <div className="col-span-3">
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="max-w-24 uppercase"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                    />
                    <FieldInfo field={field} />
                  </div>
                </div>
              )}
            />
            <form.Field
              name="name"
              validators={{ onChange: validationSchemas.stringRequiredMax100 }}
              children={(field) => (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={field.name}>{m.name()} *</Label>
                  <div className="col-span-3">
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                    />
                    <FieldInfo field={field} />
                  </div>
                </div>
              )}
            />
            <form.Field
              name="responsibleUserId"
              children={(field) => (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={field.name}>{m.responsible_person()}</Label>
                  <div className="col-span-3">
                    <Combobox
                      options={userOptions}
                      value={field.state.value}
                      onChange={field.handleChange}
                      buttonClassName="h-8 md:h-8"
                    />
                    <FieldInfo field={field} />
                  </div>
                </div>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {m.cancel()}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting || !hasSelectedLocation}>
                  {isSubmitting ? (
                    <>
                      <TbLoader2 className="animate-spin" /> {m.creating()}&hellip;
                    </>
                  ) : (
                    m.create()
                  )}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateLocationDialog
