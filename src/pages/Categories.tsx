import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useHousehold } from '@/stores/household-context'
import { supabase } from '@/lib/supabase'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { Plus, Eye, EyeOff, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category, CategoryType } from '@/types/database'

export function CategoriesPage() {
  const { t } = useTranslation()
  const { household, refreshCategories } = useHousehold()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [formOpen, setFormOpen] = useState(false)

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

  function renderCategoryList(cats: Category[], title: string) {
    return (
      <GlassCard>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {cats.map(cat => (
              <div key={cat.id} className={cn("flex items-center gap-3 px-4 py-3 row-hover transition-colors", cat.is_hidden && "opacity-50")}>
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

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
                    <span
                      className="flex-1 text-sm cursor-pointer hover:text-primary transition-colors"
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                    >
                      {cat.name}
                    </span>

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

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      onClick={() => handleToggleHidden(cat.id, cat.is_hidden)}
                      aria-label={cat.is_hidden ? 'Show' : 'Hide'}
                    >
                      {cat.is_hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </>
                )}
              </div>
            ))}
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

      {renderCategoryList(incomeCategories, t('dashboard.moneyIn'))}

      <Separator />

      {renderCategoryList(expenseCategories, t('dashboard.moneyOut'))}

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleAddViaDialog}
      />
    </div>
  )
}
