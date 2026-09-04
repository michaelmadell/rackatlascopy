type KeyboardCommandProps = {
  modifier?: boolean
  secondModifier?: string | React.ReactNode
  keyValue: string | React.ReactNode
  className?: string
  small?: boolean
}

export function KeyboardCommand({
  modifier = true,
  secondModifier,
  keyValue,
  className = '',
  small = false
}: KeyboardCommandProps) {
  const isAppleDevice = /Mac|iPhone|iPad|iPod/i.test(navigator.platform)

  const modifierSize = small
    ? isAppleDevice
      ? 'h-4 text-[13px]'
      : 'h-4 text-[10px]'
    : isAppleDevice
      ? 'h-5 text-sm'
      : 'h-5 text-[11px]'

  const keySize = small ? 'h-4 text-[10px]' : 'h-5 text-[11px]'

  return (
    <kbd className={`flex items-center gap-1 font-mono font-medium select-none ${className}`}>
      {modifier && (
        <span className={`flex items-center bg-muted rounded border px-1 leading-none ${modifierSize}`}>
          {isAppleDevice ? '⌘' : 'Ctrl'}
        </span>
      )}
      {secondModifier && (
        <span className={`flex items-center bg-muted rounded border px-1 leading-none ${modifierSize}`}>
          {secondModifier}
        </span>
      )}
      <span className={`flex items-center bg-muted rounded border px-1 leading-none ${keySize}`}>{keyValue}</span>
    </kbd>
  )
}
