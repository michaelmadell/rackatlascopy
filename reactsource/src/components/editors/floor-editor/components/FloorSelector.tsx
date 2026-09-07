import { useState } from 'react';
import { Button, Input } from '@/patchdocs-ui';
import { TbPlus } from 'react-icons/tb';

/**
 * Floor tabs (Location -> Floor, matching the real product — no Building
 * level exists there) with inline "+ Floor" create.
 */
export default function FloorSelector({
  floors = [],
  currentFloorId,
  onSelectFloor,
  onCreateFloor,
  readOnly,
}: {
  floors?: any[];
  currentFloorId?: string;
  onSelectFloor?: (floorId: string) => void;
  onCreateFloor?: (data: { reference: string; name?: string; level: number }) => Promise<boolean>;
  readOnly?: boolean;
  [key: string]: any;
}) {
  const [addingFloor, setAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  const handleCreateFloor = async () => {
    if (!newFloorName.trim() || !onCreateFloor) return;
    const ok = await onCreateFloor({
      name: newFloorName.trim(),
      reference: newFloorName.trim().toUpperCase().replace(/\s+/g, '-'),
      level: floors.length
    });
    if (ok) {
      setNewFloorName('');
      setAddingFloor(false);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] rounded-lg p-1 flex-wrap m-2">
      {floors.map((f: any) => (
        <button
          key={f._id}
          type="button"
          onClick={() => onSelectFloor?.(f._id)}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
            currentFloorId === f._id ? 'bg-[#27272a] text-[#f4f4f5]' : 'text-[#a1a1aa]'
          }`}
        >
          {f.name || f.reference}
        </button>
      ))}
      {!readOnly &&
        (addingFloor ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              className="h-7 w-36"
              value={newFloorName}
              onChange={(e: any) => setNewFloorName(e.target.value)}
              placeholder="Floor name"
              onKeyDown={(e: any) => e.key === 'Enter' && handleCreateFloor()}
            />
            <Button size="sm" className="h-7" onClick={handleCreateFloor}>
              Add
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingFloor(true)}
            className="px-2 py-1 rounded text-xs text-[#a1a1aa] hover:text-[#f4f4f5] flex items-center gap-1"
          >
            <TbPlus className="size-3" /> Floor
          </button>
        ))}
    </div>
  );
}
