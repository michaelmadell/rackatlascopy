import { useState } from 'react';
import { Button, Input } from '@/patchdocs-ui';
import { TbPlus } from 'react-icons/tb';

/**
 * Building tabs (Location -> Building) above floor tabs (Building -> Floor).
 * Selecting "All" for building shows every floor at this location, including
 * ones with no building assigned yet.
 */
export default function FloorSelector({
  floors = [],
  currentFloorId,
  onSelectFloor,
  onCreateFloor,
  buildings = [],
  selectedBuildingId,
  onSelectBuilding,
  onCreateBuilding,
  readOnly,
}: {
  floors?: any[];
  currentFloorId?: string;
  onSelectFloor?: (floorId: string) => void;
  onCreateFloor?: (data: { reference: string; name?: string; level: number; buildingId?: string }) => Promise<boolean>;
  buildings?: any[];
  selectedBuildingId?: string | null;
  onSelectBuilding?: (buildingId: string | null) => void;
  onCreateBuilding?: (data: { name: string; reference?: string }) => Promise<boolean>;
  readOnly?: boolean;
  [key: string]: any;
}) {
  const [addingBuilding, setAddingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [addingFloor, setAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  const visibleFloors = selectedBuildingId
    ? floors.filter((f: any) => f.buildingId === selectedBuildingId)
    : floors;

  const handleCreateBuilding = async () => {
    if (!newBuildingName.trim() || !onCreateBuilding) return;
    const ok = await onCreateBuilding({ name: newBuildingName.trim() });
    if (ok) {
      setNewBuildingName('');
      setAddingBuilding(false);
    }
  };

  const handleCreateFloor = async () => {
    if (!newFloorName.trim() || !onCreateFloor) return;
    const ok = await onCreateFloor({
      name: newFloorName.trim(),
      reference: newFloorName.trim().toUpperCase().replace(/\s+/g, '-'),
      level: visibleFloors.length,
      buildingId: selectedBuildingId || undefined
    });
    if (ok) {
      setNewFloorName('');
      setAddingFloor(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border-b border-[#27272a] bg-[#0c0c0e]">
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => onSelectBuilding?.(null)}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
            !selectedBuildingId ? 'bg-[#27272a] text-[#f4f4f5]' : 'text-[#a1a1aa]'
          }`}
        >
          All buildings
        </button>
        {buildings.map((b: any) => (
          <button
            key={b._id}
            type="button"
            onClick={() => onSelectBuilding?.(b._id)}
            className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
              selectedBuildingId === b._id ? 'bg-[#27272a] text-[#f4f4f5]' : 'text-[#a1a1aa]'
            }`}
          >
            {b.name}
          </button>
        ))}
        {!readOnly &&
          (addingBuilding ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                className="h-7 w-40"
                value={newBuildingName}
                onChange={(e: any) => setNewBuildingName(e.target.value)}
                placeholder="Building name"
                onKeyDown={(e: any) => e.key === 'Enter' && handleCreateBuilding()}
              />
              <Button size="sm" className="h-7" onClick={handleCreateBuilding}>
                Add
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingBuilding(true)}
              className="px-2 py-1 rounded text-xs text-[#a1a1aa] hover:text-[#f4f4f5] flex items-center gap-1"
            >
              <TbPlus className="size-3" /> Building
            </button>
          ))}
      </div>

      <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] rounded-lg p-1 flex-wrap">
        {visibleFloors.map((f: any) => (
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
    </div>
  );
}
