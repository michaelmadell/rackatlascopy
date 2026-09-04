import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { ScrollArea, Card, Button } from '@patchdocs/ui'
import { TbCheck } from 'react-icons/tb'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import { useHeader } from '@/hooks/useHeader'
import { useAppStore } from '@/lib/app-store'
import { formatDate } from '@/lib/utils'
import { getAnnouncementCategoryColor, getLocalizedAnnouncementText } from '@/components/dialogs/AnnouncementsDialog'
import AnnouncementDetailDialog from '@/components/dialogs/AnnouncementDetailDialog'
import Loader from '@/components/common/Loader'
import * as m from '@/paraglide/messages'
import type { Announcement } from '@/types'

export const Route = createFileRoute('/app/announcements')({
  component: AnnouncementsPage
})

function AnnouncementsPage() {
  useHeader({ title: m.announcements() })
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const user = useAppStore((state) => state.user)
  const language = user?.language ?? 'en'
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const announcementsQuery = useQuery<Announcement[]>({
    queryKey: ['announcements', 'all'],
    queryFn: () => api.get('/announcement?includeRead=true&limit=25').then((res) => res.data.data)
  })

  const dismissAllMutation = useMutation({
    mutationFn: () => api.post('/announcement/dismiss-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] })
  })

  const announcements = announcementsQuery.data ?? []
  const hasUnread = announcements.some((a) => !a.isRead)
  const selectedAnnouncement = announcements.find((a) => a._id === selectedId) ?? null

  return (
    <div className="h-full">
      <ScrollArea className="h-[calc(100svh-var(--header-height))]">
        <div className="p-4 max-w-3xl mx-auto">
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasUnread || dismissAllMutation.isPending}
              onClick={() => dismissAllMutation.mutate()}>
              <TbCheck />
              {m.mark_all_as_read()}
            </Button>
          </div>
          {announcementsQuery.isPending ? (
            <Loader />
          ) : announcements.length === 0 ? (
            <Card className="rounded-lg p-8 text-center text-muted-foreground">{m.no_announcements()}</Card>
          ) : (
            <Card className="rounded-lg p-0 overflow-hidden">
              <ul className="divide-y divide-border">
                {announcements.map((announcement) => (
                  <li key={announcement._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(announcement._id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 cursor-pointer">
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          announcement.isRead ? 'bg-muted-foreground/30' : 'bg-current'
                        } ${getAnnouncementCategoryColor(announcement.category)}`}
                      />
                      <span
                        className={`flex-1 truncate ${announcement.isRead ? 'text-muted-foreground' : 'font-semibold'}`}>
                        {getLocalizedAnnouncementText(announcement.title, language)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(announcement.startDate)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </ScrollArea>
      <AnnouncementDetailDialog
        announcement={selectedAnnouncement}
        language={language}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
