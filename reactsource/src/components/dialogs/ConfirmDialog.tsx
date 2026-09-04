import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Label
} from '@patchdocs/ui'
import { TbLoader2 } from 'react-icons/tb'
import * as m from '@/paraglide/messages'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmButtonText?: string
  cancelButtonText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  addedVerification?: string
  loading?: boolean
  className?: string
  hideCancel?: boolean
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmButtonText = m.confirm(),
  cancelButtonText = m.cancel(),
  onConfirm,
  onCancel,
  variant = 'default',
  addedVerification,
  loading,
  className,
  hideCancel
}: ConfirmDialogProps) => {
  const [verificationInput, setVerificationInput] = useState('')

  // Reset verification input when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setVerificationInput('')
    }
  }, [open])

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  const handleCancel = async () => {
    if (onCancel) {
      await onCancel()
    }
    onOpenChange(false)
  }

  const isConfirmDisabled = loading || (addedVerification ? verificationInput !== addedVerification : false)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {addedVerification && (
          <div className="py-3 space-y-2">
            <Label htmlFor="verification-input" className="text-sm font-medium gap-1">
              {m.type_to_confirm_part1()}{' '}
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{addedVerification}</span>{' '}
              {m.type_to_confirm_part2()}:
            </Label>
            <Input
              id="verification-input"
              type="text"
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
        )}

        <AlertDialogFooter>
          {!hideCancel && <AlertDialogCancel onClick={handleCancel}>{cancelButtonText}</AlertDialogCancel>}
          <AlertDialogAction onClick={handleConfirm} disabled={isConfirmDisabled} variant={variant}>
            {loading && <TbLoader2 className="animate-spin mr-1.5" />}
            {confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConfirmDialog
