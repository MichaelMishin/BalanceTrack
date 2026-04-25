import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/stores/household-context'
import type { PeriodSnapshot } from '@/types/database'

export function useSavings() {
  const { household, period, timeframe } = useHousehold()
  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([])
  const [currentSnapshot, setCurrentSnapshot] = useState<PeriodSnapshot | null>(null)
  const [cumulativeSavings, setCumulativeSavings] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchSnapshots = useCallback(async () => {
    if (!household) return

    setLoading(true)

    // Get all snapshots for this household ordered by date
    const { data } = await supabase
      .from('period_snapshots')
      .select('*')
      .eq('household_id', household.id)
      .eq('timeframe', timeframe)
      .order('period_start', { ascending: true })

    const allSnapshots = data ?? []
    setSnapshots(allSnapshots)

    // Find the current period snapshot
    const current = allSnapshots.find(
      s => s.period_start === period.start.toISOString().split('T')[0]
    )
    setCurrentSnapshot(current ?? null)

    // Calculate cumulative savings
    const cumulative = allSnapshots.reduce((sum, s) => sum + s.net_savings, 0)
    setCumulativeSavings(cumulative)

    setLoading(false)
  }, [household, period, timeframe])

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
