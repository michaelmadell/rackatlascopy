import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useAuth0 } from '@auth0/auth0-react'
import {
  ScrollArea,
  Card,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Skeleton,
  Input,
  Label,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@patchdocs/ui'
import { TbLoader2, TbTrash, TbUpload } from 'react-icons/tb'
import { toast } from 'sonner'
import { usePostHog } from 'posthog-js/react'
import constants, { type ImageMimetype } from '@patchdocs/constants'
import { useHeader } from '@/hooks/useHeader'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useAppStore } from '@/lib/app-store'
import { getValidationSchemas } from '@/lib/schemas'
import FieldInfo from '@/components/common/FieldInfo'
import PasswordWithToggleInput from '@/components/common/PasswordWithToggleInput'
import FormSubmitButton from '@/components/common/FormSubmitButton'
import { setLocale } from '@/paraglide/runtime'
import { openConsentManager } from '@/lib/consent'
import * as m from '@/paraglide/messages'
import type { User } from '@/types'

export const Route = createFileRoute('/app/account')({
  component: AccountPage
})

function AccountPage() {
  useHeader({ title: m.account() })
  const validationSchemas = getValidationSchemas()
  const router = useRouter()
  const posthog = usePostHog()
  const api = useAuthenticatedApi()
  const { user } = useAuth0() // getAccessTokenSilently
  const userData = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)
  const avatarTimestamp = useAppStore((state) => state.avatarTimestamp)
  const setAvatarTimestamp = useAppStore((state) => state.setAvatarTimestamp)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPending, setAvatarPending] = useState(false)

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const token = await getAccessTokenSilently({
  //         authorizationParams: {
  //           audience: 'https://api-dev.patchdocs.com',
  //           scope: 'openid profile email offline_access'
  //         }
  //       })
  //       console.log('token', token)
  //     } catch (e) {
  //       console.error(e)
  //     }
  //   })()
  // }, [getAccessTokenSilently])

  const profileForm = useForm({
    defaultValues: {
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      language: userData?.language || 'en',
      timeZone: userData?.timeZone || 'gmt',
      measurementUnit: userData?.measurementUnit || 'metric'
    },
    onSubmit: async ({ value }) => {
      try {
        const res = await api.patch(`/user/${userData?._id}`, value)
        if (res?.data?.data) {
          if (value.language !== userData?.language) {
            setLocale(value.language as 'en' | 'de', { reload: false })
            document.documentElement.lang = value.language
            router.invalidate()
          }
          setUser(res.data.data as User)
        }
      } catch {
        // handled by interceptor
      }
    }
  })

  const passwordForm = useForm({
    defaultValues: {
      password: '',
      confirmPassword: ''
    },
    validators: {
      onChange({ value }) {
        if (value.password !== value.confirmPassword) {
          return m.field_passwords_do_not_match()
        }
        return undefined
      }
    },
    onSubmit: async ({ value }) => {
      try {
        await api.post(`/user/${userData?._id}/password`, { password: value.password })
        passwordForm.reset()
      } catch {
        // handled by interceptor
      }
    }
  })

  const preloadAvatar = (avatarPath: string, retriesLeft: number) => {
    const img = new Image()
    img.onload = () => {
      setAvatarTimestamp(Date.now())
      setAvatarPending(false)
    }
    img.onerror = () => {
      if (retriesLeft > 0) {
        setTimeout(() => preloadAvatar(avatarPath, retriesLeft - 1), 3000)
      } else {
        setAvatarPending(false)
      }
    }
    img.src = `${import.meta.env.VITE_PUBLIC_STORAGE}${avatarPath}?t=${Date.now()}`
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userData?._id) return

    if (!constants.upload.imageMimetypes.includes(file.type as ImageMimetype)) {
      toast.warning(m.field_file_invalid_mimetype({ types: constants.upload.imageExtensionsLabel }))
      posthog?.capture('account:avatar_upload_invalid_mimetype', { mimetype: file.type })
      return
    }

    if (file.size > constants.upload.avatarMaxFileSize) {
      toast.warning(m.field_file_invalid_size({ size: `${constants.upload.avatarMaxFileSize / 1024 / 1024}MB` }))
      posthog?.capture('account:avatar_upload_invalid_size', { size: file.size })
      return
    }

    try {
      setAvatarUploading(true)
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await api.post(`/user/${userData._id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data?.data) {
        const updatedUser = response.data.data as User
        setUser(updatedUser)
        if (updatedUser.avatar) {
          setAvatarPending(true)
          preloadAvatar(updatedUser.avatar, 1)
        }
        toast.success(m.upload_success())
      }
    } catch {
      // handled by interceptor
    } finally {
      setAvatarUploading(false)
      event.target.value = ''
    }
  }

  const handleAvatarDelete = async () => {
    try {
      const response = await api.patch(`/user/${userData?._id}`, { avatar: '' })
      if (response.data?.data) {
        setUser(response.data.data as User)
      }
    } catch {
      // handled by interceptor
    }
  }

  return (
    <div className="h-full">
      {user && (
        <ScrollArea className="h-[calc(100svh-var(--header-height))]">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 p-4 items-start">
            <Card className="rounded-lg p-4">
              <h2 className="text-lg font-semibold leading-none">{m.profile()}</h2>

              <div className="flex items-center gap-4">
                {avatarPending ? (
                  <Skeleton className="size-18 rounded-lg" />
                ) : (
                  <Avatar className="size-18 rounded-lg">
                    <AvatarImage
                      src={
                        userData?.avatar
                          ? `${import.meta.env.VITE_PUBLIC_STORAGE}${userData?.avatar}?t=${avatarTimestamp}`
                          : undefined
                      }
                    />
                    <AvatarFallback className="rounded-lg">{userData?.firstName?.charAt(0) ?? ''}</AvatarFallback>
                  </Avatar>
                )}
                <Button asChild disabled={avatarUploading}>
                  <label htmlFor="avatar">
                    {avatarUploading ? <TbLoader2 className="animate-spin" /> : <TbUpload />}
                    {avatarUploading ? m.uploading() : m.upload()}
                    <input
                      type="file"
                      id="avatar"
                      className="hidden"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                  </label>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAvatarDelete}
                  disabled={avatarUploading || !userData?.avatar}>
                  <TbTrash />
                </Button>
              </div>

              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  profileForm.handleSubmit()
                }}>
                <div className="flex flex-col gap-1.5">
                  <profileForm.Field
                    name="firstName"
                    validators={{ onChange: validationSchemas.stringRequiredMax100 }}
                    children={(field) => (
                      <>
                        <Label htmlFor="firstName" className="text-xs font-semibold">
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
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <profileForm.Field
                    name="lastName"
                    validators={{ onChange: validationSchemas.stringRequiredMax100 }}
                    children={(field) => (
                      <>
                        <Label htmlFor="lastName" className="text-xs font-semibold">
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
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col w-full gap-1 md:gap-1.5">
                  <profileForm.Field
                    name="email"
                    children={(field) => (
                      <>
                        <Label htmlFor="email" className="text-xs font-semibold">
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
                          disabled
                        />
                        <div className="text-xs text-muted-foreground">
                          <em>{m.email_address_cannot_be_changed()}</em>
                        </div>
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <profileForm.Field
                    name="phone"
                    validators={{ onChange: validationSchemas.phone }}
                    children={(field) => (
                      <>
                        <Label htmlFor="phone" className="text-xs font-semibold">
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
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <profileForm.Field
                    name="language"
                    children={(field) => (
                      <>
                        <Label htmlFor="language" className="text-xs font-semibold">
                          {m.language()}
                        </Label>
                        <Select
                          name={field.name}
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value)}>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en" className="cursor-pointer">
                              English
                            </SelectItem>
                            <SelectItem value="de" className="cursor-pointer">
                              Deutsch
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <profileForm.Field
                    name="timeZone"
                    children={(field) => (
                      <>
                        <Label htmlFor="timeZone" className="text-xs font-semibold">
                          {m.time_zone()}
                        </Label>
                        <Select
                          name={field.name}
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value)}>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="Select a timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>North America</SelectLabel>
                              <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
                              <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
                              <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
                              <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
                              <SelectItem value="akst">Alaska Standard Time (AKST)</SelectItem>
                              <SelectItem value="hst">Hawaii Standard Time (HST)</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel>Europe & Africa</SelectLabel>
                              <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
                              <SelectItem value="cet">Central European Time (CET)</SelectItem>
                              <SelectItem value="eet">Eastern European Time (EET)</SelectItem>
                              <SelectItem value="west">Western European Summer Time (WEST)</SelectItem>
                              <SelectItem value="cat">Central Africa Time (CAT)</SelectItem>
                              <SelectItem value="eat">East Africa Time (EAT)</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel>Asia</SelectLabel>
                              <SelectItem value="msk">Moscow Time (MSK)</SelectItem>
                              <SelectItem value="ist">India Standard Time (IST)</SelectItem>
                              <SelectItem value="cst_china">China Standard Time (CST)</SelectItem>
                              <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
                              <SelectItem value="kst">Korea Standard Time (KST)</SelectItem>
                              <SelectItem value="ist_indonesia">Indonesia Central Standard Time (WITA)</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel>Australia & Pacific</SelectLabel>
                              <SelectItem value="awst">Australian Western Standard Time (AWST)</SelectItem>
                              <SelectItem value="acst">Australian Central Standard Time (ACST)</SelectItem>
                              <SelectItem value="aest">Australian Eastern Standard Time (AEST)</SelectItem>
                              <SelectItem value="nzst">New Zealand Standard Time (NZST)</SelectItem>
                              <SelectItem value="fjt">Fiji Time (FJT)</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel>South America</SelectLabel>
                              <SelectItem value="art">Argentina Time (ART)</SelectItem>
                              <SelectItem value="bot">Bolivia Time (BOT)</SelectItem>
                              <SelectItem value="brt">Brasilia Time (BRT)</SelectItem>
                              <SelectItem value="clt">Chile Standard Time (CLT)</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <profileForm.Field
                    name="measurementUnit"
                    children={(field) => (
                      <>
                        <Label htmlFor="measurementUnit" className="text-xs font-semibold">
                          {m.measurement_unit()}
                        </Label>
                        <Select
                          name={field.name}
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value)}>
                          <SelectTrigger className="w-full cursor-pointer">
                            <SelectValue placeholder="Select measurement unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="metric" className="cursor-pointer">
                              {m.measurement_unit_metric()}
                            </SelectItem>
                            <SelectItem value="imperial" className="cursor-pointer">
                              {m.measurement_unit_imperial()}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  />
                </div>
                <div className="md:col-span-2 pt-4">
                  <profileForm.Subscribe
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

              <div className="mt-6 pt-2.5 border-t border-border">
                <Label className="text-sm font-semibold mb-0.5">{m.cookie_consent()}</Label>
                <div className="text-xs text-muted-foreground mb-3">{m.consent_manage_description()}</div>
                <Button type="button" variant="outline" size="sm" onClick={openConsentManager}>
                  {m.manage_cookie_preferences()}
                </Button>
              </div>

              {import.meta.env.VITE_APP_ENVIRONMENT === 'dev' && (
                <Accordion className="border border-border rounded-lg px-2 mt-6" type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="py-2 font-mono text-xs hover:no-underline cursor-pointer">
                      DEBUG: Auth0 & user data
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-4 text-balance">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(user, null, 2)}
                      </pre>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(userData, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </Card>

            <Card className="rounded-lg p-4">
              <div>
                <h2 className="text-lg font-semibold leading-loose">{m.password()}</h2>
                <h3 className="text-sm text-muted-foreground">{m.change_password_subheadline()}</h3>
              </div>

              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  passwordForm.handleSubmit()
                }}>
                <div className="flex flex-col gap-1.5">
                  <passwordForm.Field
                    name="password"
                    validators={{ onChange: validationSchemas.password }}
                    children={(field) => (
                      <>
                        <Label htmlFor="password" className="text-xs font-semibold">
                          {m.password()}
                        </Label>
                        <PasswordWithToggleInput
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
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <passwordForm.Field
                    name="confirmPassword"
                    validators={{ onChange: validationSchemas.password }}
                    children={(field) => (
                      <>
                        <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                          {m.confirm_password()}
                        </Label>
                        <PasswordWithToggleInput
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
                      </>
                    )}
                  />
                </div>
                <div className="md:col-span-2 pt-4">
                  <passwordForm.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting, state.isSubmitted, state.isDirty]}
                    children={([canSubmit, isSubmitting, isSubmitted, isDirty]) => (
                      <FormSubmitButton
                        disabled={!canSubmit || !isDirty}
                        isSubmitting={isSubmitting}
                        isSubmitted={isSubmitted}
                        savingText={m.updating()}
                        savedText={m.updated()}
                        defaultText={m.update_password()}
                      />
                    )}
                  />
                </div>
              </form>
            </Card>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
