import { Link } from '@tanstack/react-router'
import { TbLock } from 'react-icons/tb'
import { Button } from '@patchdocs/ui'
import * as m from '@/paraglide/messages'

export default function BlockedPageAccess() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <TbLock className="text-foreground text-5xl" />
      <p>{m.billing_blocked_page()}</p>
      <Button size="sm" asChild>
        <Link to="/app/settings" search={{ tab: 'billing' }}>
          {m.billing_manage_subscription()}
        </Link>
      </Button>
    </div>
  )
}
