import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { StatCard } from '@/components/ui/stat-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart'
import { CategoryDetail } from '@/components/transactions/CategoryDetail'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Skeleton } from '@/components/ui/skeleton'
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
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)

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
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
              <CardContent><Skeleton className="h-7 w-28" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.personal')}</h1>
        <Button onClick={() => setFormOpen(true)} className="cursor-pointer rounded-xl h-9">
          <Plus className="h-4 w-4 mr-1.5" />
          {t('transactions.add')}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3 stagger-children">
        <StatCard
          title={t('dashboard.moneyIn')}
          value={formatCurrency(totalIncome, currency, locale)}
          icon={TrendingUp}
          colorScheme="success"
        />
        <StatCard
          title={t('dashboard.moneyOut')}
          value={formatCurrency(totalExpenses, currency, locale)}
          icon={TrendingDown}
          colorScheme="destructive"
        />
        <StatCard
          title={t('dashboard.netThisPeriod')}
          value={formatCurrency(netSavings, currency, locale)}
          icon={netSavings >= 0 ? ArrowUpRight : ArrowDownRight}
          colorScheme={netSavings >= 0 ? 'success' : 'destructive'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard className="overflow-hidden">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">{t('dashboard.moneyOut')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.keys(expensesByCategory).length > 0 ? (
                Object.values(expensesByCategory)
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
                      onDelete={(tx) => setDeleteTx(tx)}
                    />
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                    <Wallet className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.noTransactions')}</p>
                </div>
              )}
            </CardContent>
          </GlassCard>
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
    </div>
  )
}
