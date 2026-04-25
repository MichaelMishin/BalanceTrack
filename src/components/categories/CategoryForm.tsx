import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '@/components/ui/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CategoryType } from '@/types/database'

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, type: CategoryType) => Promise<void>
  editData?: { name: string; type: CategoryType }
}

export function CategoryForm({ open, onOpenChange, onSave, editData }: CategoryFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editData?.name ?? '')
      setType(editData?.type ?? 'expense')
      setSubmitting(false)
    }
  }, [open, editData])

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
      title={editData ? t('categories.rename', 'Rename Category') : t('categories.addCategory')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t('categories.name')}</Label>
          <Input
            placeholder={t('categories.name')}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {!editData && (
          <div className="space-y-2">
            <Label>{t('transactions.type', 'Type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income" className="cursor-pointer">{t('transactions.income')}</SelectItem>
                <SelectItem value="expense" className="cursor-pointer">{t('transactions.expense')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()} className="cursor-pointer">
            {submitting ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
