import { useMemo } from 'react'
import { useTransactions } from './use-transactions'
import { useAuth } from '@/stores/auth-context'
import { useTranslation } from 'react-i18next'

interface Insight {
  id: string
  type: 'warning' | 'success' | 'info'
  message: string
}

export function useInsights() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { totalIncome, totalExpenses, expensesByCategory, netSavings } = useTransactions()

  const savingsTarget = profile?.savings_target_pct ?? 20

  const insights = useMemo<Insight[]>(() => {
    const results: Insight[] = []

    // Check if overspending
    if (totalIncome > 0 && totalExpenses > totalIncome) {
      results.push({
        id: 'overspending',
        type: 'warning',
        message: t('insights.overspending'),
      })
    }

    // Check if on track for savings
    if (totalIncome > 0 && netSavings >= (totalIncome * savingsTarget / 100)) {
      results.push({
        id: 'on-track',
        type: 'success',
        message: t('insights.onTrack'),
      })
    }

    // Top spending categories
    const sorted = Object.values(expensesByCategory)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)

    if (sorted.length > 0) {
      const names = sorted.map(s => s.category.name).join(', ')
      results.push({
        id: 'top-spending',
        type: 'info',
        message: t('insights.topSpending', { categories: names }),
      })
    }

    return results
  }, [totalIncome, totalExpenses, netSavings, expensesByCategory, savingsTarget, t])

  return { insights }
}
