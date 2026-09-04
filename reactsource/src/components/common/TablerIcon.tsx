import React from 'react';
import * as Icons from 'react-icons/tb';

export default function TablerIcon({ name, className = '' }: { name?: string; className?: string }) {
  if (!name) return <Icons.TbSquare className={className} />;
  const IconComponent = (Icons as any)[name] || Icons.TbSquare;
  return <IconComponent className={className} />;
}
