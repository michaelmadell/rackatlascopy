import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Input, Label } from '@patchdocs/ui';

export default function WlanCreateDialog({ open, onOpenChange, onSave }: any) {
  const [ssid, setSsid] = useState('');

  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add WLAN</DialogTitle>
          <DialogDescription>Define a new wireless network SSID.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>SSID Name *</Label>
            <Input value={ssid} onChange={(e: any) => setSsid(e.target.value)} placeholder="e.g. Office_WiFi" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (onSave) onSave({ ssid }); onOpenChange(false); }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
