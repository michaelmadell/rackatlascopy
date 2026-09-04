import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface HeaderBreadcrumb {
  label: string
  href?: string
  search?: Record<string, string>
}

export interface HeaderConfig {
  title: string
  documentTitle?: string
  breadcrumbs?: HeaderBreadcrumb[]
  buttons?: ReactNode[]
}

interface HeaderContextType {
  config: HeaderConfig | null
  setConfig: (config: HeaderConfig | null) => void
}

const HeaderContext = createContext<HeaderContextType>({
  config: null,
  setConfig: () => {}
})

export function useHeaderConfig() {
  return useContext(HeaderContext)
}

interface HeaderProviderProps {
  children: ReactNode
}

export function HeaderProvider({ children }: HeaderProviderProps) {
  const [config, setConfig] = useState<HeaderConfig | null>(null)

  return <HeaderContext.Provider value={{ config, setConfig }}>{children}</HeaderContext.Provider>
}
