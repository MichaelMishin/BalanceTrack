import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/stores/household-context'
import type { ImportMappingRule as DBRule } from '@/types/database'
import type { ImportMappingRule } from '@/lib/csv-import'

function toRuntime(r: DBRule): ImportMappingRule {
  return {
    id: r.id,
    name: r.name,
    pattern: r.pattern,
    categoryId: r.category_id,
    direction: r.direction as ImportMappingRule['direction'],
    sortOrder: r.sort_order,
    isActive: r.is_active,
  }
}

export interface ImportRuleInput {
  name: string
  pattern: string
  categoryId: string | null
  direction: 'income' | 'expense' | 'auto'
  isActive?: boolean
}

export function useImportRules() {
  const { household } = useHousehold()
  const [rules, setRules] = useState<ImportMappingRule[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRules = useCallback(async () => {
    if (!household) return
    setLoading(true)
    const { data } = await supabase
      .from('import_mapping_rules')
      .select('*')
      .eq('household_id', household.id)
      .order('sort_order', { ascending: true })
    setRules((data ?? []).map(toRuntime))
    setLoading(false)
  }, [household])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  async function createRule(input: ImportRuleInput): Promise<ImportMappingRule | null> {
    if (!household) return null
    const maxOrder = rules.reduce((m, r) => Math.max(m, r.sortOrder), -1)
    const { data, error } = await supabase
      .from('import_mapping_rules')
      .insert({
        household_id: household.id,
        name: input.name,
        pattern: input.pattern,
        category_id: input.categoryId,
        direction: input.direction,
        is_active: input.isActive ?? true,
        sort_order: maxOrder + 1,
      })
      .select()
      .single()
    if (error || !data) return null
    const rule = toRuntime(data)
    setRules(prev => [...prev, rule])
    return rule
  }

  async function updateRule(id: string, patch: Partial<ImportRuleInput & { sortOrder: number }>) {
    type RuleUpdate = import('@/types/database').ImportMappingRuleUpdate
    const dbPatch: RuleUpdate = {}
    if (patch.name !== undefined) dbPatch.name = patch.name
    if (patch.pattern !== undefined) dbPatch.pattern = patch.pattern
    if ('categoryId' in patch) dbPatch.category_id = patch.categoryId
    if (patch.direction !== undefined) dbPatch.direction = patch.direction
    if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive
    if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder

    await supabase.from('import_mapping_rules').update(dbPatch).eq('id', id)
    await fetchRules()
  }

  async function deleteRule(id: string) {
    await supabase.from('import_mapping_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  async function reorderRules(orderedIds: string[]) {
    const updates = orderedIds.map((id, i) =>
      supabase.from('import_mapping_rules').update({ sort_order: i }).eq('id', id)
    )
    await Promise.all(updates)
    await fetchRules()
  }

  return { rules, loading, fetchRules, createRule, updateRule, deleteRule, reorderRules }
}
