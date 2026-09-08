import { useState } from 'react';
import { Label } from '@/patchdocs-ui';
import NoteEditorDialogMdx from '@/components/dialogs/NoteEditorDialogMdx';

/** Same "Notes" section shown on both the Rack and Device settings panels
 *  in a screenshot sequence — "Add your first note…" placeholder plus an
 *  "Edit" link, matching the excerpt-plus-dialog convention this app
 *  already uses for Vlan/Location/Room notes (see NoteEditorDialogMdx's
 *  other call sites). `onSave` is expected to persist immediately (its
 *  own PATCH), independent of the panel's own Save button — same as
 *  those other call sites. */
export default function NotesField({
  notes,
  resourceName,
  readOnly,
  onSave
}: {
  notes: string;
  resourceName: string;
  readOnly?: boolean;
  onSave: (content: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Notes</Label>
        {!readOnly && (
          <button type="button" onClick={() => setOpen(true)} className="text-[10px] text-blue-400 hover:text-blue-300">
            Edit
          </button>
        )}
      </div>
      <p className="line-clamp-2 text-[11px] text-[#71717a]">{notes || 'Add your first note…'}</p>

      {open && (
        <NoteEditorDialogMdx
          open={open}
          onOpenChange={setOpen}
          initialContent={notes || ''}
          onSave={onSave}
          canEdit={!readOnly}
          resourceName={resourceName}
        />
      )}
    </div>
  );
}
