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
import type { CustomDeviceType, DeviceCategory } from '@/types';

export default function CustomDeviceTypeDialog({
  open,
  onOpenChange,
  mode = 'create',
  category = 'floor',
  deviceType,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  category?: DeviceCategory;
  deviceType?: CustomDeviceType;
  onSave?: (data: any) => void;
}) {
  const [name, setName] = useState(deviceType?.name || '');
  const [prefix, setPrefix] = useState(deviceType?.prefix || deviceType?.defaultPrefix || '');

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Device Type' : 'Edit Device Type'}</DialogTitle>
          <DialogDescription>
            Configure custom device naming and default ID prefixes for {category} devices.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Access Point" />
          </div>
          <div>
            <Label>Default ID Prefix *</Label>
            <Input value={prefix} onChange={(e: any) => setPrefix(e.target.value.toUpperCase())} placeholder="e.g. AP" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (onSave) onSave({ name, prefix, category });
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
