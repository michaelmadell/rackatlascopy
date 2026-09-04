import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '@patchdocs/ui';

export default function ImpactDialog({ open, onOpenChange, onConfirm }: any) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Destructive Rebuild Warning</DialogTitle>
          <DialogDescription>
            Editing this deployed custom device template will delete all connections on instances deployed in racks.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Proceed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
