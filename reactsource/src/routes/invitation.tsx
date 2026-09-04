import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, CardContent, CardHeader, CardTitle, Alert, AlertDescription } from '@patchdocs/ui'
import { TbAlertCircle, TbLoader2, TbCheck } from 'react-icons/tb'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import AccountLayout from '@/components/layout/AccountLayout'
import { reportApiError } from '@/lib/sentry-reporter'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/invitation')({
  validateSearch: (
    search: Record<string, unknown>
  ): { invitationId?: string; continueUrl?: string; from?: string } => ({
    invitationId: search.invitationId as string | undefined,
    continueUrl: search.continueUrl as string | undefined,
    from: search.from as string | undefined
  }),
  component: InvitationPage,
  head: () => ({ meta: [{ title: `${m.invitation()} - Patchdocs` }] })
})

function InvitationPage() {
  const { loginWithRedirect } = useAuth0()
  const { invitationId, continueUrl, from } = Route.useSearch()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decision, setDecision] = useState<'accept' | 'decline' | null>(null)

  const processInvitation = async (action: 'accept' | 'decline') => {
    if (!invitationId) return
    setIsProcessing(true)
    setError(null)
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/user/invitation`,
        {
          invitationId,
          action
        },
        {
          headers: {
            'accept-language': getLocale() ?? 'en'
          }
        }
      )
      setDecision(action)
      setIsProcessing(false)
      if (action === 'accept' && continueUrl) {
        setTimeout(() => {
          window.location.href = continueUrl
        }, 3000)
      }
    } catch (error) {
      reportApiError(error, { action: 'process_invitation', data: { invitationId, invitationAction: action } })
      setIsProcessing(false)
      if (axios.isAxiosError(error) && error.response) {
        setError(
          error.response.data?.message || error.response.data?.error?.message || m.invitation_processing_failed()
        )
      } else {
        setError(m.unexpected_error())
      }
    }
  }

  const getTitle = () => {
    if (isProcessing) return m.invitation_processing()
    if (error) return m.invitation_error()
    if (decision === 'decline') return m.invitation_declined()
    if (decision === 'accept') return m.invitation_accepted()
    return m.invitation()
  }

  if (!invitationId) {
    return (
      <AccountLayout>
        <CardHeader>
          <CardTitle className="text-xl text-center">{m.invitation_error()}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="destructive" className="border-destructive">
            <TbAlertCircle />
            <AlertDescription>{m.invitation_invalid_params()}</AlertDescription>
          </Alert>
          <Button asChild variant="ghost" className="w-full rounded-sm">
            <Link to="/">{m.back_to_homepage()}</Link>
          </Button>
        </CardContent>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout>
      <CardHeader>
        <CardTitle className="text-xl text-center">{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Initial state: show accept/decline buttons */}
        {!isProcessing && !error && !decision && (
          <div className="flex flex-col gap-5">
            {from && <p className="text-sm text-center text-muted-foreground">{m.invitation_prompt({ from })}</p>}
            <Button className="w-full h-10 md:h-13 rounded-sm text-base" onClick={() => processInvitation('accept')}>
              {m.invitation_accept_button()}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-sm border-destructive text-destructive-foreground hover:text-destructive-foreground"
              onClick={() => processInvitation('decline')}>
              {m.invitation_decline_button()}
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center gap-4 py-8">
            <TbLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{m.invitation_processing()}...</p>
          </div>
        )}

        {error && (
          <>
            <Alert variant="destructive" className="border-destructive">
              <TbAlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button asChild variant="ghost" className="w-full rounded-sm">
              <Link to="/">{m.back_to_homepage()}</Link>
            </Button>
          </>
        )}

        {decision && (
          <>
            <Alert className={decision === 'accept' ? 'border-green-600 bg-green-50 text-green-900' : 'border-muted'}>
              <TbCheck className={decision === 'accept' ? 'text-green-600' : ''} />
              <AlertDescription>
                {decision === 'accept'
                  ? continueUrl
                    ? m.invitation_accepted_text_with_redirect()
                    : m.invitation_accepted_text()
                  : m.invitation_declined_text()}
              </AlertDescription>
            </Alert>
            {decision === 'decline' && (
              <Button asChild variant="ghost" className="w-full rounded-sm">
                <Link to="/">{m.back_to_homepage()}</Link>
              </Button>
            )}
            {decision === 'accept' && !continueUrl && (
              <Button
                className="w-full h-10 md:h-13 rounded-sm text-base"
                onClick={() => loginWithRedirect({ authorizationParams: { ui_locales: getLocale() } })}>
                {m.log_in()}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </AccountLayout>
  )
}
