import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import type { RecurringTransaction, Category } from '@/types/database'
import { format, addWeeks, addMonths, isBefore, startOfDay } from 'date-fns'

interface RecurringWithCategory extends RecurringTransaction {
  category?: Category
}

export function useRecurringTransactions() {
  const { household, categories } = useHousehold()
  const { user } = useAuth()
  const [recurring, setRecurring] = useState<RecurringWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecurring = useCallback(async () => {
    if (!household) return
    setLoading(true)

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('household_id', household.id)
      .order('next_due_date', { ascending: true })

    if (error) {
      console.error('Error fetching recurring transactions:', error)
      setLoading(false)
      return
    }

    const withCategories = (data ?? []).map(r => ({
      ...r,
      category: categories.find(c => c.id === r.category_id),
    }))

    setRecurring(withCategories)
    setLoading(false)
  }, [household, categories])

  useEffect(() => {
    fetchRecurring()
  }, [fetchRecurring])

  const addRecurring = useCallback(async (item: {
    category_id: string
    amount: number
    currency: string
    description: string | null
    financial_account_id: string | null
    frequency: 'weekly' | 'biweekly' | 'monthly'
    next_due_date: string
    is_estimated: boolean
  }) => {
    if (!household) throw new Error('No household')

    const { error } = await supabase.from('recurring_transactions').insert({
      household_id: household.id,
      ...item,
    })
    if (error) throw error
    await fetchRecurring()
  }, [household, fetchRecurring])

  const updateRecurring = useCallback(async (id: string, updates: Partial<RecurringTransaction>) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    await fetchRecurring()
  }, [fetchRecurring])

  const deleteRecurring = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchRecurring()
  }, [fetchRecurring])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await updateRecurring(id, { is_active: !isActive })
  }, [updateRecurring])

  // Auto-generate overdue transactions
  const generateDueTransactions = useCallback(async () => {
    if (!household || !user) return

    const today = startOfDay(new Date())
    const dueItems = recurring.filter(
      r => r.is_active && isBefore(new Date(r.next_due_date), today)
    )

    for (const item of dueItems) {
      let dueDate = new Date(item.next_due_date)

      // Generate all overdue instances
      while (isBefore(dueDate, today)) {
        // Create the transaction
        await supabase.from('transactions').insert({
          household_id: household.id,
          category_id: item.category_id,
          financial_account_id: item.financial_account_id,
          entered_by: user.id,
          amount: item.amount,
          currency: item.currency,
          converted_amount: item.amount,
          exchange_rate: 1,
          description: item.description,
          transaction_date: format(dueDate, 'yyyy-MM-dd'),
          is_manual: false,
          is_recurring: true,
          source: item.is_estimated ? 'estimated' : 'manual',
        })

        // Advance to next due date
        switch (item.frequency) {
          case 'weekly':
            dueDate = addWeeks(dueDate, 1)
            break
          case 'biweekly':
            dueDate = addWeeks(dueDate, 2)
            break
          case 'monthly':
            dueDate = addMonths(dueDate, 1)
            break
        }
      }

      // Update the next_due_date
      await supabase
        .from('recurring_transactions')
        .update({ next_due_date: format(dueDate, 'yyyy-MM-dd') })
        .eq('id', item.id)
    }

    if (dueItems.length > 0) {
      await fetchRecurring()
    }

    return dueItems.length
  }, [household, user, recurring, fetchRecurring])

  return {
    recurring,
    loading,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    toggleActive,
    generateDueTransactions,
    refresh: fetchRecurring,
  }
}
