import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useBudgetLimits } from '@/hooks/use-budget-limits'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { IconPicker, CategoryIcon } from '@/components/categories/IconPicker'
import { Plus, Eye, EyeOff, GripVertical, ChevronUp, ChevronDown, Palette, DollarSign, Trash2, AlertCircle, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import type { Category, CategoryType } from '@/types/database'

export function CategoriesPage() {
  const { t } = useTranslation()
  const { household, refreshCategories } = useHousehold()
  const { profile } = useAuth()
  const { setLimit, removeLimit, getLimit } = useBudgetLimits()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconPickerCatId, setIconPickerCatId] = useState<string | null>(null)
  const [budgetEditId, setBudgetEditId] = useState<string | null>(null)
  const [budgetValue, setBudgetValue] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const currency = household?.default_currency ?? 'ILS'
  const locale = profile?.locale === 'he' ? 'he-IL' : 'en-US'

  // Fetch ALL categories including hidden ones for management
  const fetchAllCategories = useCallback(async () => {
    if (!household) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .order('sort_order')
    setAllCategories(data ?? [])
  }, [household])

  useEffect(() => {
    fetchAllCategories()
  }, [fetchAllCategories])

  const incomeCategories = allCategories.filter(c => c.type === 'income')
  const expenseCategories = allCategories.filter(c => c.type === 'expense')

  async function handleAddViaDialog(name: string, type: CategoryType) {
    if (!household) return
    const maxOrder = allCategories.reduce((max, c) => Math.max(max, c.sort_order), 0)
    await supabase.from('categories').insert({
      household_id: household.id,
      name,
      type,
      sort_order: maxOrder + 1,
      is_system: false,
    })
    refreshCategories()
    fetchAllCategories()
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    await supabase.from('categories').update({ name: editName.trim() }).eq('id', id)
    setEditingId(null)
    refreshCategories()
    fetchAllCategories()
  }

  async function handleToggleHidden(id: string, currentlyHidden: boolean) {
    await supabase.from('categories').update({ is_hidden: !currentlyHidden }).eq('id', id)
    refreshCategories()
    fetchAllCategories()
  }

  async function handleDeleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      setDeleteError(t('categories.deleteError', 'Cannot delete: this category is used by existing transactions.'))
      return
    }
    setDeleteError(null)
    refreshCategories()
    fetchAllCategories()
  }

  async function handleIconSelect(icon: string) {
    if (!iconPickerCatId) return
    await supabase.from('categories').update({ icon }).eq('id', iconPickerCatId)
    setIconPickerCatId(null)
    refreshCategories()
    fetchAllCategories()
  }

  function handleBudgetSave(catId: string) {
    const val = parseFloat(budgetValue)
    if (isNaN(val) || val <= 0) {
      removeLimit(catId)
    } else {
      setLimit(catId, val)
    }
    setBudgetEditId(null)
    setBudgetValue('')
  }

  // Drag-and-drop reordering
  async function handleMoveCategory(catId: string, direction: 'up' | 'down', cats: Category[]) {
    const idx = cats.findIndex(c => c.id === catId)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === cats.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const catA = cats[idx]
    const catB = cats[swapIdx]

    // Swap sort_order values
    await Promise.all([
      supabase.from('categories').update({ sort_order: catB.sort_order }).eq('id', catA.id),
      supabase.from('categories').update({ sort_order: catA.sort_order }).eq('id', catB.id),
    ])

    refreshCategories()
    fetchAllCategories()
  }

  // HTML5 DnD handlers
  function handleDragStart(catId: string) {
    setDragId(catId)
  }

  async function handleDrop(targetId: string, cats: Category[]) {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      return
    }

    const sourceIdx = cats.findIndex(c => c.id === dragId)
    const targetIdx = cats.findIndex(c => c.id === targetId)
    if (sourceIdx === -1 || targetIdx === -1) {
      setDragId(null)
      return
    }

    // Reorder: remove source and insert at target position
    const reordered = [...cats]
    const [moved] = reordered.splice(sourceIdx, 1)
    reordered.splice(targetIdx, 0, moved)

    // Update sort_order for all affected
    const updates = reordered.map((cat, i) =>
      supabase.from('categories').update({ sort_order: i }).eq('id', cat.id)
    )
    await Promise.all(updates)

    setDragId(null)
    refreshCategories()
    fetchAllCategories()
  }

  function renderCategoryList(cats: Category[], title: string) {
    return (
      <GlassCard>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {cats.map((cat, idx) => {
              const budgetLimit = getLimit(cat.id)
              return (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(cat.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(cat.id, cats)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 row-hover transition-colors",
                    cat.is_hidden && "opacity-50",
                    dragId === cat.id && "opacity-30"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />

                  {/* Icon */}
                  <button
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => { setIconPickerCatId(cat.id); setIconPickerOpen(true) }}
                    title={t('categories.pickIcon')}
                  >
                    {cat.icon ? (
                      <CategoryIcon name={cat.icon} className="h-4 w-4" />
                    ) : (
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {editingId === cat.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleRename(cat.id)}
                      />
                      <Button size="sm" onClick={() => handleRename(cat.id)} className="cursor-pointer">
                        {t('common.save')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="cursor-pointer">
                        {t('common.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                        >
                          {cat.name}
                        </span>
                        {/* Budget limit display */}
                        {cat.type === 'expense' && budgetEditId === cat.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={budgetValue}
                              onChange={e => setBudgetValue(e.target.value)}
                              className="h-6 text-xs w-24"
                              autoFocus
                              placeholder="0"
                              onKeyDown={e => e.key === 'Enter' && handleBudgetSave(cat.id)}
                            />
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 cursor-pointer" onClick={() => handleBudgetSave(cat.id)}>
                              {t('common.save')}
                            </Button>
                          </div>
                        ) : cat.type === 'expense' ? (
                          <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer mt-0.5 transition-colors"
                            onClick={() => {
                              setBudgetEditId(cat.id)
                              setBudgetValue(budgetLimit?.toString() ?? '')
                            }}
                          >
                            <DollarSign className="h-3 w-3" />
                            {budgetLimit
                              ? t('categories.budgetLimit') + ': ' + formatCurrency(budgetLimit, currency, locale)
                              : t('categories.setBudget')
                            }
                          </button>
                        ) : null}
                      </div>

                      {cat.is_hidden && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t('categories.hidden', 'Hidden')}
                        </Badge>
                      )}

                      {cat.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          {t('categories.system')}
                        </Badge>
                      )}

                      {/* Move up/down */}
                      <div className="flex flex-col shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 cursor-pointer"
                          onClick={() => handleMoveCategory(cat.id, 'up', cats)}
                          disabled={idx === 0}
                          aria-label="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 cursor-pointer"
                          onClick={() => handleMoveCategory(cat.id, 'down', cats)}
                          disabled={idx === cats.length - 1}
                          aria-label="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer"
                        onClick={() => handleToggleHidden(cat.id, cat.is_hidden)}
                        aria-label={cat.is_hidden ? 'Show' : 'Hide'}
                      >
                        {cat.is_hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>

                      {!cat.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                          onClick={() => setDeleteId(cat.id)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </GlassCard>
    )
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('categories.title')}</h1>
        <Button onClick={() => setFormOpen(true)} className="cursor-pointer rounded-xl h-9">
          <Plus className="h-4 w-4 mr-1.5" />
          {t('categories.addCategory')}
        </Button>
      </div>

      {deleteError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="shrink-0 cursor-pointer opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {renderCategoryList(incomeCategories, t('dashboard.moneyIn'))}

      <Separator />

      {renderCategoryList(expenseCategories, t('dashboard.moneyOut'))}

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleAddViaDialog}
      />

      <IconPicker
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        currentIcon={allCategories.find(c => c.id === iconPickerCatId)?.icon ?? null}
        onSelect={handleIconSelect}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title={t('categories.deleteCategory')}
        description={t('categories.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) {
            await handleDeleteCategory(deleteId)
          }
        }}
      />
    </div>
  )
}
