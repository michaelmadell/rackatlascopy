import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Input, Label } from '@patchdocs/ui';

export default function UserCreateDialog({ open, onOpenChange, onSave }: any) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Invite a new user to your organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (onSave) onSave({ email, name }); onOpenChange(false); }}>Invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
