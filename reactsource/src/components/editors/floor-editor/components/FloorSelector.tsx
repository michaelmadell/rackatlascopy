import React from 'react';

export default function FloorSelector({ floors = [], selectedFloorId, onSelectFloor }: any) {
  return (
    <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] rounded-lg p-1">
      {floors.map((f: any) => (
        <button
          key={f._id}
          type="button"
          onClick={() => onSelectFloor(f._id)}
          className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
            selectedFloorId === f._id ? 'bg-[#27272a] text-[#f4f4f5]' : 'text-[#a1a1aa]'
          }`}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
}
