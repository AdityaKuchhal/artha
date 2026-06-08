/**
 * API client for Artha backend.
 * All requests include the Supabase JWT for authentication.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getToken(): Promise<string | null> {
  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'Request failed')
  }

  return res.json()
}

// ── Jobs ──────────────────────────────────────────────────────
export const api = {
  jobs: {
    list: () => request<Job[]>('/jobs'),
    create: (data: { name: string; hourly_rate: number; color?: string }) =>
      request<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/jobs/${id}`, { method: 'DELETE' }),
  },

  shifts: {
    list: (params?: { start_date?: string; end_date?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
      return request<Shift[]>(`/shifts${qs}`)
    },
    create: (data: ShiftCreate) =>
      request<Shift>('/shifts', { method: 'POST', body: JSON.stringify(data) }),
    earnings: (period: 'daily' | 'weekly' | 'biweekly' | 'monthly') =>
      request<EarningsSummary>(`/shifts/earnings/summary?period=${period}`),
  },

  transactions: {
    list: () => request<Transaction[]>('/transactions'),
    summary: (period: 'weekly' | 'monthly') =>
      request<SpendingSummary>(`/transactions/summary?period=${period}`),
    subscriptions: () => request<Transaction[]>('/transactions/subscriptions'),
  },

  budgets: {
    list: () => request<Budget[]>('/budgets'),
    create: (data: { category: string; monthly_limit: number }) =>
      request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/budgets/${id}`, { method: 'DELETE' }),
  },

  plaid: {
    linkToken: () => request<{ link_token: string }>('/plaid/link-token', { method: 'POST' }),
    exchange: (public_token: string, institution_name: string) =>
      request('/plaid/exchange', {
        method: 'POST',
        body: JSON.stringify({ public_token, institution_name }),
      }),
    sync: (days = 30) =>
      request<{ job_id: string; status: string; message: string }>(`/plaid/sync?days=${days}`, { method: 'POST' }),
  },

  reports: {
    run: (days = 30) =>
      request<{ job_id: string; status: string; message: string }>(`/reports/run?days=${days}`, { method: 'POST' }),
    status: (jobId: string) =>
      request<JobStatus>(`/reports/status?job_id=${jobId}`),
    latest: () => request<Report>('/reports/latest'),
  },
}

// ── Types ─────────────────────────────────────────────────────
export interface Job {
  id: string
  name: string
  hourly_rate: number
  color: string
  is_active: boolean
  created_at: string
}

export interface ShiftCreate {
  job_id: string
  date: string
  start_time: string
  end_time: string
  notes?: string
}

export interface Shift {
  id: string
  job_id: string
  date: string
  start_time: string
  end_time: string
  hours_worked: number
  earnings: number
  source: string
  notes?: string
}

export interface EarningsSummary {
  period: string
  total_hours: number
  total_earnings: number
  by_job: JobEarnings[]
  shift_count: number
}

export interface JobEarnings {
  job_id: string
  job_name: string
  color: string
  hours: number
  earnings: number
  shifts: number
}

export interface Transaction {
  id: string
  merchant_name: string
  amount: number
  date: string
  category: string
  ai_category: string
  is_subscription: boolean
  is_recurring: boolean
}

export interface SpendingSummary {
  period: string
  start_date: string
  end_date: string
  by_category: { category: string; total: number }[]
  total_spent: number
}

export interface Budget {
  id: string
  category: string
  monthly_limit: number
}

export interface JobStatus {
  job_id: string
  status: 'pending' | 'running' | 'complete' | 'error'
  created_at: string
  updated_at: string
  error?: string
  // present when status === 'complete'
  transactions_processed?: number
  total_spent?: number
  daily_burn_rate?: number
  top_categories?: [string, number][]
  anomalies?: Anomaly[]
  budget_alerts?: BudgetAlert[]
  report?: string
  errors?: string[]
}

export interface Report {
  transactions_processed?: number
  total_spent: number
  daily_burn_rate: number
  top_categories: [string, number][]
  anomalies: Anomaly[]
  budget_alerts: BudgetAlert[]
  report: string
}

export interface Anomaly {
  merchant: string
  amount: number
  date: string
  category: string
  z_score: number
  reason: string
}

export interface BudgetAlert {
  category: string
  spent: number
  limit: number
  percent_used: number
  severity: 'warning' | 'critical'
  message: string
}
