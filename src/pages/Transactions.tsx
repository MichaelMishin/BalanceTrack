import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Edit, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard, CardContent } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import type { Transaction, TransactionInsert } from '@/types/database'

export function TransactionsPage() {
  const { t } = useTranslation()
  const { household, categories } = useHousehold()
  const { profile } = useAuth()
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    loading,
  } = useTransactions()

  const [formOpen, setFormOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const currency = household?.default_currency ?? 'ILS'
  const locale = profile?.locale === 'he' ? 'he-IL' : 'en-US'

  const filtered = useMemo(() => {
    let result = transactions

    if (typeFilter !== 'all') {
      result = result.filter(tx => {
        const cat = categories.find(c => c.id === tx.category_id)
        return cat?.type === typeFilter
      })
    }

    if (categoryFilter !== 'all') {
      result = result.filter(tx => tx.category_id === categoryFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(tx =>
        (tx.description?.toLowerCase().includes(q)) ||
        categories.find(c => c.id === tx.category_id)?.name.toLowerCase().includes(q)
      )
    }

    return result
  }, [transactions, typeFilter, categoryFilter, search, categories])

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
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const activeCats = categories.filter(c => {
    if (typeFilter === 'all') return true
    return c.type === typeFilter
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('transactions.list')}</h1>
        <Button onClick={() => setFormOpen(true)} className="cursor-pointer rounded-xl h-9">
          <Plus className="h-4 w-4 mr-1.5" />
          {t('transactions.add')}
        </Button>
      </div>

      {/* Filters */}
      <GlassCard>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('transactions.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as typeof typeFilter); setCategoryFilter('all') }}>
              <SelectTrigger className="w-full sm:w-36 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t('transactions.all')}</SelectItem>
                <SelectItem value="income" className="cursor-pointer">{t('transactions.income')}</SelectItem>
                <SelectItem value="expense" className="cursor-pointer">{t('transactions.expense')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 cursor-pointer">
                <SelectValue placeholder={t('transactions.filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">{t('transactions.all')}</SelectItem>
                {activeCats.map(c => (
                  <SelectItem key={c.id} value={c.id} className="cursor-pointer">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </GlassCard>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t('transactions.showing', { count: filtered.length })}
      </p>

      {/* Transaction List */}
      <GlassCard className="overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">{t('transactions.noResults')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map(tx => {
                const cat = categories.find(c => c.id === tx.category_id)
                const isIncome = cat?.type === 'income'
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 px-4 py-3 row-hover transition-colors"
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isIncome ? "bg-success/10" : "bg-destructive/10"
                    )}>
                      {isIncome
                        ? <ArrowUpRight className="h-4 w-4 text-success" />
                        : <ArrowDownRight className="h-4 w-4 text-destructive" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description || t('transactions.noDescription')}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0">
                          {cat?.name ?? '—'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tx.transaction_date, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-semibold tabular-nums",
                        isIncome ? "text-success" : "text-foreground"
                      )}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.converted_amount ?? tx.amount, currency, locale)}
                      </p>
                      {tx.currency !== currency && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(tx.amount, tx.currency, locale)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => { setEditTx(tx); setFormOpen(true) }}
                        aria-label={t('common.edit')}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => setDeleteTx(tx)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </GlassCard>

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
