import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '@patchdocs/ui';

export default function AnnouncementDetailDialog({ open, onOpenChange, announcement }: any) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{announcement?.title || 'Announcement'}</DialogTitle>
          <DialogDescription>{announcement?.date || ''}</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-xs text-[#f4f4f5]">
          {announcement?.content || announcement?.description || 'No announcement details.'}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
