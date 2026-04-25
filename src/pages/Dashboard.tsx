import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
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
    return <DashboardSkeleton />
  }

  // Group income transactions
  const paycheckCategory = categories.find(c => c.name_key === 'paycheck' || c.name === 'Paycheck')
  const paycheckTxs = incomeTransactions.filter(t => t.category_id === paycheckCategory?.id)
  const additionalIncomeTxs = incomeTransactions.filter(t => t.category_id !== paycheckCategory?.id)
  const paycheckTotal = paycheckTxs.reduce((s, t) => s + (t.converted_amount ?? t.amount), 0)
  const additionalTotal = additionalIncomeTxs.reduce((s, t) => s + (t.converted_amount ?? t.amount), 0)

  const hasExpenses = Object.keys(expensesByCategory).length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {/* Net This Period */}
        <Card className="card-hover overflow-hidden relative">
          <div className={`absolute inset-0 opacity-5 ${netSavings >= 0 ? 'bg-gradient-to-br from-success to-transparent' : 'bg-gradient-to-br from-destructive to-transparent'}`} />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.netThisPeriod')}
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${netSavings >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {netSavings >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              )}
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className={`text-2xl font-bold tracking-tight ${netSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netSavings, currency, locale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalIncome, currency, locale)} in &middot; {formatCurrency(totalExpenses, currency, locale)} out
            </p>
          </CardContent>
        </Card>

        {/* Cumulative Savings */}
        <Card className="card-hover overflow-hidden relative">
          <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-primary to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.cumulativeSavings')}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(cumulativeSavings, currency, locale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('period.totalSavings')}
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
        <div className="space-y-2 animate-fade-in">
          {insights.map(insight => (
            <div
              key={insight.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                insight.type === 'warning'
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : insight.type === 'success'
                    ? 'border-success/30 bg-success/5 text-success'
                    : 'border-primary/30 bg-primary/5 text-primary'
              }`}
            >
              <Zap className="h-4 w-4 shrink-0" />
              {insight.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Money In + Money Out */}
        <div className="lg:col-span-2 space-y-6">
          {/* Money In */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-success/5 border-b border-success/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
                <CardTitle className="text-base font-semibold">{t('dashboard.moneyIn')}</CardTitle>
              </div>
              <Button
                size="sm"
                onClick={() => setFormOpen(true)}
                className="cursor-pointer rounded-xl h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('transactions.add')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('dashboard.paycheck')}</span>
                    {paycheckTxs.some(t => t.source === 'estimated') && (
                      <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                        {t('dashboard.estimated')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-success tabular-nums">
                    {formatCurrency(paycheckTotal, currency, locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-medium">{t('dashboard.additionalIncome')}</span>
                  <span className="text-sm font-semibold text-success tabular-nums">
                    {formatCurrency(additionalTotal, currency, locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                  <span className="text-sm font-bold">{t('dashboard.total')}</span>
                  <span className="text-sm font-bold text-success tabular-nums">
                    {formatCurrency(totalIncome, currency, locale)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Money Out */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                </div>
                <CardTitle className="text-base font-semibold">{t('dashboard.moneyOut')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {hasExpenses ? (
                <>
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
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/50">
                    <span className="text-sm font-bold">{t('dashboard.total')}</span>
                    <span className="text-sm font-bold text-destructive tabular-nums">
                      {formatCurrency(totalExpenses, currency, locale)}
                    </span>
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
        <Wallet className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {t('dashboard.noTransactions')}
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Add your first transaction to get started
      </p>
    </div>
  )
}
