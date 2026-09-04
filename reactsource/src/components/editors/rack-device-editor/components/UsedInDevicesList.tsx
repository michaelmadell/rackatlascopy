import React from 'react';

export default function UsedInDevicesList({ devices = [] }: { devices?: any[] }) {
  if (!devices || devices.length === 0) {
    return <div className="text-xs text-[#71717a]">Not currently used in any racks.</div>;
  }
  return (
    <ul className="text-xs space-y-1">
      {devices.map((d: any, idx: number) => (
        <li key={idx} className="text-[#f4f4f5]">{d.name || d._id}</li>
      ))}
    </ul>
  );
}
