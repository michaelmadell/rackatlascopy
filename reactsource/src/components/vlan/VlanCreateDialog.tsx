import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Input, Label } from '@patchdocs/ui';

export default function VlanCreateDialog({ open, onOpenChange, onSave }: any) {
  const [name, setName] = useState('');
  const [vlanId, setVlanId] = useState('');

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add VLAN</DialogTitle>
          <DialogDescription>Define a new Virtual Local Area Network.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>VLAN ID (1-4094) *</Label>
            <Input type="number" min={1} max={4094} value={vlanId} onChange={(e: any) => setVlanId(e.target.value)} placeholder="e.g. 10" />
          </div>
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Management" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (onSave) onSave({ vlanId, name }); onOpenChange(false); }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
