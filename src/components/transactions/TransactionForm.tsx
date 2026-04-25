import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { formatCurrency } from '@/lib/utils'
import { getExchangeRate, convertAmount, COMMON_CURRENCIES } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@/components/ui/form-dialog'
import { cn } from '@/lib/utils'
import type { TransactionInsert, CategoryType } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (tx: TransactionInsert) => Promise<void>
  editData?: {
    id: string
    category_id: string
    amount: number
    currency: string
    description: string | null
    transaction_date: string
    financial_account_id: string | null
  }
}

export function TransactionForm({ open, onClose, onSave, editData }: Props) {
  const { t } = useTranslation()
  const { household, categories, accounts } = useHousehold()
  const { user } = useAuth()

  const [type, setType] = useState<CategoryType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(household?.default_currency ?? 'ILS')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [accountId, setAccountId] = useState('_none')
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form state when dialog opens or editData changes
  useEffect(() => {
    if (!open) return
    if (editData) {
      const cat = categories.find(c => c.id === editData.category_id)
      setType(cat?.type ?? 'expense')
      setCategoryId(editData.category_id)
      setAmount(editData.amount.toString())
      setCurrency(editData.currency)
      setDescription(editData.description ?? '')
      setDate(editData.transaction_date)
      setAccountId(editData.financial_account_id ?? '_none')
    } else {
      setType('expense')
      setCategoryId('')
      setAmount('')
      setCurrency(household?.default_currency ?? 'ILS')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setAccountId('_none')
    }
    setConvertedPreview(null)
    setSubmitting(false)
    setError(null)
  }, [open, editData, categories, household?.default_currency])

  const filteredCategories = categories.filter(c => c.type === type)

  async function handleCurrencyChange(newCurrency: string) {
    setCurrency(newCurrency)
    if (newCurrency !== household?.default_currency && amount && household) {
      try {
        const rate = await getExchangeRate(newCurrency, household.default_currency, date)
        const converted = convertAmount(parseFloat(amount), rate)
        setConvertedPreview(formatCurrency(converted, household.default_currency))
      } catch {
        setConvertedPreview(null)
      }
    } else {
      setConvertedPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!household || !user) return

    setSubmitting(true)
    setError(null)

    try {
      const parsedAmount = parseFloat(amount)
      let convertedAmount = parsedAmount
      let exchangeRate = 1

      if (currency !== household.default_currency) {
        exchangeRate = await getExchangeRate(currency, household.default_currency, date)
        convertedAmount = convertAmount(parsedAmount, exchangeRate)
      }

      const tx: TransactionInsert = {
        household_id: household.id,
        category_id: categoryId,
        financial_account_id: accountId === '_none' ? null : accountId,
        entered_by: user.id,
        amount: parsedAmount,
        currency,
        converted_amount: convertedAmount,
        exchange_rate: exchangeRate,
        description: description || null,
        transaction_date: date,
        is_manual: true,
        source: 'manual',
      }

      await onSave(tx)
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
      title={editData ? t('transactions.edit') : t('transactions.add')}
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
              <Select value={currency} onValueChange={handleCurrencyChange}>
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

          {convertedPreview && (
            <p className="text-sm text-muted-foreground">
              ≈ {convertedPreview}
            </p>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>{t('transactions.date')}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
