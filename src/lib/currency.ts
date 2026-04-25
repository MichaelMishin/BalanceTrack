import { supabase } from './supabase'

const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest'

export async function getExchangeRate(
  baseCurrency: string,
  targetCurrency: string,
  date: string
): Promise<number> {
  if (baseCurrency === targetCurrency) return 1

  // Check cache first
  const { data: cached } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('base_currency', baseCurrency)
    .eq('target_currency', targetCurrency)
    .eq('rate_date', date)
    .single()

  if (cached) return cached.rate

  // Fetch from API
  try {
    const response = await fetch(`${EXCHANGE_RATE_API}/${baseCurrency}`)
    if (!response.ok) throw new Error('API request failed')

    const data = await response.json()
    const rate = data.rates?.[targetCurrency]

    if (!rate) throw new Error(`Rate not found for ${targetCurrency}`)

    // Cache the rate
    await supabase.from('exchange_rates').upsert({
      base_currency: baseCurrency,
      target_currency: targetCurrency,
      rate,
      rate_date: date,
    }, {
      onConflict: 'base_currency,target_currency,rate_date',
    })

    return rate
  } catch {
    // Fallback: get latest cached rate
    const { data: fallback } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('base_currency', baseCurrency)
      .eq('target_currency', targetCurrency)
      .order('rate_date', { ascending: false })
      .limit(1)
      .single()

    if (fallback) return fallback.rate
    throw new Error(`No exchange rate available for ${baseCurrency}→${targetCurrency}`)
  }
}

export function convertAmount(
  amount: number,
  exchangeRate: number
): number {
  return Math.round(amount * exchangeRate * 100) / 100
}

export const COMMON_CURRENCIES = [
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
] as const
