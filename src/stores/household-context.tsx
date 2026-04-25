import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'
import type { Household, HouseholdMember, Category, FinancialAccount, TimeFrame } from '@/types/database'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths, format,
} from 'date-fns'

interface PeriodRange {
  start: Date
  end: Date
  label: string
}

interface HouseholdContextType {
  household: Household | null
  members: HouseholdMember[]
  categories: Category[]
  accounts: FinancialAccount[]
  period: PeriodRange
  timeframe: TimeFrame
  loading: boolean
  goToPreviousPeriod: () => void
  goToNextPeriod: () => void
  goToCurrentPeriod: () => void
  setTimeframe: (tf: TimeFrame) => void
  refreshCategories: () => Promise<void>
  refreshAccounts: () => Promise<void>
  updateHouseholdCurrency: (currency: string) => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined)

function computePeriod(anchor: Date, timeframe: TimeFrame): PeriodRange {
  switch (timeframe) {
    case 'weekly': {
      const start = startOfWeek(anchor, { weekStartsOn: 0 })
      const end = endOfWeek(anchor, { weekStartsOn: 0 })
      return { start, end, label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}` }
    }
    case 'biweekly': {
      const weekStart = startOfWeek(anchor, { weekStartsOn: 0 })
      const start = weekStart
      const end = endOfWeek(addWeeks(weekStart, 1), { weekStartsOn: 0 })
      return { start, end, label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}` }
    }
    case 'monthly': {
      const start = startOfMonth(anchor)
      const end = endOfMonth(anchor)
      return { start, end, label: format(anchor, 'MMMM yyyy') }
    }
  }
}

function shiftPeriod(current: PeriodRange, direction: 'prev' | 'next', timeframe: TimeFrame): PeriodRange {
  const shift = direction === 'next' ? 1 : -1
  switch (timeframe) {
    case 'weekly': {
      const newAnchor = direction === 'next'
        ? addWeeks(current.start, 1)
        : subWeeks(current.start, 1)
      return computePeriod(newAnchor, timeframe)
    }
    case 'biweekly': {
      const newAnchor = direction === 'next'
        ? addWeeks(current.start, 2)
        : subWeeks(current.start, 2)
      return computePeriod(newAnchor, timeframe)
    }
    case 'monthly': {
      const newAnchor = shift > 0
        ? addMonths(current.start, 1)
        : subMonths(current.start, 1)
      return computePeriod(newAnchor, timeframe)
    }
  }
}



export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [loading, setLoading] = useState(true)

  const tfFromProfile = profile?.preferred_timeframe ?? 'monthly'
  const [timeframe, setTimeframeState] = useState<TimeFrame>(tfFromProfile)
  const [period, setPeriod] = useState<PeriodRange>(() => computePeriod(new Date(), tfFromProfile))

  useEffect(() => {
    if (profile?.preferred_timeframe) {
      setTimeframeState(profile.preferred_timeframe)
      setPeriod(computePeriod(new Date(), profile.preferred_timeframe))
    }
  }, [profile?.preferred_timeframe])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    loadHouseholdData()
  }, [user])

  async function loadHouseholdData() {
    if (!user) return

    // Get user's household membership
    const { data: memberData } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('profile_id', user.id)
      .limit(1)
      .single()

    if (!memberData) {
      setLoading(false)
      return
    }

    const { data: householdData } = await supabase
      .from('households')
      .select('*')
      .eq('id', memberData.household_id)
      .single()

    setHousehold(householdData)

    // Load members, categories, accounts in parallel
    const [membersRes, categoriesRes, accountsRes] = await Promise.all([
      supabase
        .from('household_members')
        .select('*')
        .eq('household_id', memberData.household_id),
      supabase
        .from('categories')
        .select('*')
        .eq('household_id', memberData.household_id)
        .eq('is_hidden', false)
        .order('sort_order'),
      supabase
        .from('financial_accounts')
        .select('*')
        .eq('household_id', memberData.household_id),
    ])

    setMembers(membersRes.data ?? [])
    setCategories(categoriesRes.data ?? [])
    setAccounts(accountsRes.data ?? [])
    setLoading(false)
  }

  const refreshCategories = useCallback(async () => {
    if (!household) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .eq('is_hidden', false)
      .order('sort_order')
    setCategories(data ?? [])
  }, [household])

  const refreshAccounts = useCallback(async () => {
    if (!household) return
    const { data } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('household_id', household.id)
    setAccounts(data ?? [])
  }, [household])

  const goToPreviousPeriod = useCallback(() => {
    setPeriod(prev => shiftPeriod(prev, 'prev', timeframe))
  }, [timeframe])

  const goToNextPeriod = useCallback(() => {
    setPeriod(prev => shiftPeriod(prev, 'next', timeframe))
  }, [timeframe])

  const goToCurrentPeriod = useCallback(() => {
    setPeriod(computePeriod(new Date(), timeframe))
  }, [timeframe])

  const setTimeframe = useCallback((tf: TimeFrame) => {
    setTimeframeState(tf)
    setPeriod(computePeriod(new Date(), tf))
  }, [])

  const updateHouseholdCurrency = useCallback(async (currency: string) => {
    if (!household) return
    const { error } = await supabase
      .from('households')
      .update({ default_currency: currency })
      .eq('id', household.id)
    if (error) {
      console.error('Failed to update household currency:', error)
      throw error
    }
    setHousehold(prev => prev ? { ...prev, default_currency: currency } : null)
  }, [household])

  return (
    <HouseholdContext.Provider
      value={{
        household,
        members,
        categories,
        accounts,
        period,
        timeframe,
        loading,
        goToPreviousPeriod,
        goToNextPeriod,
        goToCurrentPeriod,
        setTimeframe,
        refreshCategories,
        refreshAccounts,
        updateHouseholdCurrency,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const context = useContext(HouseholdContext)
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider')
  }
  return context
}
