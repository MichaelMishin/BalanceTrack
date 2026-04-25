import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/components/ui/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AccountType = 'checking' | 'savings' | 'credit_card' | 'other'

interface AccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, type: AccountType) => Promise<void>
}

export function AccountForm({ open, onOpenChange, onSave }: AccountFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setType('checking')
      setSubmitting(false)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSave(name.trim(), type)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.addAccount')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t('settings.addAccount')}</Label>
          <Input
            placeholder={t('settings.addAccount')}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking" className="cursor-pointer">Checking</SelectItem>
              <SelectItem value="savings" className="cursor-pointer">Savings</SelectItem>
              <SelectItem value="credit_card" className="cursor-pointer">Credit Card</SelectItem>
              <SelectItem value="other" className="cursor-pointer">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()} className="cursor-pointer">
            {submitting ? t('common.loading') : t('common.add')}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
