import { describe, it, expect } from 'vitest'
import { convertAmount, COMMON_CURRENCIES } from '@/lib/currency'

describe('convertAmount', () => {
  it('converts with rate 1 (same currency)', () => {
    expect(convertAmount(100, 1)).toBe(100)
  })

  it('converts with a real rate', () => {
    expect(convertAmount(100, 3.7)).toBe(370)
  })

  it('rounds to 2 decimal places', () => {
    expect(convertAmount(33.33, 3.14159)).toBe(104.71)
  })

  it('handles zero amount', () => {
    expect(convertAmount(0, 3.7)).toBe(0)
  })

  it('handles very small amounts', () => {
    expect(convertAmount(0.01, 3.7)).toBe(0.04)
  })
})

describe('COMMON_CURRENCIES', () => {
  it('includes ILS, USD, EUR', () => {
    const codes = COMMON_CURRENCIES.map(c => c.code)
    expect(codes).toContain('ILS')
    expect(codes).toContain('USD')
    expect(codes).toContain('EUR')
  })

  it('each currency has code, symbol, and name', () => {
    for (const curr of COMMON_CURRENCIES) {
      expect(curr.code).toBeTruthy()
      expect(curr.symbol).toBeTruthy()
      expect(curr.name).toBeTruthy()
    }
  })

  it('has at least 5 currencies', () => {
    expect(COMMON_CURRENCIES.length).toBeGreaterThanOrEqual(5)
  })
})
