import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, CardContent, CardHeader, CardTitle } from '@patchdocs/ui'
import { useAuth0 } from '@auth0/auth0-react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import AccountLayout from '@/components/layout/AccountLayout'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/auth-password-changed')({
  component: AuthPasswordChangedPage,
  head: () => ({ meta: [{ title: `${m.password_changed()} - Patchdocs` }] })
})

function AuthPasswordChangedPage() {
  const { loginWithRedirect } = useAuth0()

  return (
    <AccountLayout>
      <CardHeader>
        <div className="flex flex-col items-center gap-3">
          <DotLottieReact src="/lottie/success.lottie" loop autoplay className="size-25" />
          <CardTitle className="text-xl text-center">{m.password_changed()}!</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <p>{m.password_changed_text()}</p>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full h-10 md:h-13 rounded-sm text-base"
            onClick={() => loginWithRedirect({ authorizationParams: { ui_locales: getLocale() } })}>
            {m.log_in()}
          </Button>
          <Button asChild variant="ghost" className="w-full rounded-sm">
            <Link to="/">{m.back_to_homepage()}</Link>
          </Button>
        </div>
      </CardContent>
    </AccountLayout>
  )
}
