import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart'
import { CategoryDetail } from '@/components/transactions/CategoryDetail'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import type { Transaction, TransactionInsert } from '@/types/database'

export function PersonalView() {
  const { t } = useTranslation()
  const { household } = useHousehold()
  const { profile } = useAuth()
  const {
    expensesByCategory,
    totalIncome,
    totalExpenses,
    netSavings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loading,
  } = useTransactions(true) // personalOnly = true

  const [formOpen, setFormOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const currency = household?.default_currency ?? 'ILS'
  const locale = profile?.locale === 'he' ? 'he-IL' : 'en-US'

  async function handleSave(tx: TransactionInsert) {
    if (editTx) {
      await updateTransaction(editTx.id, tx)
    } else {
      await addTransaction(tx as Omit<Transaction, 'id' | 'created_at' | 'updated_at'>)
    }
    setEditTx(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t('common.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.personal')}</h1>
        <Button onClick={() => setFormOpen(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-1" />
          {t('transactions.add')}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('dashboard.moneyIn')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-success">{formatCurrency(totalIncome, currency, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('dashboard.moneyOut')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totalExpenses, currency, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t('dashboard.netThisPeriod')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${netSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netSavings, currency, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.moneyOut')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.values(expensesByCategory)
                .sort((a, b) => a.category.sort_order - b.category.sort_order)
                .map(({ category, transactions, total }) => (
                  <CategoryDetail
                    key={category.id}
                    category={category}
                    transactions={transactions}
                    total={total}
                    currency={currency}
                    locale={locale}
                    onEdit={(tx) => { setEditTx(tx); setFormOpen(true) }}
                    onDelete={async (tx) => {
                      if (window.confirm(t('transactions.confirmDelete'))) {
                        await deleteTransaction(tx.id)
                      }
                    }}
                  />
                ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <ExpensePieChart
            expensesByCategory={expensesByCategory}
            currency={currency}
            locale={locale}
          />
        </div>
      </div>

      <TransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTx(null) }}
        onSave={handleSave}
        editData={editTx ? {
          id: editTx.id,
          category_id: editTx.category_id,
          amount: editTx.amount,
          currency: editTx.currency,
          description: editTx.description,
          transaction_date: editTx.transaction_date,
          financial_account_id: editTx.financial_account_id,
        } : undefined}
      />
    </div>
  )
}
