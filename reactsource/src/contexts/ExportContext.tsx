import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'

interface ExportContextType {
  isExporting: boolean
  triggerExport: (resourceType: string, resourceId: string) => Promise<void>
}

const ExportContext = createContext<ExportContextType>({
  isExporting: false,
  triggerExport: async () => console.log('DEFAULT triggerExport called - context provider not working!')
})

export const useExport = () => {
  const context = useContext(ExportContext)
  return context
}

interface ExportProviderProps {
  children: ReactNode
}

export function ExportProvider({ children }: ExportProviderProps) {
  const api = useAuthenticatedApi()
  const [isExporting, setIsExporting] = useState(false)

  const triggerExport = async (resourceType: string, resourceId: string) => {
    try {
      setIsExporting(true)

      const response = await api.get(`/export?resourceType=${resourceType}&resourceId=${resourceId}`, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })

      let filename = `patchdocs_export_${resourceType}_${resourceId}_${new Date().toISOString().split('T')[0]}.pdf`
      const contentDisposition = response.headers['content-disposition']
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/)
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1].trim()
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ExportContext.Provider
      value={{
        isExporting,
        triggerExport
      }}>
      {children}
    </ExportContext.Provider>
  )
}
