import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Zap, Download, Users, User } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { useTransactions } from '@/hooks/use-transactions'
import { useSavings } from '@/hooks/use-savings'
import { useInsights } from '@/hooks/use-insights'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { StatCard } from '@/components/ui/stat-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart'
import { SavingsGauge } from '@/components/charts/SavingsGauge'
import { CategoryDetail } from '@/components/transactions/CategoryDetail'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { ExportDialog } from '@/components/import-export/ExportDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Transaction, TransactionInsert } from '@/types/database'

export function Dashboard() {
  const { t } = useTranslation()
  const { household, categories } = useHousehold()
  const { profile } = useAuth()

  const [view, setView] = useState<'household' | 'personal'>('household')

  const householdData = useTransactions(false)
  const personalData = useTransactions(true)

  const data = view === 'household' ? householdData : personalData
  const {
    transactions,
    incomeTransactions,
    expensesByCategory,
    totalIncome,
    totalExpenses,
    netSavings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loading,
  } = data

  const { cumulativeSavings } = useSavings()
  const { insights } = useInsights()

  const [formOpen, setFormOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

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

  function handleDelete(tx: Transaction) {
    setDeleteTx(tx)
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  // Group income transactions (household view only)
  const paycheckCategory = categories.find(c => c.name_key === 'paycheck' || c.name === 'Paycheck')
  const paycheckTxs = incomeTransactions.filter(t => t.category_id === paycheckCategory?.id)
  const additionalIncomeTxs = incomeTransactions.filter(t => t.category_id !== paycheckCategory?.id)
  const paycheckTotal = paycheckTxs.reduce((s, t) => s + (t.converted_amount ?? t.amount), 0)
  const additionalTotal = additionalIncomeTxs.reduce((s, t) => s + (t.converted_amount ?? t.amount), 0)

  const hasExpenses = Object.keys(expensesByCategory).length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-2 rounded-xl border border-border/50 p-1 bg-muted/30">
          <button
            onClick={() => setView('household')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer',
              view === 'household'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {t('dashboard.household')}
          </button>
          <button
            onClick={() => setView('personal')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer',
              view === 'personal'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="h-3.5 w-3.5" />
            {t('dashboard.mine')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        <StatCard
          title={t('dashboard.netThisPeriod')}
          value={formatCurrency(netSavings, currency, locale)}
          icon={netSavings >= 0 ? ArrowUpRight : ArrowDownRight}
          colorScheme={netSavings >= 0 ? 'success' : 'destructive'}
          subtitle={`${formatCurrency(totalIncome, currency, locale)} in · ${formatCurrency(totalExpenses, currency, locale)} out`}
        />

        <StatCard
          title={t('dashboard.cumulativeSavings')}
          value={formatCurrency(cumulativeSavings, currency, locale)}
          icon={Wallet}
          colorScheme="primary"
          subtitle={t('period.totalSavings')}
        />

        <SavingsGauge
          income={totalIncome}
          expenses={totalExpenses}
          savingsTargetPct={profile?.savings_target_pct ?? 20}
        />
      </div>

      {/* Insights (household view only) */}
      {view === 'household' && insights.length > 0 && (
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
          <GlassCard className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-success/5 border-b border-success/10">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
                <CardTitle className="text-base font-semibold">{t('dashboard.moneyIn')}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExportOpen(true)}
                  className="cursor-pointer rounded-xl h-8 text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {t('export.title')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setFormOpen(true)}
                  className="cursor-pointer rounded-xl h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t('transactions.add')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {view === 'household' ? (
                <div className="divide-y divide-border/50">
                  <div className="flex items-center justify-between px-4 py-3 row-hover transition-colors">
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
                  <div className="flex items-center justify-between px-4 py-3 row-hover transition-colors">
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
              ) : (
                <div className="divide-y divide-border/50">
                  {incomeTransactions.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                      {t('dashboard.noTransactions')}
                    </div>
                  ) : (
                    incomeTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-3 row-hover transition-colors">
                        <div>
                          <p className="text-sm font-medium">{tx.description ?? categories.find(c => c.id === tx.category_id)?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{tx.transaction_date}</p>
                        </div>
                        <span className="text-sm font-semibold text-success tabular-nums">
                          {formatCurrency(tx.converted_amount ?? tx.amount, currency, locale)}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                    <span className="text-sm font-bold">{t('dashboard.total')}</span>
                    <span className="text-sm font-bold text-success tabular-nums">
                      {formatCurrency(totalIncome, currency, locale)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </GlassCard>

          {/* Money Out */}
          <GlassCard className="overflow-hidden">
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
          </GlassCard>
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

      <ConfirmDialog
        open={!!deleteTx}
        onOpenChange={(open) => { if (!open) setDeleteTx(null) }}
        title={t('transactions.confirmDelete')}
        description={t('transactions.confirmDelete')}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (deleteTx) {
            await deleteTransaction(deleteTx.id)
            setDeleteTx(null)
          }
        }}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        transactions={transactions}
        categories={categories}
        periodLabel={household ? `${household.name}-period` : 'period'}
        totals={{ income: totalIncome, expenses: totalExpenses, net: netSavings }}
        currency={currency}
        locale={locale}
      />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-48 rounded-xl" />
      </div>
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
