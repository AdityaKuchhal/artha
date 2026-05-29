import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  })
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    FOOD_AND_DRINK: '#f97316',
    TRANSPORTATION: '#3b82f6',
    RENT_AND_UTILITIES: '#8b5cf6',
    LOAN_PAYMENTS: '#ef4444',
    TRANSFER_OUT: '#6b7280',
    TRANSFER_IN: '#10b981',
    GENERAL_MERCHANDISE: '#f59e0b',
    PERSONAL_CARE: '#ec4899',
    TRAVEL: '#06b6d4',
    ENTERTAINMENT: '#a855f7',
  }
  return colors[category] || '#6b7280'
}
