import React from 'react';

export default function RackEditor({
  device,
  readOnly = false,
  onSave,
}: {
  device?: any;
  readOnly?: boolean;
  onSave?: (data: any) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0c0c0e] text-[#f4f4f5]">
      <div className="w-full max-w-xl p-8 rounded-2xl bg-[#141416] border border-[#27272a] text-center space-y-3 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-[#27272a] mx-auto flex items-center justify-center text-[#38bdf8] font-bold font-mono">
          42U
        </div>
        <h2 className="text-base font-bold text-[#f4f4f5]">Rack Studio Editor</h2>
        <p className="text-xs text-[#a1a1aa]">
          {device?.name || 'Rack Equipment'} mounted at Location.
        </p>
      </div>
    </div>
  );
}
