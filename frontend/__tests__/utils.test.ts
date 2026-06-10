/**
 * utils.test.ts — Unit tests for utility functions.
 *
 * These are pure functions with no side effects.
 * Most critical: formatDate timezone regression.
 */

import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency, getCategoryColor } from '@/lib/utils'

describe('formatDate', () => {

  it('formats a standard date correctly', () => {
    expect(formatDate('2026-06-09')).toBe('Jun 9')
  })

  it('formats the first of a month correctly', () => {
    expect(formatDate('2026-06-01')).toBe('Jun 1')
  })

  it('does not roll back June 1 to May 31 — timezone regression', () => {
    // This was the bug: new Date('2026-06-01') parsed as UTC midnight
    // and converted to Eastern time (UTC-4) → May 31
    const result = formatDate('2026-06-01')
    expect(result).not.toBe('May 31')
    expect(result).toBe('Jun 1')
  })

  it('does not roll back June 9 to June 8', () => {
    const result = formatDate('2026-06-09')
    expect(result).not.toBe('Jun 8')
  })

  it('handles December correctly', () => {
    expect(formatDate('2026-12-31')).toBe('Dec 31')
  })

  it('handles January correctly', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1')
  })

  it('handles February 28', () => {
    expect(formatDate('2026-02-28')).toBe('Feb 28')
  })

  it('handles all 12 months without timezone shift', () => {
    const cases = [
      ['2026-01-01', 'Jan 1'],
      ['2026-02-01', 'Feb 1'],
      ['2026-03-01', 'Mar 1'],
      ['2026-04-01', 'Apr 1'],
      ['2026-05-01', 'May 1'],
      ['2026-06-01', 'Jun 1'],
      ['2026-07-01', 'Jul 1'],
      ['2026-08-01', 'Aug 1'],
      ['2026-09-01', 'Sep 1'],
      ['2026-10-01', 'Oct 1'],
      ['2026-11-01', 'Nov 1'],
      ['2026-12-01', 'Dec 1'],
    ]
    cases.forEach(([input, expected]) => {
      expect(formatDate(input)).toBe(expected)
    })
  })
})

describe('formatCurrency', () => {

  it('formats positive amounts in CAD', () => {
    expect(formatCurrency(103.20)).toBe('$103.20')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats large amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats cents correctly', () => {
    expect(formatCurrency(0.99)).toBe('$0.99')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(17.2)).toBe('$17.20')
  })

  it('formats negative amounts', () => {
    const result = formatCurrency(-50.00)
    expect(result).toContain('50.00')
  })

  it('formats minimum wage earnings for a 6h shift', () => {
    // 6h @ $17.20 = $103.20
    expect(formatCurrency(103.20)).toBe('$103.20')
  })

  it('formats earnings with unpaid break deduction', () => {
    // 5.5h @ $17.20 = $94.60
    expect(formatCurrency(94.60)).toBe('$94.60')
  })
})

describe('getCategoryColor', () => {

  it('returns orange for FOOD_AND_DRINK', () => {
    expect(getCategoryColor('FOOD_AND_DRINK')).toBe('#f97316')
  })

  it('returns blue for TRANSPORTATION', () => {
    expect(getCategoryColor('TRANSPORTATION')).toBe('#3b82f6')
  })

  it('returns purple for RENT_AND_UTILITIES', () => {
    expect(getCategoryColor('RENT_AND_UTILITIES')).toBe('#8b5cf6')
  })

  it('returns red for LOAN_PAYMENTS', () => {
    expect(getCategoryColor('LOAN_PAYMENTS')).toBe('#ef4444')
  })

  it('returns green for TRANSFER_IN', () => {
    expect(getCategoryColor('TRANSFER_IN')).toBe('#10b981')
  })

  it('returns fallback gray for unknown category', () => {
    expect(getCategoryColor('UNKNOWN_CATEGORY')).toBe('#6b7280')
  })

  it('returns fallback for empty string', () => {
    expect(getCategoryColor('')).toBe('#6b7280')
  })

  it('is case sensitive — lowercase returns fallback', () => {
    expect(getCategoryColor('food_and_drink')).toBe('#6b7280')
  })

  it('covers all defined categories with valid hex colors', () => {
    const defined = [
      'FOOD_AND_DRINK',
      'TRANSPORTATION',
      'RENT_AND_UTILITIES',
      'LOAN_PAYMENTS',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'GENERAL_MERCHANDISE',
      'PERSONAL_CARE',
      'TRAVEL',
      'ENTERTAINMENT',
    ]
    defined.forEach(cat => {
      const color = getCategoryColor(cat)
      // Every known category must return a valid 6-digit hex color
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    })
  })
})
