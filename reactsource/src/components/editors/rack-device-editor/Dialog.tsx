import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@patchdocs/ui';
import type { CustomRackDevice } from '@/types';

export default function RackDeviceEditorDialog({
  open,
  onOpenChange,
  rackDevice,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rackDevice?: CustomRackDevice;
  onSave?: (data: any) => void;
}) {
  const [name, setName] = useState(rackDevice?.name || '');
  const [brand, setBrand] = useState(rackDevice?.brand || 'Cisco');
  const [type, setType] = useState(rackDevice?.type || 'Switch');
  const [rackUnits, setRackUnits] = useState(rackDevice?.rackUnits || 1);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rack Device Editor</DialogTitle>
          <DialogDescription>Edit a custom rack device.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Catalyst 3850-48P" />
          </div>
          <div>
            <Label>Brand</Label>
            <Input value={brand} onChange={(e: any) => setBrand(e.target.value)} placeholder="e.g. Cisco" />
          </div>
          <div>
            <Label>Device type *</Label>
            <Input value={type} onChange={(e: any) => setType(e.target.value)} placeholder="Switch" />
          </div>
          <div>
            <Label>Rack units</Label>
            <Input type="number" min={1} max={8} value={rackUnits} onChange={(e: any) => setRackUnits(Number(e.target.value))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (onSave) onSave({ name, brand, type, rackUnits });
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
