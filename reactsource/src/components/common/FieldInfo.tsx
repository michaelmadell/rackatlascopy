import type { AnyFieldApi } from '@tanstack/react-form'

export default function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <div className="text-[11px] text-destructive-foreground">
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <div className="mt-1">
          <em>
            {[...new Set(field.state.meta.errors?.map((e) => (typeof e === 'string' ? e : e?.message || '')))].join(
              '. '
            )}
          </em>
        </div>
      ) : null}
    </div>
  )
}
