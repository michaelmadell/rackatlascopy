import type { ComponentProps } from 'react'
import { TbBook } from 'react-icons/tb'
import { useDocPanel } from '@/contexts/DocPanelContext'
import ButtonWithTooltip from './ButtonWithTooltip'
import * as m from '@/paraglide/messages'

interface HelpButtonProps
  extends Pick<ComponentProps<typeof ButtonWithTooltip>, 'variant' | 'size' | 'type' | 'className' | 'tooltipSide'> {
  docSlug: string
}

export default function HelpButton({
  docSlug,
  variant = 'ghost',
  size = 'icon',
  type = 'button',
  className,
  tooltipSide = 'bottom'
}: HelpButtonProps) {
  const { openDoc } = useDocPanel()

  return (
    <ButtonWithTooltip
      variant={variant}
      size={size}
      type={type}
      className={className}
      tooltip={m.documentation()}
      tooltipSide={tooltipSide}
      onClick={() => openDoc(docSlug)}
      aria-label={m.documentation()}>
      <TbBook />
    </ButtonWithTooltip>
  )
}
