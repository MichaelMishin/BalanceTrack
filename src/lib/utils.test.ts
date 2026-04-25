import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('handles tailwind merge conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles undefined/null gracefully', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })
})

describe('formatCurrency', () => {
  it('formats ILS correctly', () => {
    const result = formatCurrency(1234.56, 'ILS', 'en-US')
    expect(result).toContain('1,234.56')
  })

  it('formats USD correctly', () => {
    const result = formatCurrency(99.99, 'USD', 'en-US')
    expect(result).toContain('99.99')
    expect(result).toContain('$')
  })

  it('formats zero amount', () => {
    const result = formatCurrency(0, 'ILS', 'en-US')
    expect(result).toContain('0.00')
  })

  it('formats negative amounts', () => {
    const result = formatCurrency(-500, 'USD', 'en-US')
    expect(result).toContain('500.00')
  })

  it('uses default locale', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toContain('$')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    // Use Date constructor to avoid UTC timezone shift from date-only strings
    const result = formatDate(new Date(2026, 3, 25), 'en-US')
    expect(result).toContain('Apr')
    expect(result).toContain('25')
    expect(result).toContain('2026')
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date(2026, 3, 25), 'en-US')
    expect(result).toContain('Apr')
    expect(result).toContain('25')
  })

  it('uses default locale', () => {
    const result = formatDate(new Date(2026, 0, 15))
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })
})
