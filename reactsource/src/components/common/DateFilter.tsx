import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger, Button, Calendar } from '@patchdocs/ui'
import { TbChevronDown, TbX } from 'react-icons/tb'
import { cn, formatDate } from '@/lib/utils'
import * as m from '@/paraglide/messages'

interface DateFilterProps {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
}

const DateFilter = ({ selected, onSelect, placeholder, disabled, className }: DateFilterProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full h-8 sm:h-10 justify-between font-normal text-left', className)}>
          <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
            {selected ? formatDate(selected) : placeholder || m.select_filter()}
          </span>
          <div className="flex items-center gap-1">
            {selected && (
              <button
                type="button"
                className="hover:bg-accent rounded p-0.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(undefined)
                }}>
                <TbX className="size-4" />
              </button>
            )}
            <TbChevronDown className={`size-4 ${selected ? 'text-foreground' : 'text-muted-foreground'}`} />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onSelect(date)
            setOpen(false)
          }}
          captionLayout="dropdown"
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}

export default DateFilter
