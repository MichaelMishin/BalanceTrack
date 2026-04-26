import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'balancetrack-budget-limits'

type BudgetLimits = Record<string, number>

export function useBudgetLimits() {
  const [limits, setLimits] = useState<BudgetLimits>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limits))
    } catch {
      // localStorage unavailable
    }
  }, [limits])

  const setLimit = useCallback((categoryId: string, amount: number) => {
    setLimits(prev => ({ ...prev, [categoryId]: amount }))
  }, [])

  const removeLimit = useCallback((categoryId: string) => {
    setLimits(prev => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
  }, [])

  const getLimit = useCallback((categoryId: string): number | null => {
    return limits[categoryId] ?? null
  }, [limits])

  const checkBudget = useCallback((categoryId: string, spent: number): {
    limit: number
    spent: number
    remaining: number
    percentage: number
    status: 'ok' | 'warning' | 'exceeded'
  } | null => {
    const limit = limits[categoryId]
    if (limit == null) return null

    const remaining = limit - spent
    const percentage = limit > 0 ? (spent / limit) * 100 : 0

    return {
      limit,
      spent,
      remaining,
      percentage,
      status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok',
    }
  }, [limits])

  return { limits, setLimit, removeLimit, getLimit, checkBudget }
}
