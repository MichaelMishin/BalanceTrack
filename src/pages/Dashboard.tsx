import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { useTransactions } from '@/hooks/use-transactions'
import { useSavings } from '@/hooks/use-savings'
import { useInsights } from '@/hooks/use-insights'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart'
import { SavingsGauge } from '@/components/charts/SavingsGauge'
import { CategoryDetail } from '@/components/transactions/CategoryDetail'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import type { Transaction, TransactionInsert } from '@/types/database'

export function Dashboard() {
  const { t } = useTranslation()
  const { household, categories } = useHousehold()
  const { profile } = useAuth()
  const {
    incomeTransactions,
    expensesByCategory,
    totalIncome,
    totalExpenses,
    netSavings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loading,
  } = useTransactions()
  const { cumulativeSavings } = useSavings()
  const { insights } = useInsights()

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

  function handleEdit(tx: Transaction) {
    setEditTx(tx)
    setFormOpen(true)
  }

  async function handleDelete(tx: Transaction) {
    if (window.confirm(t('transactions.confirmDelete'))) {
      await deleteTransaction(tx.id)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t('common.loading')}</div>
  }

  // Group income transactions
  const paycheckCategory = categories.find(c => c.name_key === 'paycheck' || c.name === 'Paycheck')
  const paycheckTxs = incomeTransactions.filter(t => t.category_id === paycheckCategory?.id)
  const additionalIncomeTxs = incomeTransactions.filter(t => t.category_id !== paycheckCategory?.id)
  const paycheckTotal = paycheckTxs.reduce((s, t) => s + (t.converted_amount ?? t.amount), 0)
  const additionalTotal = additionalIncomeTxs.reduce((s, t) => s + (t.converted_amount ?? t.amount), 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.netThisPeriod')}
            </CardTitle>
            {netSavings >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netSavings, currency, locale)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.cumulativeSavings')}
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(cumulativeSavings, currency, locale)}
            </p>
          </CardContent>
        </Card>

        <SavingsGauge
          income={totalIncome}
          expenses={totalExpenses}
          savingsTargetPct={profile?.savings_target_pct ?? 20}
        />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map(insight => (
            <div
              key={insight.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                insight.type === 'warning'
                  ? 'border-destructive/50 bg-destructive/10 text-destructive'
                  : insight.type === 'success'
                    ? 'border-success/50 bg-success/10 text-success'
                    : 'border-primary/50 bg-primary/10 text-primary'
              }`}
            >
              {insight.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Money In + Money Out */}
        <div className="lg:col-span-2 space-y-6">
          {/* Money In */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-success">{t('dashboard.moneyIn')}</CardTitle>
              <Button
                size="sm"
                onClick={() => setFormOpen(true)}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('transactions.add')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('dashboard.paycheck')}</span>
                    {paycheckTxs.some(t => t.source === 'estimated') && (
                      <Badge variant="outline" className="text-warning border-warning">
                        {t('dashboard.estimated')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-success">
                    {formatCurrency(paycheckTotal, currency, locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium">{t('dashboard.additionalIncome')}</span>
                  <span className="text-sm font-semibold text-success">
                    {formatCurrency(additionalTotal, currency, locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                  <span className="text-sm font-bold">{t('dashboard.total')}</span>
                  <span className="text-sm font-bold text-success">
                    {formatCurrency(totalIncome, currency, locale)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Money Out */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-destructive">{t('dashboard.moneyOut')}</CardTitle>
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
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
                <span className="text-sm font-bold">{t('dashboard.total')}</span>
                <span className="text-sm font-bold text-destructive">
                  {formatCurrency(totalExpenses, currency, locale)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Chart */}
        <div>
          <ExpensePieChart
            expensesByCategory={expensesByCategory}
            currency={currency}
            locale={locale}
          />
        </div>
      </div>

      {/* Transaction Form Dialog */}
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
