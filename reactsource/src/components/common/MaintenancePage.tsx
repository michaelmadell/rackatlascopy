import { useState, useEffect } from 'react'
import { TbTool } from 'react-icons/tb'
import { useAppStore } from '@/lib/app-store'
import * as m from '@/paraglide/messages'

export default function MaintenancePage() {
  const retryAfter = useAppStore((s) => s.maintenanceRetryAfter)
  const [countdown, setCountdown] = useState(retryAfter ?? 60)

  useEffect(() => {
    if (countdown <= 0) {
      window.location.reload()
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4">
      <TbTool className="text-muted-foreground text-5xl mb-4" />
      <h1 className="text-xl font-semibold mb-2">{m.maintenance_title()}</h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">{m.maintenance_description()}</p>
      <p className="text-sm text-muted-foreground">{m.maintenance_retry({ seconds: String(countdown) })}</p>
    </div>
  )
}
