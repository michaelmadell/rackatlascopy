import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, CardContent, CardHeader, CardTitle, Alert, AlertDescription } from '@patchdocs/ui'
import { TbAlertCircle, TbLoader2 } from 'react-icons/tb'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import AccountLayout from '@/components/layout/AccountLayout'
import { reportApiError } from '@/lib/sentry-reporter'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/auth-error')({
  validateSearch: (search: Record<string, unknown>): { error?: string; error_description?: string } => ({
    error: search.error as string | undefined,
    error_description: search.error_description as string | undefined
  }),
  component: AuthErrorPage,
  head: () => ({ meta: [{ title: `${m.authentication_error()} - Patchdocs` }] })
})

function AuthErrorPage() {
  const { loginWithRedirect } = useAuth0()
  const { error: errorCode = 'unknown_error', error_description: errorDescription = m.authentication_error() } =
    Route.useSearch()
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleResendVerification = async () => {
    setIsResending(true)
    setResendError(null)

    // Extract email from error description (between quotes)
    const decodedDescription = decodeURIComponent(errorDescription)
    const emailMatch = decodedDescription.match(/"([^"]+)"/)
    const email = emailMatch ? emailMatch[1] : ''

    if (!email) {
      setResendError(m.could_not_determine_email_address())
      setIsResending(false)
      return
    }

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/resend-verification`,
        {
          email: email
        },
        {
          headers: {
            'accept-language': getLocale() ?? 'en'
          }
        }
      )
      setIsResending(false)
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 2000)
    } catch (error) {
      reportApiError(error, { action: 'resend_verification', data: { email } })
      if (axios.isAxiosError(error) && error.response) {
        setResendError(
          error.response.data?.message || error.response.data?.error?.message || m.resend_verification_email_failed()
        )
      } else {
        setResendError(m.unexpected_error())
      }
      setIsResending(false)
    }
  }

  const getErrorMessage = () => {
    const decodedDescription = decodeURIComponent(errorDescription)
    // Split on ": " to separate title and description
    const parts = decodedDescription.split(': ')
    const hasCustomFormat = parts.length === 2

    const isEmailVerificationError = errorCode === 'access_denied' && decodedDescription.toLowerCase().includes('email')

    if (isEmailVerificationError) {
      return {
        title: hasCustomFormat ? parts[0] : m.email_not_verified(),
        description: hasCustomFormat ? parts[1] : decodedDescription,
        showResend: true
      }
    }

    return {
      title: hasCustomFormat ? parts[0] : m.authentication_error(),
      description: hasCustomFormat ? parts[1] : decodedDescription,
      showResend: false
    }
  }

  const errorInfo = getErrorMessage()

  return (
    <AccountLayout>
      <CardHeader>
        <CardTitle className="text-xl text-center">{errorInfo.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive" className="border-destructive">
          <TbAlertCircle />
          <AlertDescription>{errorInfo.description}</AlertDescription>
        </Alert>

        {errorInfo.showResend && (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full h-10 md:h-13 rounded-sm text-base"
              disabled={isResending}
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
            {resendSuccess && <div className="text-xs text-green-600">{m.resend_verification_email_success()}</div>}
            {resendError && <div className="text-xs text-destructive-foreground">{resendError}</div>}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <Button
            className="w-full h-10 md:h-13 rounded-sm text-base"
            onClick={() => loginWithRedirect({ authorizationParams: { ui_locales: getLocale() } })}>
            {m.try_logging_in_again()}
          </Button>
          <Button asChild variant="ghost" className="w-full rounded-sm">
            <Link to="/">{m.back_to_homepage()}</Link>
          </Button>
        </div>
      </CardContent>
    </AccountLayout>
  )
}
