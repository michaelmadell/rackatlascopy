import { Label } from '@patchdocs/ui'
import Combobox from '@/components/common/Combobox'
import * as m from '@/paraglide/messages'

interface TargetRowProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** Labelled combobox row for picking a target resource. The label doubles as the resource name in the
 * combobox's own placeholder/search/empty strings, so callers pass a resource label like `m.room()`. */
const TargetRow = ({ label, options, value, onChange, disabled }: TargetRowProps) => (
  <div className="grid grid-cols-4 items-center gap-4">
    <Label>{label}</Label>
    <div className="col-span-3">
      <Combobox
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={m.select_resource({ resource: label })}
        searchPlaceholder={`${m.search_resource({ resource: label })}...`}
        emptyMessage={m.no_resource_found({ resource: label })}
        buttonClassName="h-8 md:h-8"
      />
    </div>
  </div>
)

export default TargetRow
