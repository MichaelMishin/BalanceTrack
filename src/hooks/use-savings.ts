import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/stores/household-context'
import type { PeriodSnapshot } from '@/types/database'
import { format } from 'date-fns'

export function useSavings() {
  const { household, period, timeframe } = useHousehold()
  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([])
  const [currentSnapshot, setCurrentSnapshot] = useState<PeriodSnapshot | null>(null)
  const [cumulativeSavings, setCumulativeSavings] = useState(0)
  const [loading, setLoading] = useState(true)

  const computeSnapshotForPeriod = useCallback(async (
    periodStart: Date,
    periodEnd: Date,
  ): Promise<PeriodSnapshot | null> => {
    if (!household) return null

    const startStr = format(periodStart, 'yyyy-MM-dd')
    const endStr = format(periodEnd, 'yyyy-MM-dd')

    // Fetch transactions for this period
    const { data: txs } = await supabase
      .from('transactions')
      .select('*, categories!inner(type)')
      .eq('household_id', household.id)
      .gte('transaction_date', startStr)
      .lte('transaction_date', endStr)

    if (!txs || txs.length === 0) return null

    const totalIncome = txs
      .filter((t: { categories: { type: string } }) => t.categories.type === 'income')
      .reduce((sum: number, t: { converted_amount: number | null; amount: number }) =>
        sum + (t.converted_amount ?? t.amount), 0)

    const totalExpenses = txs
      .filter((t: { categories: { type: string } }) => t.categories.type === 'expense')
      .reduce((sum: number, t: { converted_amount: number | null; amount: number }) =>
        sum + (t.converted_amount ?? t.amount), 0)

    const netSavings = totalIncome - totalExpenses

    // Upsert the computed snapshot
    const { data: snapshot } = await supabase
      .from('period_snapshots')
      .upsert({
        household_id: household.id,
        period_start: startStr,
        period_end: endStr,
        timeframe,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_savings: netSavings,
        cumulative_savings: 0, // Updated below
        currency: household.default_currency,
      }, {
        onConflict: 'household_id,period_start,timeframe',
      })
      .select()
      .single()

    return snapshot
  }, [household, timeframe])

  const fetchSnapshots = useCallback(async () => {
    if (!household) return

    setLoading(true)

    // Compute snapshot for current period on-demand
    await computeSnapshotForPeriod(period.start, period.end)

    // Get all snapshots for this household ordered by date
    const { data } = await supabase
      .from('period_snapshots')
      .select('*')
      .eq('household_id', household.id)
      .eq('timeframe', timeframe)
      .order('period_start', { ascending: true })

    const allSnapshots = data ?? []

    // Recompute cumulative savings across all snapshots
    let cumulative = 0
    for (const s of allSnapshots) {
      cumulative += s.net_savings
    }

    setSnapshots(allSnapshots)
    setCumulativeSavings(cumulative)

    // Find the current period snapshot
    const periodStartStr = format(period.start, 'yyyy-MM-dd')
    const current = allSnapshots.find(s => s.period_start === periodStartStr)
    setCurrentSnapshot(current ?? null)

    setLoading(false)
  }, [household, period, timeframe, computeSnapshotForPeriod])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  return {
    snapshots,
    currentSnapshot,
    cumulativeSavings,
    loading,
    refresh: fetchSnapshots,
  }
}
