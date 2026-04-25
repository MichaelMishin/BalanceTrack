import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import type { Transaction, Category } from '@/types/database'
import { format } from 'date-fns'

interface TransactionWithCategory extends Transaction {
  category?: Category
}

export function useTransactions(personalOnly = false) {
  const { household, period, categories } = useHousehold()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    if (!household) return

    setLoading(true)
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('household_id', household.id)
      .gte('transaction_date', format(period.start, 'yyyy-MM-dd'))
      .lte('transaction_date', format(period.end, 'yyyy-MM-dd'))
      .order('transaction_date', { ascending: false })

    if (personalOnly && user) {
      query = query.eq('entered_by', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
      return
    }

    // Attach category info
    const withCategories = (data ?? []).map(t => ({
      ...t,
      category: categories.find(c => c.id === t.category_id),
    }))

    setTransactions(withCategories)
    setLoading(false)
  }, [household, period, categories, personalOnly, user])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('transactions').insert(tx)
    if (error) throw error
    await fetchTransactions()
  }, [fetchTransactions])

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    await fetchTransactions()
  }, [fetchTransactions])

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchTransactions()
  }, [fetchTransactions])

  // Group by category type
  const incomeTransactions = transactions.filter(t => t.category?.type === 'income')
  const expenseTransactions = transactions.filter(t => t.category?.type === 'expense')

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.converted_amount ?? t.amount), 0)
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (t.converted_amount ?? t.amount), 0)
  const netSavings = totalIncome - totalExpenses

  // Group expenses by category
  const expensesByCategory = expenseTransactions.reduce<Record<string, { category: Category; transactions: TransactionWithCategory[]; total: number }>>((acc, t) => {
    if (!t.category) return acc
    if (!acc[t.category_id]) {
      acc[t.category_id] = { category: t.category, transactions: [], total: 0 }
    }
    acc[t.category_id].transactions.push(t)
    acc[t.category_id].total += t.converted_amount ?? t.amount
    return acc
  }, {})

  return {
    transactions,
    incomeTransactions,
    expenseTransactions,
    expensesByCategory,
    totalIncome,
    totalExpenses,
    netSavings,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: fetchTransactions,
  }
}
