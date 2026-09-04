import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button
} from '@patchdocs/ui'
import type { Announcement } from '@/types'
import * as m from '@/paraglide/messages'

export function getAnnouncementCategoryColor(category: Announcement['category']) {
  switch (category) {
    case 'error':
      return 'text-red-600 dark:text-red-400'
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-blue-600 dark:text-blue-400'
  }
}

export function getLocalizedAnnouncementText(content: { en: string; de: string }, language: string) {
  return language === 'de' ? content.de : content.en
}

export function AnnouncementBody({ announcement, language }: { announcement: Announcement; language: string }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className={getAnnouncementCategoryColor(announcement.category)}>
          {getLocalizedAnnouncementText(announcement.title, language)}
        </DialogTitle>
      </DialogHeader>
      <DialogDescription
        className="text-foreground text-base [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: this is a valid use case
        dangerouslySetInnerHTML={{ __html: getLocalizedAnnouncementText(announcement.content, language) }}
      />
    </>
  )
}

interface AnnouncementsDialogProps {
  announcements: Announcement[]
  language: string
}

export default function AnnouncementsDialog({ announcements, language }: AnnouncementsDialogProps) {
  const api = useAuthenticatedApi()
  const queryClient = useQueryClient()
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const remainingAnnouncements = announcements.filter((announcement) => !dismissedIds.includes(announcement._id))
  const currentAnnouncement = remainingAnnouncements[currentIndex]

  useEffect(() => {
    setIsOpen(remainingAnnouncements.length > 0)
  }, [remainingAnnouncements.length])

  const handleDismiss = async () => {
    if (!currentAnnouncement) return
    try {
      await api.post(`/announcement/${currentAnnouncement._id}/dismiss`)
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    } catch (error) {
      console.error('Failed to dismiss announcement:', error)
    }
    setDismissedIds((prev) => [...prev, currentAnnouncement._id])
    setCurrentIndex(0)
  }

  if (!currentAnnouncement) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-150">
        <AnnouncementBody announcement={currentAnnouncement} language={language} />
        <DialogFooter>
          <Button onClick={handleDismiss}>{remainingAnnouncements.length > 1 ? m.next() : m.close()}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
