import React from 'react';
import Logo from '@/components/common/Logo';

export default function AccountLayout({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 text-[#f4f4f5]">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo className="h-8 w-auto mb-2" />
          {title && <h1 className="text-xl font-bold text-[#f4f4f5]">{title}</h1>}
          {subtitle && <p className="text-xs text-[#a1a1aa]">{subtitle}</p>}
        </div>
        <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-6 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
