import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import * as Sentry from '@sentry/react'
import {
  Button,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox
} from '@patchdocs/ui'
import { TbLoader2, TbAlertCircle, TbCheck } from 'react-icons/tb'
import { checkVAT } from 'jsvat'
import axios from 'axios'
import { usePostHog } from 'posthog-js/react'
import { useAuth0 } from '@auth0/auth0-react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { getValidationSchemas } from '@/lib/schemas'
import { isEuCountry, jsvatEuCountries, toE164 } from '@/lib/utils'
import { fireRegistrationEvent } from '@/lib/gtm'
import { reportApiError } from '@/lib/sentry-reporter'
import FieldInfo from '@/components/common/FieldInfo'
import CountrySelect from '@/components/common/CountrySelect'
import PasswordWithToggleInput from '@/components/common/PasswordWithToggleInput'
import AccountLayout from '@/components/layout/AccountLayout'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
  head: () => ({ meta: [{ title: `${m.register()} - Patchdocs` }] })
})

function RegisterPage() {
  const { loginWithRedirect } = useAuth0()
  const posthog = usePostHog()
  const validationSchemas = getValidationSchemas()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string>('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/resend-verification`,
        {
          email: registeredEmail
        },
        {
          headers: {
            'accept-language': getLocale() ?? 'en'
          }
        }
      )
      setResendCooldown(300) // Reset to 5 minutes
    } catch (error) {
      reportApiError(error, { action: 'resend_verification', data: { email: registeredEmail } })
    } finally {
      setIsResending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      companyName: '',
      countryCode: '',
      taxId: '',
      phone: '',
      email: '',
      password: '',
      termsAccepted: false,
      marketingOptIn: false
    },
    onSubmit: async ({ value }) => {
      setServerError(null)

      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/customer`, {
          firstName: value.firstName.trim(),
          lastName: value.lastName.trim(),
          companyName: value.companyName.trim(),
          countryCode: value.countryCode,
          ...(value.taxId.trim() ? { taxId: value.taxId.trim() } : {}),
          phone: value.phone.trim(),
          email: value.email.trim(),
          password: value.password,
          termsAccepted: value.termsAccepted,
          marketingOptIn: value.marketingOptIn
        })

        setRegisteredEmail(value.email.trim())
        setResendCooldown(300) // 5 minutes
        setIsSuccess(true)

        posthog?.capture('account:register', {
          email: value.email.trim(),
          countryCode: value.countryCode,
          marketingOptIn: value.marketingOptIn
        })

        try {
          await fireRegistrationEvent({
            email: value.email,
            phoneE164: toE164(value.phone, value.countryCode)
          })
        } catch (e) {
          Sentry.withScope((scope) => {
            scope.setContext('data', { email: value.email, country: value.countryCode })
            scope.setTag('action', 'register_event_fire')
            Sentry.captureException(e)
          })
        }
      } catch (error) {
        reportApiError(error, {
          action: 'register',
          data: { email: value.email, country: value.countryCode }
        })
        if (axios.isAxiosError(error) && error.response) {
          setServerError(error.response.data?.message || error.response.data?.error?.message || m.registration_failed())
        } else {
          setServerError(m.unexpected_error())
        }
      }
    }
  })

  if (isSuccess) {
    return (
      <AccountLayout>
        <CardHeader>
          <div className="flex flex-col items-center gap-3">
            <DotLottieReact src="/lottie/confetti.lottie" loop autoplay className="w-1/2" />
            <CardTitle className="text-xl text-center">{m.great_to_have_you_on_board()}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-8">{m.registration_success_text()}</p>
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mb-2"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleResendVerification}>
                {isResending ? (
                  <>
                    <TbLoader2 className="animate-spin mr-2" />
                    {m.sending()}...
                  </>
                ) : (
                  m.resend_verification_email()
                )}
              </Button>
              {resendCooldown > 0 && (
                <p className="text-xs text-muted-foreground">
                  {m.resend_available_in({ time: formatTime(resendCooldown) })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout>
      <CardHeader>
        <img src="/patchdocs_logo_horizontal_black.png" alt="Patchdocs" className="h-12 w-auto mx-auto mb-5" />
        <CardTitle className="text-xl text-center pb-2">{m.get_started_with_patchdocs()}</CardTitle>
      </CardHeader>
      <CardContent className="px-10">
        <ul className="mb-6 flex flex-col gap-1">
          {[
            m.register_benefit_trial(),
            m.register_benefit_no_card(),
            m.register_benefit_all_features(),
            m.register_benefit_no_strings()
          ].map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm">
              <TbCheck className="shrink-0 text-primary" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="flex flex-col gap-1.5">
          {serverError && (
            <Alert variant="destructive" className="border-destructive">
              <TbAlertCircle />
              <AlertTitle>{m.error_title()}</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-2">
            <form.Field
              name="firstName"
              validators={{ onChange: validationSchemas.stringRequiredMax100 }}
              children={(field) => (
                <div className="space-y-1.5">
                  <Input
                    id={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                    placeholder={`${m.first_name()} *`}
                    autoComplete="given-name"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />

            <form.Field
              name="lastName"
              validators={{ onChange: validationSchemas.stringRequiredMax100 }}
              children={(field) => (
                <div className="space-y-1.5">
                  <Input
                    id={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                    placeholder={`${m.last_name()} *`}
                    autoComplete="family-name"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
          </div>

          <form.Field
            name="companyName"
            validators={{ onChange: validationSchemas.stringRequiredMax100 }}
            children={(field) => (
              <div className="space-y-1.5">
                <Input
                  id={field.name}
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder={`${m.company_name()} *`}
                  autoComplete="organization"
                />
                <FieldInfo field={field} />
              </div>
            )}
          />

          <form.Field
            name="countryCode"
            validators={{
              onChange: ({ value }) => (!value ? m.field_required() : undefined)
            }}
            children={(field) => (
              <div className="space-y-1.5">
                <CountrySelect
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  placeholder={`${m.address_country()} *`}
                  buttonClassName="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                />
                <FieldInfo field={field} />
              </div>
            )}
          />

          <form.Subscribe
            selector={(state) => [state.values.countryCode]}
            children={([countryCode]) => {
              const isEu = isEuCountry(countryCode as string)
              if (!isEu) return null
              return (
                <form.Field
                  name="taxId"
                  validators={(() => {
                    const jsvatCountry = jsvatEuCountries.filter((c) => c.codes[0] === countryCode)
                    const validate = ({ value }: { value: string }) => {
                      if (value.trim()) {
                        const result = checkVAT(value.trim(), jsvatCountry)
                        if (!result.isValid) return m.billing_vat_status_invalid()
                      }
                      return undefined
                    }
                    return { onBlur: validate, onSubmit: validate }
                  })()}
                  children={(field) => (
                    <div className="space-y-1.5">
                      <Input
                        id={field.name}
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                        placeholder={m.billing_tax_id_optional()}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                      />
                      <FieldInfo field={field} />
                    </div>
                  )}
                />
              )
            }}
          />

          <form.Field
            name="phone"
            validators={{ onChange: validationSchemas.phone }}
            children={(field) => (
              <div className="space-y-1.5">
                <Input
                  id={field.name}
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.replace(/\s/g, ''))}
                  className="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder={`${m.phone()} *`}
                  autoComplete="tel"
                />
                <FieldInfo field={field} />
              </div>
            )}
          />

          <form.Field
            name="email"
            validators={{ onChange: validationSchemas.email }}
            children={(field) => (
              <div className="space-y-1.5">
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder={`${m.email()} *`}
                  autoComplete="email"
                />
                <FieldInfo field={field} />
              </div>
            )}
          />

          <form.Field
            name="password"
            validators={{ onChange: validationSchemas.password }}
            children={(field) => (
              <div className="space-y-1.5">
                <PasswordWithToggleInput
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-10 md:h-11 rounded-sm shadow-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder={`${m.password()} *`}
                  autoComplete="new-password"
                />
                <FieldInfo field={field} />
              </div>
            )}
          />

          <form.Field
            name="termsAccepted"
            validators={{
              onChange: ({ value }) => (!value ? m.billing_accept_terms_required() : undefined)
            }}
            children={(field) => (
              <div className="space-y-1 pt-1">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                  />
                  <label htmlFor={field.name} className="text-sm text-muted-foreground leading-tight cursor-pointer">
                    {m.billing_accept_terms_prefix()}
                    <a
                      href="https://patchdocs.io/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground">
                      {m.billing_accept_terms_link()}
                    </a>
                  </label>
                </div>
                <FieldInfo field={field} />
              </div>
            )}
          />

          <form.Field
            name="marketingOptIn"
            children={(field) => (
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked === true)}
                />
                <label htmlFor={field.name} className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  {m.marketing_opt_in()}
                </label>
              </div>
            )}
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <div className="space-y-4 pt-4">
                <Button
                  type="submit"
                  className="w-full h-10 md:h-11 rounded-sm text-base"
                  disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <TbLoader2 className="animate-spin mr-2" />
                      {m.creating_account()}...
                    </>
                  ) : (
                    m.register_now()
                  )}
                </Button>

                <div className="flex items-center justify-center gap-0 text-sm text-muted-foreground">
                  <span>{m.already_have_an_account()}</span>
                  <Button
                    variant="link"
                    onClick={() => loginWithRedirect({ authorizationParams: { ui_locales: getLocale() } })}>
                    {m.log_in()}
                  </Button>
                </div>
              </div>
            )}
          />
        </form>
      </CardContent>
    </AccountLayout>
  )
}
