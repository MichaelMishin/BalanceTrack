import { FormDialog } from '@/components/ui/form-dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="max-w-sm"
    >
      <div className="flex gap-2 justify-end pt-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="cursor-pointer"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={() => {
            onConfirm()
            onOpenChange(false)
          }}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? '...' : confirmLabel}
        </Button>
      </div>
    </FormDialog>
  )
}
