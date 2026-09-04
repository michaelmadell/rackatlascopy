import { useEffect, useState, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { useRouterState } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@patchdocs/ui'
import { TbTrash, TbPhoto } from 'react-icons/tb'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import * as Sentry from '@sentry/react'
import constants from '@patchdocs/constants'
import { useAppStore } from '@/lib/app-store'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import FieldInfo from '@/components/common/FieldInfo'
import * as m from '@/paraglide/messages'

interface SupportRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACCEPTED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png']

const categories = [
  { value: 'general', label: () => m.support_request_category_general() },
  { value: 'billing', label: () => m.support_request_category_billing() },
  { value: 'technical', label: () => m.support_request_category_technical() }
] as const

const SupportRequestDialog = ({ open, onOpenChange }: SupportRequestDialogProps) => {
  const api = useAuthenticatedApi()
  const posthog = usePostHog()
  const routerState = useRouterState()

  const user = useAppStore((state) => state.user)
  const customer = useAppStore((state) => state.customer)
  const activeTenant = useAppStore((state) => state.activeTenant)
  const theme = useAppStore((state) => state.theme)

  const [category, setCategory] = useState('general')
  const [manualScreenshots, setManualScreenshots] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dialogOpenedAt, setDialogOpenedAt] = useState<string | null>(null)
  const [submittedReference, setSubmittedReference] = useState<string | null>(null)
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const form = useForm({
    defaultValues: { description: '' },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true)
      try {
        const metadata = {
          userId: user?._id,
          customerId: customer?._id,
          tenantId: activeTenant?._id,
          route: routerState.location.pathname,
          browserUserAgent: navigator.userAgent,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          devicePixelRatio: window.devicePixelRatio,
          theme,
          browserLanguage: navigator.language,
          userLanguage: user?.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          touchSupport: navigator.maxTouchPoints > 0,
          posthogDistinctId: posthog?.get_distinct_id?.() || null,
          sentryLastEventId: Sentry.lastEventId() || null,
          triggeredAt: dialogOpenedAt,
          appVersion: __APP_VERSION__
        }

        const formData = new FormData()
        formData.append('category', category)
        formData.append('description', value.description.trim())
        formData.append('metadata', JSON.stringify(metadata))

        manualScreenshots.forEach((file, index) => {
          formData.append(`screenshot_${index}`, file)
        })

        const response = await api.post('/support/request', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        posthog?.capture('app:support_request_submit', { category })
        setSubmittedReference(response.data.data?.reference || null)
        setSubmittedTicketNumber(response.data.data?.ticketNumber || null)
      } catch {
        posthog?.capture('app:support_request_submit_failed')
        toast.error(m.support_request_error())
      } finally {
        setIsSubmitting(false)
      }
    }
  })

  useEffect(() => {
    if (open) {
      setDialogOpenedAt(new Date().toISOString())
    }
  }, [open])

  const handleClose = () => {
    onOpenChange(false)
    // Wait for close animation before resetting state
    setTimeout(() => {
      form.reset()
      setCategory('general')
      setDialogOpenedAt(null)
      setManualScreenshots([])
      setSubmittedReference(null)
      setSubmittedTicketNumber(null)
    }, 200)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = constants.upload.maxFilesPerRequest - manualScreenshots.length

    if (files.length > remaining) {
      toast.error(m.support_request_max_files({ max: constants.upload.maxFilesPerRequest }))
      posthog?.capture('app:support_request_upload_max_files_exceeded', { count: files.length })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const validFiles = files.filter((file) => {
      if (!ACCEPTED_MIMETYPES.includes(file.type)) {
        toast.error(m.field_file_invalid_mimetype({ types: 'JPG, PNG' }))
        posthog?.capture('app:support_request_upload_invalid_mimetype', { mimetype: file.type })
        return false
      }
      if (file.size > constants.upload.supportMaxFileSize) {
        toast.error(m.field_file_invalid_size({ size: `${constants.upload.supportMaxFileSize / 1024 / 1024}MB` }))
        posthog?.capture('app:support_request_upload_invalid_size', { size: file.size })
        return false
      }
      return true
    })

    setManualScreenshots((prev) => [...prev, ...validFiles])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeManualScreenshot = (index: number) => {
    setManualScreenshots((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && handleClose()}>
      <DialogContent ref={dialogRef} className="sm:max-w-125" onInteractOutside={(e) => e.preventDefault()}>
        {submittedReference ? (
          <>
            <DialogHeader>
              <DialogTitle>{m.support_request_success_title()}</DialogTitle>
              <DialogDescription>{m.support_request_success_description()}</DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {submittedTicketNumber ? m.support_request_ticket_number() : m.support_request_reference()}
              </p>
              <p className="font-mono font-medium text-foreground">{submittedTicketNumber ?? submittedReference}</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{m.close()}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{m.support_request()}</DialogTitle>
              <DialogDescription>{m.support_request_dialog_description()}</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}>
              <div className="grid gap-4 pt-3 pb-6">
                {/* Category */}
                <div className="flex flex-col gap-2">
                  <Label>{m.support_request_category_label()} *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <form.Field
                  name="description"
                  validators={{
                    onChange: ({ value }) => {
                      const trimmed = value.trim()
                      if (trimmed.length < 10) {
                        return m.field_min_length({ min: 10 })
                      }
                      if (trimmed.length > 2000) {
                        return m.field_max_length({ max: 2000 })
                      }
                      return undefined
                    }
                  }}
                  children={(field) => (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={field.name}>{m.support_request_description_label()} *</Label>
                      <textarea
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={m.support_request_description_placeholder()}
                        rows={6}
                        maxLength={2000}
                        className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-base md:text-sm transition-colors focus-visible:ring-2 placeholder:text-muted-foreground outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                      />
                      <FieldInfo field={field} />
                    </div>
                  )}
                />

                {/* Screenshots */}
                <div className="flex flex-col gap-2">
                  <Label>{m.support_request_screenshots_label({ max: constants.upload.maxFilesPerRequest })}</Label>
                  {manualScreenshots.length > 0 && (
                    <div className="flex flex-wrap gap-4 pb-3">
                      {manualScreenshots.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}`} className="relative inline-block">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Screenshot ${index + 1}`}
                            className="h-16 w-16 rounded-md border object-cover"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="xs-icon"
                            className="absolute -bottom-2 -right-2 size-5! text-destructive-foreground hover:text-destructive-foreground"
                            onClick={() => removeManualScreenshot(index)}>
                            <TbTrash className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {manualScreenshots.length < constants.upload.maxFilesPerRequest && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => fileInputRef.current?.click()}>
                      <TbPhoto className="size-4" />
                      {m.support_request_select_files()}
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  {m.cancel()}
                </Button>
                <form.Subscribe
                  selector={(state) => [state.canSubmit]}
                  children={([canSubmit]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? m.support_request_submitting() : m.support_request_submit()}
                    </Button>
                  )}
                />
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default SupportRequestDialog
