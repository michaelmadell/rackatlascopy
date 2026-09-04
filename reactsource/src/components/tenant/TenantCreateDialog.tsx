import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Input, Label } from '@patchdocs/ui';

export default function TenantCreateDialog({ open, onOpenChange, onSave }: any) {
  const [name, setName] = useState('');

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tenant</DialogTitle>
          <DialogDescription>Create a new isolated tenant workspace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Tenant Name *</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Production Data Center" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (onSave) onSave({ name }); onOpenChange(false); }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
