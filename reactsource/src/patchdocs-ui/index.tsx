import React, { createContext, useContext, useState, forwardRef } from 'react';

// --- BUTTON & VARIANTS ---
export const buttonVariants = ({ variant = 'default', size = 'default', className = '' }: any = {}) => {
  return `inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${className}`;
};

export const Button = forwardRef<HTMLButtonElement, any>(({ className = '', variant = 'default', size = 'default', children, asChild, ...props }, ref) => {
  let bgClasses = 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]';
  if (variant === 'outline') bgClasses = 'border border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a] bg-transparent';
  if (variant === 'ghost') bgClasses = 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] bg-transparent';
  if (variant === 'destructive') bgClasses = 'bg-rose-600 text-white hover:bg-rose-700';
  if (variant === 'secondary') bgClasses = 'bg-[#27272a] text-[#f4f4f5] hover:bg-[#3f3f46]';

  let sizeClasses = 'px-3 py-1.5 text-xs';
  if (size === 'sm' || size === 'sm-icon') sizeClasses = 'px-2 py-1 text-xs';
  if (size === 'lg') sizeClasses = 'px-4 py-2 text-sm';
  if (size === 'icon') sizeClasses = 'p-1.5';

  return (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 ${bgClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';

// --- CARD ---
export const Card: React.FC<any> = ({ className = '', children, ...props }) => (
  <div className={`rounded-xl border border-[#27272a] bg-[#141416] text-[#f4f4f5] shadow-sm ${className}`} {...props}>{children}</div>
);
export const CardHeader: React.FC<any> = ({ className = '', children, ...props }) => (
  <div className={`p-4 border-b border-[#27272a] flex flex-col space-y-1.5 ${className}`} {...props}>{children}</div>
);
export const CardTitle: React.FC<any> = ({ className = '', children, ...props }) => (
  <h3 className={`text-sm font-bold leading-none tracking-tight text-[#f4f4f5] ${className}`} {...props}>{children}</h3>
);
export const CardDescription: React.FC<any> = ({ className = '', children, ...props }) => (
  <p className={`text-xs text-[#a1a1aa] ${className}`} {...props}>{children}</p>
);
export const CardContent: React.FC<any> = ({ className = '', children, ...props }) => (
  <div className={`p-4 ${className}`} {...props}>{children}</div>
);
export const CardFooter: React.FC<any> = ({ className = '', children, ...props }) => (
  <div className={`p-4 border-t border-[#27272a] flex items-center ${className}`} {...props}>{children}</div>
);

// --- INPUT & LABEL ---
export const Input = forwardRef<HTMLInputElement, any>(({ className = '', type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={`w-full px-3 py-1.5 text-xs rounded-lg bg-[#18181b] border border-[#27272a] text-[#f4f4f5] placeholder-[#71717a] focus:outline-none focus:border-[#38bdf8] transition-colors ${className}`}
    {...props}
  />
));
Input.displayName = 'Input';

export const Label: React.FC<any> = ({ className = '', children, ...props }) => (
  <label className={`text-[11px] font-semibold text-[#a1a1aa] leading-none mb-1 block ${className}`} {...props}>{children}</label>
);

// --- CHECKBOX ---
export const Checkbox = forwardRef<HTMLInputElement, any>(({ className = '', checked, onCheckedChange, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    checked={!!checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    className={`w-4 h-4 rounded bg-[#18181b] border border-[#27272a] text-[#2563eb] focus:ring-0 cursor-pointer ${className}`}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';

// --- BADGE ---
export const Badge: React.FC<any> = ({ variant = 'default', className = '', children, ...props }) => {
  let style = 'bg-[#27272a] text-[#f4f4f5]';
  if (variant === 'secondary') style = 'bg-[#18181b] text-[#a1a1aa]';
  if (variant === 'outline') style = 'border border-[#27272a] text-[#f4f4f5]';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${style} ${className}`} {...props}>{children}</span>;
};

// --- SEPARATOR ---
export const Separator: React.FC<any> = ({ className = '', orientation = 'horizontal', ...props }) => (
  <div className={`${orientation === 'vertical' ? 'w-px h-full' : 'h-px w-full'} bg-[#27272a] ${className}`} {...props} />
);

// --- DIALOG ---
export const Dialog: React.FC<any> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
export const DialogTrigger: React.FC<any> = ({ children, onClick }) => (
  <div onClick={onClick} className="inline-block cursor-pointer">{children}</div>
);
export const DialogContent: React.FC<any> = ({ className = '', children, ...props }) => (
  <div className={`w-full max-w-lg bg-[#141416] border border-[#27272a] rounded-2xl shadow-2xl p-6 text-left ${className}`} {...props}>
    {children}
  </div>
);
export const DialogHeader: React.FC<any> = ({ className = '', children }) => (
  <div className={`mb-4 flex flex-col space-y-1.5 ${className}`}>{children}</div>
);
export const DialogTitle: React.FC<any> = ({ className = '', children }) => (
  <h2 className={`text-base font-bold text-[#f4f4f5] ${className}`}>{children}</h2>
);
export const DialogDescription: React.FC<any> = ({ className = '', children }) => (
  <p className={`text-xs text-[#a1a1aa] ${className}`}>{children}</p>
);
export const DialogFooter: React.FC<any> = ({ className = '', children }) => (
  <div className={`mt-6 flex items-center justify-end gap-2.5 ${className}`}>{children}</div>
);
export const DialogClose: React.FC<any> = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="cursor-pointer">{children}</button>
);

// --- ALERT DIALOG ---
export const AlertDialog = Dialog;
export const AlertDialogContent = DialogContent;
export const AlertDialogHeader = DialogHeader;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogAction = Button;
export const AlertDialogCancel: React.FC<any> = ({ children, onClick }) => (
  <Button variant="outline" onClick={onClick}>{children}</Button>
);

// --- POPOVER ---
export const PopoverContext = createContext<{ isOpen: boolean; setIsOpen: (open: boolean) => void }>({ isOpen: false, setIsOpen: () => {} });
export const Popover: React.FC<any> = ({ open, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
};
export const PopoverTrigger: React.FC<any> = ({ asChild, children, ...props }) => {
  const { isOpen, setIsOpen } = useContext(PopoverContext);
  return (
    <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer" {...props}>
      {children}
    </div>
  );
};
export const PopoverContent: React.FC<any> = ({ className = '', children, align = 'center', ...props }) => {
  const { isOpen, setIsOpen } = useContext(PopoverContext);
  if (!isOpen) return null;
  return (
    <div
      className={`absolute z-50 mt-1 min-w-[180px] rounded-xl border border-[#27272a] bg-[#18181b] p-3 text-xs text-[#f4f4f5] shadow-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// --- SELECT ---
export const Select: React.FC<any> = ({ value, onValueChange, children }) => (
  <div className="relative inline-block w-full">{children}</div>
);
export const SelectTrigger: React.FC<any> = ({ className = '', children, ...props }) => (
  <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-[#f4f4f5] cursor-pointer ${className}`} {...props}>
    {children}
  </div>
);
export const SelectValue: React.FC<any> = ({ placeholder, children }) => (
  <span>{children || placeholder}</span>
);
export const SelectContent: React.FC<any> = ({ className = '', children }) => (
  <div className={`mt-1 rounded-lg bg-[#18181b] border border-[#27272a] p-1 shadow-lg ${className}`}>
    {children}
  </div>
);
export const SelectItem: React.FC<any> = ({ value, className = '', children, ...props }) => (
  <div className={`px-2 py-1.5 rounded text-xs hover:bg-[#27272a] text-[#f4f4f5] cursor-pointer ${className}`} {...props}>
    {children}
  </div>
);
export const SelectGroup: React.FC<any> = ({ children }) => <div>{children}</div>;
export const SelectLabel: React.FC<any> = ({ children }) => <div className="px-2 py-1 text-[10px] text-[#71717a] uppercase font-bold">{children}</div>;

// --- TABS ---
export const TabsContext = createContext<{ active: string; setActive: (val: string) => void }>({ active: '', setActive: () => {} });
export const Tabs: React.FC<any> = ({ value, defaultValue, onValueChange, className = '', children }) => {
  const [internal, setInternal] = useState(defaultValue || '');
  const active = value !== undefined ? value : internal;
  const setActive = onValueChange || setInternal;
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={`flex flex-col space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};
export const TabsList: React.FC<any> = ({ className = '', children }) => (
  <div className={`flex items-center gap-1 rounded-lg bg-[#18181b] border border-[#27272a] p-1 ${className}`}>{children}</div>
);
export const TabsTrigger: React.FC<any> = ({ value, className = '', children }) => {
  const { active, setActive } = useContext(TabsContext);
  const isSelected = active === value;
  return (
    <button
      type="button"
      onClick={() => setActive(value)}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        isSelected ? 'bg-[#27272a] text-[#f4f4f5] font-semibold' : 'text-[#a1a1aa] hover:text-[#f4f4f5]'
      } ${className}`}
    >
      {children}
    </button>
  );
};
export const TabsContent: React.FC<any> = ({ value, className = '', children }) => {
  const { active } = useContext(TabsContext);
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
};

// --- SCROLLAREA ---
export const ScrollArea: React.FC<any> = ({ className = '', children, ...props }) => (
  <div className={`overflow-auto scrollbar-thin ${className}`} {...props}>{children}</div>
);
export const ScrollBar: React.FC<any> = () => null;

// --- SHEET ---
export const Sheet: React.FC<any> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="h-full bg-[#141416] border-l border-[#27272a] p-6 shadow-2xl overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
export const SheetTrigger: React.FC<any> = ({ children }) => <>{children}</>;
export const SheetContent: React.FC<any> = ({ className = '', children }) => (
  <div className={`w-96 max-w-full ${className}`}>{children}</div>
);
export const SheetHeader: React.FC<any> = ({ children }) => <div className="mb-4">{children}</div>;
export const SheetTitle: React.FC<any> = ({ children }) => <h3 className="text-base font-bold text-[#f4f4f5]">{children}</h3>;
export const SheetDescription: React.FC<any> = ({ children }) => <p className="text-xs text-[#a1a1aa]">{children}</p>;
export const SheetFooter: React.FC<any> = ({ children }) => <div className="mt-6 flex justify-end gap-2">{children}</div>;
export const SheetClose: React.FC<any> = ({ children }) => <>{children}</>;

// --- COMMAND (cmdk wrapper) ---
export const Command: React.FC<any> = ({ className = '', children }) => (
  <div className={`flex flex-col bg-[#141416] border border-[#27272a] rounded-xl overflow-hidden ${className}`}>{children}</div>
);
export const CommandDialog: React.FC<any> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#141416] border border-[#27272a] rounded-xl shadow-2xl p-4">{children}</div>
    </div>
  );
};
export const CommandInput = forwardRef<HTMLInputElement, any>(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`w-full px-3 py-2 bg-transparent text-xs text-[#f4f4f5] border-b border-[#27272a] focus:outline-none ${className}`} {...props} />
));
CommandInput.displayName = 'CommandInput';
export const CommandList: React.FC<any> = ({ children }) => <div className="max-h-72 overflow-y-auto p-1">{children}</div>;
export const CommandEmpty: React.FC<any> = ({ children }) => <div className="p-4 text-center text-xs text-[#71717a]">{children}</div>;
export const CommandGroup: React.FC<any> = ({ heading, children }) => (
  <div className="p-1">
    {heading && <div className="text-[10px] uppercase font-bold text-[#71717a] px-2 py-1">{heading}</div>}
    {children}
  </div>
);
export const CommandItem: React.FC<any> = ({ onSelect, className = '', children }) => (
  <div onClick={onSelect} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[#f4f4f5] hover:bg-[#27272a] cursor-pointer ${className}`}>
    {children}
  </div>
);
export const CommandSeparator: React.FC<any> = () => <div className="h-px bg-[#27272a] my-1" />;
export const CommandShortcut: React.FC<any> = ({ children }) => <span className="ml-auto text-[10px] text-[#71717a] font-mono">{children}</span>;

// --- DROPDOWN MENU ---
export const DropdownMenuContext = createContext<{ isOpen: boolean; setIsOpen: (val: boolean) => void }>({ isOpen: false, setIsOpen: () => {} });
export const DropdownMenu: React.FC<any> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
};
export const DropdownMenuTrigger: React.FC<any> = ({ asChild, children }) => {
  const { isOpen, setIsOpen } = useContext(DropdownMenuContext);
  return (
    <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
      {children}
    </div>
  );
};
export const DropdownMenuContent: React.FC<any> = ({ align = 'right', className = '', children }) => {
  const { isOpen } = useContext(DropdownMenuContext);
  if (!isOpen) return null;
  return (
    <div className={`absolute z-50 mt-1 min-w-[160px] rounded-lg border border-[#27272a] bg-[#18181b] p-1 shadow-xl text-xs text-[#f4f4f5] ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}>
      {children}
    </div>
  );
};
export const DropdownMenuItem: React.FC<any> = ({ onClick, className = '', children }) => {
  const { setIsOpen } = useContext(DropdownMenuContext);
  return (
    <div
      onClick={(e) => {
        setIsOpen(false);
        if (onClick) onClick(e);
      }}
      className={`px-2.5 py-1.5 rounded-md hover:bg-[#27272a] cursor-pointer flex items-center gap-2 ${className}`}
    >
      {children}
    </div>
  );
};
export const DropdownMenuLabel: React.FC<any> = ({ children }) => (
  <div className="px-2.5 py-1 text-[11px] font-semibold text-[#71717a]">{children}</div>
);
export const DropdownMenuSeparator: React.FC<any> = () => <div className="h-px bg-[#27272a] my-1" />;
export const DropdownMenuGroup: React.FC<any> = ({ children }) => <div>{children}</div>;
export const DropdownMenuPortal: React.FC<any> = ({ children }) => <>{children}</>;
export const DropdownMenuSub: React.FC<any> = ({ children }) => <div>{children}</div>;
export const DropdownMenuSubTrigger: React.FC<any> = ({ children }) => <div className="px-2.5 py-1.5 rounded-md hover:bg-[#27272a] cursor-pointer flex items-center justify-between">{children}</div>;
export const DropdownMenuSubContent: React.FC<any> = ({ children }) => <div className="ml-2 bg-[#18181b] border border-[#27272a] rounded-lg p-1 shadow-xl">{children}</div>;

// --- TOOLTIP ---
export const TooltipProvider: React.FC<any> = ({ children }) => <>{children}</>;
export const Tooltip: React.FC<any> = ({ children }) => <div className="relative inline-block group">{children}</div>;
export const TooltipTrigger: React.FC<any> = ({ children }) => <>{children}</>;
export const TooltipContent: React.FC<any> = ({ children, className = '' }) => (
  <div className={`hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded bg-[#27272a] text-[10px] text-[#f4f4f5] whitespace-nowrap shadow-md z-50 ${className}`}>
    {children}
  </div>
);

// --- ALERT ---
export const Alert: React.FC<any> = ({ variant = 'default', className = '', children }) => (
  <div className={`p-4 rounded-xl border border-[#27272a] bg-[#18181b] text-xs text-[#f4f4f5] ${className}`}>{children}</div>
);
export const AlertTitle: React.FC<any> = ({ children }) => <div className="font-bold mb-1">{children}</div>;
export const AlertDescription: React.FC<any> = ({ children }) => <div className="text-[#a1a1aa]">{children}</div>;

// --- CALENDAR ---
export const Calendar: React.FC<any> = () => (
  <div className="p-3 text-center text-xs text-[#71717a]">Calendar picker</div>
);

// --- BREADCRUMB ---
export const Breadcrumb: React.FC<any> = ({ children }) => <nav className="flex items-center space-x-1 text-xs">{children}</nav>;
export const BreadcrumbList: React.FC<any> = ({ children }) => <ol className="flex items-center space-x-1.5">{children}</ol>;
export const BreadcrumbItem: React.FC<any> = ({ children }) => <li className="inline-flex items-center gap-1.5">{children}</li>;
export const BreadcrumbLink: React.FC<any> = ({ children, ...props }) => <span className="text-[#a1a1aa] hover:text-[#f4f4f5] cursor-pointer" {...props}>{children}</span>;
export const BreadcrumbSeparator: React.FC<any> = () => <span className="text-[#52525b]">/</span>;

// --- COLLAPSIBLE ---
export const Collapsible: React.FC<any> = ({ children }) => <div>{children}</div>;
export const CollapsibleTrigger: React.FC<any> = ({ children }) => <div className="cursor-pointer">{children}</div>;
export const CollapsibleContent: React.FC<any> = ({ children }) => <div>{children}</div>;

// --- SIDEBAR ---
const SidebarContext = createContext<any>({ open: true, setOpen: () => {} });
export const useSidebar = () => useContext(SidebarContext);
export const SidebarProvider: React.FC<any> = ({ children }) => {
  const [open, setOpen] = useState(true);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="flex w-full h-full min-h-screen bg-[#0c0c0e]">{children}</div>
    </SidebarContext.Provider>
  );
};
export const Sidebar: React.FC<any> = ({ children, className = '' }) => <aside className={`w-64 border-r border-[#27272a] bg-[#111113] flex flex-col shrink-0 ${className}`}>{children}</aside>;
export const SidebarHeader: React.FC<any> = ({ children, className = '' }) => <div className={`p-3 border-b border-[#27272a] ${className}`}>{children}</div>;
export const SidebarContent: React.FC<any> = ({ children, className = '' }) => <div className={`p-2 space-y-1 flex-1 overflow-y-auto ${className}`}>{children}</div>;
export const SidebarFooter: React.FC<any> = ({ children, className = '' }) => <div className={`p-3 border-t border-[#27272a] ${className}`}>{children}</div>;
export const SidebarGroup: React.FC<any> = ({ children, className = '' }) => <div className={`py-2 ${className}`}>{children}</div>;
export const SidebarGroupContent: React.FC<any> = ({ children, className = '' }) => <div className={`space-y-0.5 ${className}`}>{children}</div>;
export const SidebarMenu: React.FC<any> = ({ children, className = '' }) => <div className={`space-y-0.5 ${className}`}>{children}</div>;
export const SidebarMenuItem: React.FC<any> = ({ children, className = '' }) => <div className={className}>{children}</div>;
export const SidebarMenuButton: React.FC<any> = forwardRef<HTMLButtonElement, any>(({ children, className = '', isActive, asChild, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
      isActive ? 'bg-[#27272a] text-[#f4f4f5] font-semibold' : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
));
SidebarMenuButton.displayName = 'SidebarMenuButton';
export const SidebarMenuSub: React.FC<any> = ({ children }) => <div className="ml-4 pl-2 border-l border-[#27272a] space-y-0.5">{children}</div>;
export const SidebarMenuSubItem: React.FC<any> = ({ children }) => <div>{children}</div>;
export const SidebarMenuSubButton: React.FC<any> = ({ children, className = '', ...props }) => (
  <button type="button" className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[#a1a1aa] hover:text-[#f4f4f5] ${className}`} {...props}>
    {children}
  </button>
);

// --- MULTISELECT ---
export const MultiSelect: React.FC<any> = ({ placeholder = 'Select...', ...props }) => (
  <div className="w-full px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs text-[#a1a1aa]">{placeholder}</div>
);

// --- ACCORDION ---
export const Accordion: React.FC<any> = ({ children }) => <div className="space-y-2">{children}</div>;
export const AccordionItem: React.FC<any> = ({ children }) => <div className="border border-[#27272a] rounded-xl p-3">{children}</div>;
export const AccordionTrigger: React.FC<any> = ({ children }) => <button type="button" className="w-full text-left font-semibold text-xs text-[#f4f4f5]">{children}</button>;
export const AccordionContent: React.FC<any> = ({ children }) => <div className="mt-2 text-xs text-[#a1a1aa]">{children}</div>;

// --- AVATAR & SKELETON ---
export const Avatar: React.FC<any> = ({ className = '', children }) => <div className={`relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#27272a] ${className}`}>{children}</div>;
export const AvatarImage: React.FC<any> = ({ src, alt = '', className = '' }) => src ? <img src={src} alt={alt} className={`aspect-square h-full w-full object-cover ${className}`} /> : null;
export const AvatarFallback: React.FC<any> = ({ children, className = '' }) => <div className={`flex h-full w-full items-center justify-center rounded-full bg-[#27272a] text-xs text-[#f4f4f5] ${className}`}>{children}</div>;
export const Skeleton: React.FC<any> = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-[#27272a] ${className}`} />;

// --- TOASTER ---
export const Toaster: React.FC<any> = () => null;
