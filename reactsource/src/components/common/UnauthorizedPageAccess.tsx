import React from 'react';
import { TbLock } from 'react-icons/tb';

export default function UnauthorizedPageAccess() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-[#f4f4f5]">
      <TbLock className="text-4xl text-rose-500" />
      <h2 className="text-base font-bold">Unauthorized Access</h2>
      <p className="text-xs text-[#a1a1aa]">You do not have permission to view this page.</p>
    </div>
  );
}
