import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@patchdocs/ui';

export default function SubscribeDialog({ open, onOpenChange }: any) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to Patchdocs Pro</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-xs text-[#a1a1aa]">
          Select your billing cycle and subscription details.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
