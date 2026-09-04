import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from '@patchdocs/ui'
import LoadingIcon from '@/components/common/LoadingIcon'
import * as m from '@/paraglide/messages'

interface ExportLoadingDialogProps {
  open: boolean
}

const ExportLoadingDialog = ({ open }: ExportLoadingDialogProps) => {
  const handleInteraction = (e: Event) => e.preventDefault()

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="data-[size=default]:sm:max-w-80"
        {...({
          onPointerDownOutside: handleInteraction,
          onEscapeKeyDown: handleInteraction
          // biome-ignore lint/suspicious/noExplicitAny: AlertDialogContent wrapper component isn't exposing the Radix UI props in its type definition
        } as any)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.export_as_pdf()}</AlertDialogTitle>
          <AlertDialogDescription className="flex flex-col items-center w-full gap-4 pt-4">
            <LoadingIcon />
            <span>{m.exporting_pdf()}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ExportLoadingDialog
