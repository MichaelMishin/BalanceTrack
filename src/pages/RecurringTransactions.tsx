import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pause, Play, Trash2, Edit, RefreshCw, CalendarClock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RecurringTransactionForm } from '@/components/transactions/RecurringTransactionForm'
import type { RecurringTransaction } from '@/types/database'
import { useAuth } from '@/stores/auth-context'

export function RecurringTransactionsPage() {
  const { t } = useTranslation()
  const { household } = useHousehold()
  const { profile } = useAuth()
  const {
    recurring,
    loading,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    toggleActive,
    generateDueTransactions,
  } = useRecurringTransactions()

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [generatedCount, setGeneratedCount] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)

  const currency = household?.default_currency ?? 'ILS'
  const locale = profile?.locale === 'he' ? 'he-IL' : 'en-US'

  // Auto-generate due transactions on mount
  useEffect(() => {
    if (!loading && recurring.length > 0) {
      handleGenerate()
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setGenerating(true)
    try {
      const count = await generateDueTransactions()
      if (count && count > 0) {
        setGeneratedCount(count)
        setTimeout(() => setGeneratedCount(null), 3000)
      }
    } catch (err) {
      console.error('Failed to generate recurring transactions:', err)
    }
    setGenerating(false)
  }

  async function handleSave(item: Parameters<typeof addRecurring>[0]) {
    if (editItem) {
      await updateRecurring(editItem.id, item)
    } else {
      await addRecurring(item)
    }
    setEditItem(null)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const activeItems = recurring.filter(r => r.is_active)
  const pausedItems = recurring.filter(r => !r.is_active)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('recurring.title')}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="cursor-pointer rounded-xl h-9"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", generating && "animate-spin")} />
            {t('recurring.generate')}
          </Button>
          <Button onClick={() => setFormOpen(true)} className="cursor-pointer rounded-xl h-9">
            <Plus className="h-4 w-4 mr-1.5" />
            {t('recurring.add')}
          </Button>
        </div>
      </div>

      {generatedCount !== null && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success animate-fade-in">
          <RefreshCw className="h-4 w-4" />
          {t('recurring.generated', { count: generatedCount })}
        </div>
      )}

      {recurring.length === 0 ? (
        <GlassCard>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
              <CalendarClock className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t('recurring.empty')}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t('recurring.emptyHint')}</p>
          </CardContent>
        </GlassCard>
      ) : (
        <>
          {/* Active recurring */}
          {activeItems.length > 0 && (
            <GlassCard className="overflow-hidden">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base font-semibold">{t('recurring.active')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {activeItems.map(item => (
                    <RecurringItem
                      key={item.id}
                      item={item}
                      currency={currency}
                      locale={locale}
                      onEdit={() => { setEditItem(item); setFormOpen(true) }}
                      onDelete={() => setDeleteId(item.id)}
                      onToggle={() => toggleActive(item.id, item.is_active)}
                    />
                  ))}
                </div>
              </CardContent>
            </GlassCard>
          )}

          {/* Paused recurring */}
          {pausedItems.length > 0 && (
            <GlassCard className="overflow-hidden opacity-70">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base font-semibold">{t('recurring.paused')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {pausedItems.map(item => (
                    <RecurringItem
                      key={item.id}
                      item={item}
                      currency={currency}
                      locale={locale}
                      onEdit={() => { setEditItem(item); setFormOpen(true) }}
                      onDelete={() => setDeleteId(item.id)}
                      onToggle={() => toggleActive(item.id, item.is_active)}
                    />
                  ))}
                </div>
              </CardContent>
            </GlassCard>
          )}
        </>
      )}

      <RecurringTransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        onSave={handleSave}
        editData={editItem}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title={t('recurring.confirmDelete')}
        description={t('recurring.confirmDelete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) {
            await deleteRecurring(deleteId)
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}

function RecurringItem({
  item,
  currency,
  locale,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: RecurringTransaction & { category?: { name: string; type: string } }
  currency: string
  locale: string
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const isIncome = item.category?.type === 'income'

  return (
    <div className="flex items-center gap-4 px-4 py-3 row-hover transition-colors">
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
          {item.description || item.category?.name || '—'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0">
            {item.category?.name ?? '—'}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal px-1.5 py-0">
            {t(`settings.${item.frequency === 'biweekly' ? 'biweekly' : item.frequency}`)}
          </Badge>
          {item.is_estimated && (
            <Badge variant="outline" className="text-xs text-warning border-warning/50 px-1.5 py-0">
              {t('dashboard.estimated')}
            </Badge>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={cn(
          "text-sm font-semibold tabular-nums",
          isIncome ? "text-success" : "text-foreground"
        )}>
          {formatCurrency(item.amount, currency, locale)}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('recurring.nextDate')}: {formatDate(item.next_due_date, locale)}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          onClick={onToggle}
          aria-label={item.is_active ? 'Pause' : 'Resume'}
        >
          {item.is_active
            ? <Pause className="h-3.5 w-3.5" />
            : <Play className="h-3.5 w-3.5" />
          }
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          onClick={onEdit}
          aria-label={t('common.edit')}
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
          onClick={onDelete}
          aria-label={t('common.delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
