import { useMemo } from 'react'
import { useAppStore } from '@/lib/app-store'
import * as m from '@/paraglide/messages'
import type { ComboboxOption } from '@/components/common/Combobox'

export function useResponsibleUserOptions(): ComboboxOption[] {
  const tenantUsers = useAppStore((state) => state.tenantUsers)

  return useMemo(() => {
    const options = tenantUsers
      .filter((user) => user._id && user.email)
      .map((user) => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
        return {
          value: user._id as string,
          label: fullName || (user.email as string)
        }
      })

    return [{ value: '', label: m.unassigned() }, ...options]
  }, [tenantUsers])
}
