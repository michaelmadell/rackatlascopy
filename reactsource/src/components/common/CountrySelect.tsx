import { useMemo } from 'react'
import Combobox from '@/components/common/Combobox'
import { TbSelector } from 'react-icons/tb'
import { cn, getCountryOptions } from '@/lib/utils'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  buttonClassName?: string
  popoverClassName?: string
  disabled?: boolean
}

export function CountrySelect({
  value,
  onChange,
  placeholder = m.country_select_placeholder(),
  className,
  buttonClassName,
  popoverClassName,
  disabled = false
}: CountrySelectProps) {
  const locale = getLocale()
  const countries = useMemo(() => getCountryOptions(locale), [locale])

  return (
    <Combobox
      options={countries}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder={m.country_select_search_placeholder()}
      emptyMessage={m.country_select_empty_message()}
      className={className}
      buttonClassName={cn('h-8 md:h-8', buttonClassName)}
      popoverClassName={popoverClassName}
      disabled={disabled}
      icon={<TbSelector className="ml-2 size-3 shrink-0 opacity-50" />}
    />
  )
}

export default CountrySelect
