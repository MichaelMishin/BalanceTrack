import { useMemo } from 'react'
import { useTransactions } from './use-transactions'
import { useAuth } from '@/stores/auth-context'
import { useHousehold } from '@/stores/household-context'
import { useSavings } from './use-savings'
import { useBudgetLimits } from './use-budget-limits'
import { useTranslation } from 'react-i18next'

interface Insight {
  id: string
  type: 'warning' | 'success' | 'info'
  message: string
}

export function useInsights() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { categories } = useHousehold()
  const { totalIncome, totalExpenses, expensesByCategory, netSavings } = useTransactions()
  const { snapshots } = useSavings()
  const { checkBudget } = useBudgetLimits()

  const savingsTarget = profile?.savings_target_pct ?? 20

  // Paycheck estimation from historical data
  const estimatedPaycheck = useMemo(() => {
    if (snapshots.length < 2) return null
    const recentSnapshots = snapshots.slice(-6)
    const avgIncome = recentSnapshots.reduce((sum, s) => sum + s.total_income, 0) / recentSnapshots.length
    return Math.round(avgIncome * 100) / 100
  }, [snapshots])

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

    // Budget limit alerts
    const budgetAlerts: string[] = []
    Object.entries(expensesByCategory).forEach(([catId, { category, total }]) => {
      const budget = checkBudget(catId, total)
      if (budget?.status === 'exceeded') {
        budgetAlerts.push(category.name)
      }
    })
    if (budgetAlerts.length > 0) {
      results.push({
        id: 'budget-exceeded',
        type: 'warning',
        message: t('insights.budgetExceeded', { categories: budgetAlerts.join(', ') }),
      })
    }

    // Budget warning alerts (approaching limit)
    const budgetWarnings: string[] = []
    Object.entries(expensesByCategory).forEach(([catId, { category, total }]) => {
      const budget = checkBudget(catId, total)
      if (budget?.status === 'warning') {
        budgetWarnings.push(`${category.name} (${Math.round(budget.percentage)}%)`)
      }
    })
    if (budgetWarnings.length > 0) {
      results.push({
        id: 'budget-warning',
        type: 'info',
        message: t('insights.budgetWarning', { categories: budgetWarnings.join(', ') }),
      })
    }

    // Historical comparison — compare current period vs previous period averages
    if (snapshots.length >= 2 && totalExpenses > 0) {
      const prevSnapshots = snapshots.slice(-6, -1)
      if (prevSnapshots.length > 0) {
        const avgExpenses = prevSnapshots.reduce((s, p) => s + p.total_expenses, 0) / prevSnapshots.length
        if (avgExpenses > 0) {
          const changePercent = ((totalExpenses - avgExpenses) / avgExpenses) * 100
          if (changePercent > 20) {
            results.push({
              id: 'spending-spike',
              type: 'warning',
              message: t('insights.spendingSpike', { percent: Math.round(changePercent) }),
            })
          } else if (changePercent < -15) {
            results.push({
              id: 'spending-down',
              type: 'success',
              message: t('insights.spendingDown', { percent: Math.round(Math.abs(changePercent)) }),
            })
          }
        }
      }
    }

    // Trend analysis — savings trend over recent periods
    if (snapshots.length >= 3) {
      const recent = snapshots.slice(-3)
      const improving = recent.every((s, i) =>
        i === 0 || s.net_savings >= recent[i - 1].net_savings
      )
      const declining = recent.every((s, i) =>
        i === 0 || s.net_savings <= recent[i - 1].net_savings
      )

      if (improving && recent[recent.length - 1].net_savings > 0) {
        results.push({
          id: 'savings-trend-up',
          type: 'success',
          message: t('insights.savingsTrendUp'),
        })
      } else if (declining && recent[recent.length - 1].net_savings < 0) {
        results.push({
          id: 'savings-trend-down',
          type: 'warning',
          message: t('insights.savingsTrendDown'),
        })
      }
    }

    // Paycheck estimation insight
    if (estimatedPaycheck && totalIncome === 0) {
      results.push({
        id: 'paycheck-estimate',
        type: 'info',
        message: t('insights.paycheckEstimate', {
          amount: new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(estimatedPaycheck),
        }),
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

    // Category spike detection — any single category > 40% of total expenses
    if (totalExpenses > 0) {
      const spikeCats = Object.values(expensesByCategory)
        .filter(({ total }) => (total / totalExpenses) > 0.4)
      
      for (const { category, total } of spikeCats) {
        const pct = Math.round((total / totalExpenses) * 100)
        results.push({
          id: `category-spike-${category.id}`,
          type: 'info',
          message: t('insights.categorySpike', { category: category.name, percent: pct }),
        })
      }
    }

    return results
  }, [totalIncome, totalExpenses, netSavings, expensesByCategory, savingsTarget, snapshots, checkBudget, estimatedPaycheck, t, categories])

  return { insights, estimatedPaycheck }
}
