import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHousehold } from '@/stores/household-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Plus, Eye, EyeOff, GripVertical } from 'lucide-react'
import type { CategoryType } from '@/types/database'

export function CategoriesPage() {
  const { t } = useTranslation()
  const { household, categories, refreshCategories } = useHousehold()

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CategoryType>('expense')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  async function handleAdd() {
    if (!household || !newName.trim()) return
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0)
    await supabase.from('categories').insert({
      household_id: household.id,
      name: newName.trim(),
      type: newType,
      sort_order: maxOrder + 1,
      is_system: false,
    })
    setNewName('')
    refreshCategories()
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    await supabase.from('categories').update({ name: editName.trim() }).eq('id', id)
    setEditingId(null)
    refreshCategories()
  }

  async function handleToggleHidden(id: string, currentlyHidden: boolean) {
    await supabase.from('categories').update({ is_hidden: !currentlyHidden }).eq('id', id)
    refreshCategories()
  }

  function renderCategoryList(cats: typeof categories, title: string) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {cats.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
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
      </Card>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t('categories.title')}</h1>

      {/* Add new category */}
      <Card>
        <CardHeader>
          <CardTitle>{t('categories.addCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder={t('categories.name')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1"
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as CategoryType)}>
              <SelectTrigger className="w-32 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income" className="cursor-pointer">{t('transactions.income')}</SelectItem>
                <SelectItem value="expense" className="cursor-pointer">{t('transactions.expense')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!newName.trim()} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {renderCategoryList(incomeCategories, t('dashboard.moneyIn'))}

      <Separator />

      {renderCategoryList(expenseCategories, t('dashboard.moneyOut'))}
    </div>
  )
}
