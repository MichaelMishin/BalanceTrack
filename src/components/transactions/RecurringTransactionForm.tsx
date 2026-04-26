import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useHousehold } from '@/stores/household-context'
import { COMMON_CURRENCIES } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@/components/ui/form-dialog'
import { cn } from '@/lib/utils'
import type { CategoryType, RecurringTransaction, TimeFrame } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (item: {
    category_id: string
    amount: number
    currency: string
    description: string | null
    financial_account_id: string | null
    frequency: TimeFrame
    next_due_date: string
    is_estimated: boolean
  }) => Promise<void>
  editData?: RecurringTransaction | null
}

export function RecurringTransactionForm({ open, onClose, onSave, editData }: Props) {
  const { t } = useTranslation()
  const { household, categories, accounts } = useHousehold()

  const [type, setType] = useState<CategoryType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(household?.default_currency ?? 'ILS')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<TimeFrame>('monthly')
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0])
  const [accountId, setAccountId] = useState('_none')
  const [isEstimated, setIsEstimated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editData) {
      const cat = categories.find(c => c.id === editData.category_id)
      setType(cat?.type ?? 'expense')
      setCategoryId(editData.category_id)
      setAmount(editData.amount.toString())
      setCurrency(editData.currency)
      setDescription(editData.description ?? '')
      setFrequency(editData.frequency)
      setNextDueDate(editData.next_due_date)
      setAccountId(editData.financial_account_id ?? '_none')
      setIsEstimated(editData.is_estimated)
    } else {
      setType('expense')
      setCategoryId('')
      setAmount('')
      setCurrency(household?.default_currency ?? 'ILS')
      setDescription('')
      setFrequency('monthly')
      setNextDueDate(new Date().toISOString().split('T')[0])
      setAccountId('_none')
      setIsEstimated(false)
    }
    setSubmitting(false)
    setError(null)
  }, [open, editData, categories, household?.default_currency])

  const filteredCategories = categories.filter(c => c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await onSave({
        category_id: categoryId,
        amount: parseFloat(amount),
        currency,
        description: description || null,
        financial_account_id: accountId === '_none' ? null : accountId,
        frequency,
        next_due_date: nextDueDate,
        is_estimated: isEstimated,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose() }}
      title={editData ? t('recurring.edit') : t('recurring.add')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={type === 'income' ? 'default' : 'outline'}
            className={cn(
              'flex-1 cursor-pointer',
              type === 'income' && 'bg-success hover:bg-success/90 text-success-foreground'
            )}
            onClick={() => { setType('income'); setCategoryId('') }}
          >
            {t('transactions.income')}
          </Button>
          <Button
            type="button"
            variant={type === 'expense' ? 'default' : 'outline'}
            className={cn(
              'flex-1 cursor-pointer',
              type === 'expense' && 'bg-destructive hover:bg-destructive/90 text-white'
            )}
            onClick={() => { setType('expense'); setCategoryId('') }}
          >
            {t('transactions.expense')}
          </Button>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>{t('transactions.category')}</Label>
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder={t('transactions.category')} />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map(c => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount + Currency */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-2">
            <Label>{t('transactions.amount')}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t('transactions.currency')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code} className="cursor-pointer">
                    {c.symbol} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label>{t('recurring.frequency')}</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as TimeFrame)}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly" className="cursor-pointer">{t('settings.weekly')}</SelectItem>
              <SelectItem value="biweekly" className="cursor-pointer">{t('settings.biweekly')}</SelectItem>
              <SelectItem value="monthly" className="cursor-pointer">{t('settings.monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Next Due Date */}
        <div className="space-y-2">
          <Label>{t('recurring.nextDueDate')}</Label>
          <Input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{t('transactions.description')}</Label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('transactions.description')}
          />
        </div>

        {/* Account */}
        {accounts.length > 0 && (
          <div className="space-y-2">
            <Label>{t('transactions.account')}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t('transactions.account')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none" className="cursor-pointer">—</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id} className="cursor-pointer">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Estimated toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isEstimated}
            onChange={(e) => setIsEstimated(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm text-muted-foreground">{t('recurring.estimated')}</span>
        </label>

        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !categoryId} className="cursor-pointer">
            {submitting ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
