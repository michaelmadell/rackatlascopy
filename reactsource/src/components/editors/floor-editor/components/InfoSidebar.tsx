import React from 'react';

export interface InfoSidebarProps {
  open?: boolean;
  onClose?: () => void;
  [key: string]: any;
}

export default function InfoSidebar({ open = true, onClose, children }: InfoSidebarProps) {
  if (!open) return null;
  return (
    <aside className="w-80 border-l border-[#27272a] bg-[#141416] p-4 text-xs text-[#f4f4f5] overflow-y-auto">
      {children || <div>Information Sidebar</div>}
    </aside>
  );
}
