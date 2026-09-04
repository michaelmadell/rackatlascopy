import { forwardRef } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { Button, type buttonVariants, Tooltip, TooltipContent, TooltipTrigger } from '@patchdocs/ui'

interface ButtonWithTooltipProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  tooltip?: string
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  tooltipDelayDuration?: number
  tooltipClassName?: string
}

const ButtonWithTooltip = forwardRef<HTMLButtonElement, ButtonWithTooltipProps>(
  ({ tooltip, tooltipSide = 'right', tooltipDelayDuration = 750, tooltipClassName, children, ...buttonProps }, ref) => {
    if (!tooltip) {
      return (
        <Button ref={ref} {...buttonProps}>
          {children}
        </Button>
      )
    }

    return (
      <Tooltip delayDuration={tooltipDelayDuration}>
        <TooltipTrigger asChild>
          <Button ref={ref} {...buttonProps}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className={tooltipClassName}>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
)

ButtonWithTooltip.displayName = 'ButtonWithTooltip'

export default ButtonWithTooltip
