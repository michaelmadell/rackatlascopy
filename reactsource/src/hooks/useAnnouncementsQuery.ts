import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedApi } from './useAuthenticatedApi'
import type { Announcement } from '@/types'

export function useAnnouncementsQuery(enabled: boolean = true) {
  const api = useAuthenticatedApi()
  return useQuery<Announcement[]>({
    queryKey: ['announcements'],
    enabled,
    queryFn: () => api.get('/announcement').then((res) => res.data.data)
  })
}
