import { useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@patchdocs/ui'
import { TbSelector, TbCheck } from 'react-icons/tb'
import { cn } from '@/lib/utils'
import * as m from '@/paraglide/messages'

export interface ComboboxOption {
  value: string
  label: string
  group?: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  buttonClassName?: string
  popoverClassName?: string
  disabled?: boolean
  grouped?: boolean
  // Optional custom icon instead of TbSelector
  icon?: React.ReactNode
  // Optional callback when popover opens/closes
  onOpenChange?: (open: boolean) => void
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = m.combobox_placeholder(),
  searchPlaceholder = m.combobox_search_placeholder(),
  emptyMessage = m.combobox_empty_message(),
  className,
  buttonClassName,
  popoverClassName,
  disabled = false,
  grouped = false,
  icon,
  onOpenChange
}: ComboboxProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const selectedOption = options.find((option) => option.value === value)

  // Group options by their group property if grouped is true
  const groupedOptions = grouped
    ? options.reduce(
        (acc, option) => {
          const groupName = option.group || 'Other'
          if (!acc[groupName]) {
            acc[groupName] = []
          }
          acc[groupName].push(option)
          return acc
        },
        {} as Record<string, ComboboxOption[]>
      )
    : null

  return (
    <div className={className}>
      <Popover modal={true} open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn(
              'font-normal w-full justify-between shadow-none',
              !value && 'text-muted-foreground',
              buttonClassName
            )}>
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
            {icon || <TbSelector className="ml-2 size-4 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-50 p-0', popoverClassName)}>
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              className={cn('h-9', popoverClassName?.includes('text-[13px]') ? 'text-[13px]' : '')}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              {grouped && groupedOptions ? (
                // Render grouped options
                Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                  <CommandGroup key={groupName} heading={groupName}>
                    {groupOptions.map((option) => (
                      <CommandItem
                        value={option.value}
                        keywords={[option.label]}
                        key={`ci-${option.value}`}
                        disabled={option.disabled}
                        className={popoverClassName?.includes('text-[13px]') ? 'text-[13px] py-1' : ''}
                        onSelect={(selectedValue) => {
                          onChange(selectedValue)
                          handleOpenChange(false)
                        }}>
                        <span className="break-all">{option.label}</span>
                        <TbCheck
                          className={cn(
                            'ml-auto size-4 shrink-0',
                            option.value === value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              ) : (
                // Render ungrouped options
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      value={option.value}
                      keywords={[option.label]}
                      key={`ci-${option.value}`}
                      disabled={option.disabled}
                      className={popoverClassName?.includes('text-[13px]') ? 'text-[13px] py-1' : ''}
                      onSelect={(selectedValue) => {
                        onChange(selectedValue)
                        handleOpenChange(false)
                      }}>
                      <span className="break-all">{option.label}</span>
                      <TbCheck
                        className={cn('ml-auto size-4 shrink-0', option.value === value ? 'opacity-100' : 'opacity-0')}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default Combobox
