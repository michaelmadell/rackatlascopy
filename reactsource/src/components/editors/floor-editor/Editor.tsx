import React from 'react';

export default function FloorEditor({
  floor,
  location,
  onSave,
}: {
  floor?: any;
  location?: any;
  onSave?: (data: any) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0c0c0e] text-[#f4f4f5]">
      <div className="w-full max-w-xl p-8 rounded-2xl bg-[#141416] border border-[#27272a] text-center space-y-3 shadow-xl">
        <h2 className="text-base font-bold text-[#f4f4f5]">Floor Canvas Editor</h2>
        <p className="text-xs text-[#a1a1aa]">
          {floor?.name || 'Floor Plan'} • {location?.name || 'Location'}
        </p>
      </div>
    </div>
  );
}
